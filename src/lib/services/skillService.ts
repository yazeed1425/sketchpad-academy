import { db } from "@/lib/db";
import { grantXp } from "@/lib/services/xpService";

export const SKILL_PASS_THRESHOLD = 80;

/** Called on enrollment: root skills (no prerequisites) start UNLOCKED, everything else LOCKED. */
export async function initializeSkillProgressForEnrollment(userId: string, pathId: string) {
  const skills = await db.skill.findMany({
    where: { pathId },
    include: { prerequisites: true },
  });

  await db.$transaction(
    skills.map((skill) =>
      db.userSkillProgress.upsert({
        where: { userId_skillId: { userId, skillId: skill.id } },
        create: { userId, skillId: skill.id, status: skill.prerequisites.length === 0 ? "UNLOCKED" : "LOCKED" },
        update: {},
      })
    ),
    { timeout: 20000 }
  );
}

async function unlockDependentSkills(userId: string, completedSkillId: string): Promise<string[]> {
  const dependents = await db.skillPrerequisite.findMany({
    where: { prerequisiteId: completedSkillId },
    select: { skillId: true },
  });

  const unlocked: string[] = [];
  for (const { skillId } of dependents) {
    const [progress, prereqs] = await Promise.all([
      db.userSkillProgress.findUnique({ where: { userId_skillId: { userId, skillId } } }),
      db.skillPrerequisite.findMany({ where: { skillId }, select: { prerequisiteId: true } }),
    ]);
    if (progress?.status !== "LOCKED") continue;

    const completedPrereqs = await db.userSkillProgress.count({
      where: { userId, status: "COMPLETED", skillId: { in: prereqs.map((p) => p.prerequisiteId) } },
    });
    if (completedPrereqs === prereqs.length) {
      await db.userSkillProgress.update({ where: { userId_skillId: { userId, skillId } }, data: { status: "UNLOCKED" } });
      unlocked.push(skillId);
    }
  }
  return unlocked;
}

export interface SkillCompletionResult {
  completedNow: boolean;
  unlockedSkillIds: string[];
}

/** Records a lesson/quiz score against a skill; completes and unlocks dependents once the pass threshold is met. */
export async function recordSkillScore(userId: string, skillId: string, scorePct: number): Promise<SkillCompletionResult> {
  const progress = await db.userSkillProgress.upsert({
    where: { userId_skillId: { userId, skillId } },
    create: { userId, skillId, status: "IN_PROGRESS", bestScore: scorePct },
    update: { bestScore: Math.max(scorePct, 0), status: "IN_PROGRESS" },
  });

  const bestScore = Math.max(progress.bestScore, scorePct);
  if (bestScore < SKILL_PASS_THRESHOLD || progress.status === "COMPLETED") {
    if (bestScore !== progress.bestScore) {
      await db.userSkillProgress.update({ where: { userId_skillId: { userId, skillId } }, data: { bestScore } });
    }
    return { completedNow: false, unlockedSkillIds: [] };
  }

  const skill = await db.skill.findUniqueOrThrow({ where: { id: skillId } });
  await db.userSkillProgress.update({
    where: { userId_skillId: { userId, skillId } },
    data: { status: "COMPLETED", bestScore, completedAt: new Date() },
  });

  await grantXp(userId, skill.xpReward, "SKILL_COMPLETE", skillId);
  const unlockedSkillIds = await unlockDependentSkills(userId, skillId);

  return { completedNow: true, unlockedSkillIds };
}
