import { db } from "@/lib/db";
import { generateComprehensiveRoadmap, type RoadmapEvaluationInput, type GeneratedRoadmap } from "@/lib/llm/gemini";
import { initializeSkillProgressForEnrollment, recordSkillScore } from "@/lib/services/skillService";
import type { $Enums } from "@/generated/prisma/client";

const LESSON_XP_DISCOUNT = 5;

/**
 * Persists a generated roadmap as the user's one personal learning path (milestones, skills,
 * lessons, prerequisites, enrollment) and initializes skill-tree progress. Any previous
 * personalized roadmap for this user is deleted first — one canonical AI roadmap per user,
 * refreshed every time they retake the diagnostic.
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
  // Milestone titles are mandated to start "الأسبوع N: ..." — a fallback match key in case a
  // skill's own milestoneTitle field drifts slightly from the milestones list it should match
  // (e.g. different wording after the week number), which otherwise leaves that skill with no
  // milestone at all and an unlabeled section in the trail.
  const milestoneIdByWeekNumber = new Map<string, string>();
  for (const [order, m] of roadmap.milestones.entries()) {
    const milestone = await db.milestone.create({
      data: { pathId: path.id, title: m.title, description: m.description, order },
    });
    milestoneIdByTitle.set(m.title, milestone.id);
    const weekNumber = m.title.match(/\d+/)?.[0];
    if (weekNumber) milestoneIdByWeekNumber.set(weekNumber, milestone.id);
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
        milestoneId: milestoneIdByTitle.get(s.milestoneTitle) ?? milestoneIdByWeekNumber.get(s.milestoneTitle.match(/\d+/)?.[0] ?? ""),
      },
    });
    skillIdByKey.set(s.key, skill.id);
    xpRewardByKey.set(s.key, xpReward);

    // No questions created here — generated lazily the first time this lesson is opened
    // (getOrGenerateCurriculumQuestions in quizService.ts), so creating the roadmap itself
    // doesn't have to wait on inventing every node's quiz content upfront.
    await db.lesson.create({
      data: { skillId: skill.id, title: s.lessonTitle, order: 0, xpReward: Math.max(10, xpReward - LESSON_XP_DISCOUNT) },
    });
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
 * Assigns the full comprehensive GAT curriculum, informed by the student's diagnostic results:
 * every baseline topic is present (never narrowed down to just gaps), but skills whose topic
 * falls under a sub-skill the diagnostic found already mastered are auto-completed (with bonus
 * XP) rather than re-taught.
 */
export async function generateAndAssignComprehensivePath(userId: string, evaluation: RoadmapEvaluationInput) {
  const roadmap = await generateComprehensiveRoadmap(evaluation);
  const { path, skillIdByKey, xpRewardByKey } = await createPersonalPathFromRoadmap(userId, roadmap, "COMPREHENSIVE");

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
