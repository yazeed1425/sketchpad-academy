import { db } from "@/lib/db";
import { HEARTS_MAX, resolveHearts } from "@/lib/gamification/hearts";
import { dayKey } from "@/lib/gamification/streak";

/** Creates the default Profile row for a brand-new user. Call once at registration. */
export async function createProfileForUser(userId: string) {
  return db.profile.create({
    data: { userId, level: 1, totalXp: 0, hearts: HEARTS_MAX, heartsMax: HEARTS_MAX },
  });
}

/** Reads the profile and fast-forwards heart regeneration, persisting if it changed. */
export async function getResolvedProfile(userId: string) {
  const profile = await db.profile.findUniqueOrThrow({ where: { userId } });
  const resolved = resolveHearts(profile.hearts, profile.nextRegenAt);

  if (resolved.hearts !== profile.hearts || resolved.nextRegenAt?.getTime() !== profile.nextRegenAt?.getTime()) {
    return db.profile.update({
      where: { userId },
      data: { hearts: resolved.hearts, nextRegenAt: resolved.nextRegenAt },
    });
  }
  return profile;
}

export async function setLeaderboardAnonymous(userId: string, leaderboardAnonymous: boolean) {
  return db.profile.update({ where: { userId }, data: { leaderboardAnonymous } });
}

export async function getActiveDates(userId: string, days: number): Promise<Set<string>> {
  const since = dayKey(new Date(Date.now() - days * 24 * 60 * 60 * 1000));
  const rows = await db.activityDay.findMany({
    where: { userId, date: { gte: since } },
    select: { date: true },
  });
  return new Set(rows.map((r) => r.date));
}
