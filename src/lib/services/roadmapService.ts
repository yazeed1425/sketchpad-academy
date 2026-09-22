import { db } from "@/lib/db";
import { generatePersonalizedRoadmap, type RoadmapEvaluationInput } from "@/lib/llm/gemini";
import { initializeSkillProgressForEnrollment, recordSkillScore } from "@/lib/services/skillService";

const LESSON_XP_DISCOUNT = 5;

/**
 * Replaces the user's personalized roadmap with a fresh one Gemini designs from their latest
 * diagnostic results: a small skill tree (with real practice lessons) that starts them exactly
 * at their identified gaps. Any previous personalized roadmap for this user is deleted first —
 * one canonical AI roadmap per user, refreshed on every diagnostic retake.
 */
export async function generateAndAssignPersonalizedPath(userId: string, evaluation: RoadmapEvaluationInput) {
  const roadmap = await generatePersonalizedRoadmap(evaluation);

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
  const masteredKeys: string[] = [];
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
        icon: "lightbulb",
        tier: s.tier,
        col,
        xpReward,
        milestoneId: milestoneIdByTitle.get(s.milestoneTitle),
      },
    });
    skillIdByKey.set(s.key, skill.id);
    xpRewardByKey.set(s.key, xpReward);
    if (s.alreadyMastered) masteredKeys.push(s.key);

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

  let bonusXp = 0;
  for (const key of masteredKeys) {
    const skillId = skillIdByKey.get(key);
    if (!skillId) continue;
    const result = await recordSkillScore(userId, skillId, 100);
    if (result.completedNow) bonusXp += xpRewardByKey.get(key) ?? 0;
  }

  return { pathId: path.id, title: roadmap.title, bonusXp };
}
