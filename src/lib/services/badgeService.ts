import { db } from "@/lib/db";
import { meetsBadgeCriteria, type BadgeCriteriaKind } from "@/lib/gamification/badges";

async function buildStatsSnapshot(userId: string) {
  const [profile, skillsCompleted, leaguePromotions, perfectQuizzes, enrollments, weakTopicsMastered, completedSkillIds] = await Promise.all([
    db.profile.findUniqueOrThrow({ where: { userId } }),
    db.userSkillProgress.count({ where: { userId, status: "COMPLETED" } }),
    db.leagueMembership.count({ where: { userId, result: "PROMOTED" } }),
    db.quizAttempt.count({ where: { userId, scorePct: 100 } }),
    db.pathEnrollment.findMany({ where: { userId }, select: { pathId: true } }),
    db.userSkillProgress.count({ where: { userId, status: "COMPLETED", skill: { diagnosedMastery: { in: ["GAP", "DEVELOPING"] } } } }),
    db.userSkillProgress.findMany({ where: { userId, status: "COMPLETED" }, select: { skillId: true } }),
  ]);

  let pathsCompleted = 0;
  for (const { pathId } of enrollments) {
    const [total, completed] = await Promise.all([
      db.skill.count({ where: { pathId } }),
      db.userSkillProgress.count({ where: { userId, status: "COMPLETED", skill: { pathId } } }),
    ]);
    if (total > 0 && total === completed) pathsCompleted++;
  }

  // A "comeback" skill needed more than one real (non-practice) attempt on its lesson before
  // being completed — rewards persistence/improvement, not just first-try success.
  const attemptCounts = await Promise.all(
    completedSkillIds.map(({ skillId }) =>
      db.quizAttempt.count({ where: { userId, isPractice: false, completedAt: { not: null }, lesson: { skillId } } })
    )
  );
  const comebacks = attemptCounts.filter((count) => count >= 2).length;

  return {
    bestStreak: profile.bestStreak,
    skillsCompleted,
    level: profile.level,
    leaguePromotions,
    perfectQuizzes,
    pathsCompleted,
    weakTopicsMastered,
    comebacks,
  };
}

/** Awards any badge whose criteria is newly met. Returns the freshly earned badges. */
export async function checkAndAwardBadges(userId: string) {
  const [badges, earned] = await Promise.all([
    db.badge.findMany(),
    db.userBadge.findMany({ where: { userId }, select: { badgeId: true } }),
  ]);
  const earnedIds = new Set(earned.map((e) => e.badgeId));
  const candidates = badges.filter((b) => !earnedIds.has(b.id));
  if (candidates.length === 0) return [];

  const stats = await buildStatsSnapshot(userId);
  const newlyEarned = candidates.filter((b) => meetsBadgeCriteria(b.criteria as BadgeCriteriaKind, b.criteriaValue, stats));
  if (newlyEarned.length === 0) return [];

  await db.$transaction(
    newlyEarned.map((badge) => db.userBadge.create({ data: { userId, badgeId: badge.id } }))
  );

  return newlyEarned;
}
