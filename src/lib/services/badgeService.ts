import { db } from "@/lib/db";
import { meetsBadgeCriteria, type BadgeCriteriaKind } from "@/lib/gamification/badges";

async function buildStatsSnapshot(userId: string) {
  const [profile, skillsCompleted, leaguePromotions, perfectQuizzes, enrollments] = await Promise.all([
    db.profile.findUniqueOrThrow({ where: { userId } }),
    db.userSkillProgress.count({ where: { userId, status: "COMPLETED" } }),
    db.leagueMembership.count({ where: { userId, result: "PROMOTED" } }),
    db.quizAttempt.count({ where: { userId, scorePct: 100 } }),
    db.pathEnrollment.findMany({ where: { userId }, select: { pathId: true } }),
  ]);

  let pathsCompleted = 0;
  for (const { pathId } of enrollments) {
    const [total, completed] = await Promise.all([
      db.skill.count({ where: { pathId } }),
      db.userSkillProgress.count({ where: { userId, status: "COMPLETED", skill: { pathId } } }),
    ]);
    if (total > 0 && total === completed) pathsCompleted++;
  }

  return {
    bestStreak: profile.bestStreak,
    skillsCompleted,
    level: profile.level,
    leaguePromotions,
    perfectQuizzes,
    pathsCompleted,
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
