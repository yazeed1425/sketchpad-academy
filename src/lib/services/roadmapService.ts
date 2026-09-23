import { db } from "@/lib/db";
import {
  generatePersonalizedRoadmap,
  generateComprehensiveRoadmap,
  type RoadmapEvaluationInput,
  type GeneratedRoadmap,
} from "@/lib/llm/gemini";
import { initializeSkillProgressForEnrollment, recordSkillScore } from "@/lib/services/skillService";
import type { $Enums } from "@/generated/prisma/client";

const LESSON_XP_DISCOUNT = 5;

/**
 * Persists a generated roadmap as the user's one personal learning path (milestones, skills,
 * lessons, questions, prerequisites, enrollment) and initializes skill-tree progress. Any
 * previous personalized roadmap for this user is deleted first — one canonical AI roadmap per
 * user, refreshed every time they (re)generate one. Shared by both the remedial (diagnostic
 * driven) and comprehensive (from-scratch) roadmap flows below.
 */
async function createPersonalPathFromRoadmap(userId: string, roadmap: GeneratedRoadmap, planType: $Enums.PlanType) {
  await db.learningPath.deleteMany({ where: { userId } });

  const path = await db.learningPath.create({
    data: {
      slug: `personal-${userId}`,
      title: roadmap.title,
      description: roadmap.description,
      icon: "compass",
      order: -1,
      userId,
      generatedByLlm: true,
      planType,
    },
  });

  const milestoneIdByTitle = new Map<string, string>();
  for (const [order, m] of roadmap.milestones.entries()) {
    const milestone = await db.milestone.create({
      data: { pathId: path.id, title: m.title, description: m.description, order },
    });
    milestoneIdByTitle.set(m.title, milestone.id);
  }

  const skillIdByKey = new Map<string, string>();
  const xpRewardByKey = new Map<string, number>();
  const tierColCounters = new Map<number, number>();

  for (const s of roadmap.skills) {
    const col = tierColCounters.get(s.tier) ?? 0;
    tierColCounters.set(s.tier, col + 1);
    const xpReward = 20 + s.tier * 5;

    const skill = await db.skill.create({
      data: {
        pathId: path.id,
        title: s.title,
        description: s.description,
        icon: s.icon,
        tier: s.tier,
        col,
        xpReward,
        milestoneId: milestoneIdByTitle.get(s.milestoneTitle),
      },
    });
    skillIdByKey.set(s.key, skill.id);
    xpRewardByKey.set(s.key, xpReward);

    const lesson = await db.lesson.create({
      data: { skillId: skill.id, title: s.lessonTitle, order: 0, xpReward: Math.max(10, xpReward - LESSON_XP_DISCOUNT) },
    });
    for (const [qOrder, q] of s.questions.entries()) {
      await db.question.create({
        data: {
          lessonId: lesson.id,
          type: "MULTIPLE_CHOICE",
          prompt: q.prompt,
          optionsJson: JSON.stringify(q.options),
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          order: qOrder,
        },
      });
    }
  }

  for (const s of roadmap.skills) {
    const skillId = skillIdByKey.get(s.key)!;
    for (const prereqKey of s.prerequisites) {
      const prerequisiteId = skillIdByKey.get(prereqKey);
      if (prerequisiteId) await db.skillPrerequisite.create({ data: { skillId, prerequisiteId } });
    }
  }

  await db.pathEnrollment.create({ data: { userId, pathId: path.id } });
  await initializeSkillProgressForEnrollment(userId, path.id);

  return { path, skillIdByKey, xpRewardByKey };
}

/**
 * Remedial plan: replaces the user's personalized roadmap with a fresh one Gemini designs from
 * their latest diagnostic results, starting them exactly at their identified gaps. Skills the
 * diagnostic already found mastered are auto-completed (with bonus XP) rather than re-taught.
 */
export async function generateAndAssignPersonalizedPath(userId: string, evaluation: RoadmapEvaluationInput) {
  const roadmap = await generatePersonalizedRoadmap(evaluation);
  const { path, skillIdByKey, xpRewardByKey } = await createPersonalPathFromRoadmap(userId, roadmap, "REMEDIAL");

  const masteredKeys = roadmap.skills.filter((s) => s.alreadyMastered).map((s) => s.key);
  let bonusXp = 0;
  for (const key of masteredKeys) {
    const skillId = skillIdByKey.get(key);
    if (!skillId) continue;
    const result = await recordSkillScore(userId, skillId, 100);
    if (result.completedNow) bonusXp += xpRewardByKey.get(key) ?? 0;
  }

  return { pathId: path.id, title: roadmap.title, bonusXp };
}

/**
 * Comprehensive plan: assigns a full "from scratch" GAT curriculum, chosen instead of taking
 * the diagnostic — nothing is pre-assessed, so every node starts unmastered/locked-by-tier.
 */
export async function generateAndAssignComprehensivePath(userId: string) {
  const roadmap = await generateComprehensiveRoadmap();
  const { path } = await createPersonalPathFromRoadmap(userId, roadmap, "COMPREHENSIVE");
  return { pathId: path.id, title: roadmap.title, bonusXp: 0 };
}
