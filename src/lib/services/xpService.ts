import { db } from "@/lib/db";
import { awardXp as computeXpAward, type XpAwardResult } from "@/lib/gamification/xp";
import { recordActivity, dayKey } from "@/lib/gamification/streak";
import { weekId } from "@/lib/gamification/leagues";
import { ensureCurrentMembership } from "@/lib/services/leagueService";
import type { $Enums } from "@/generated/prisma/client";

export interface XpGrantResult extends XpAwardResult {
  streak: { currentStreak: number; bestStreak: number };
}

/** The single place XP is ever added. Updates level, streak, activity log, and league standing together. */
export async function grantXp(
  userId: string,
  amount: number,
  source: $Enums.XpSource,
  sourceId?: string
): Promise<XpGrantResult> {
  const profile = await db.profile.findUniqueOrThrow({ where: { userId } });
  const result = computeXpAward(profile.totalXp, amount);
  const today = dayKey();
  const streak = recordActivity(
    { currentStreak: profile.currentStreak, bestStreak: profile.bestStreak, lastActiveDate: profile.lastActiveDate },
    today
  );

  await db.$transaction([
    db.profile.update({
      where: { userId },
      data: {
        totalXp: result.totalXp,
        level: result.after.level,
        currentStreak: streak.currentStreak,
        bestStreak: streak.bestStreak,
        lastActiveDate: streak.lastActiveDate,
      },
    }),
    db.xpTransaction.create({
      data: { userId, amount, source, sourceId, weekId: weekId() },
    }),
    db.activityDay.upsert({
      where: { userId_date: { userId, date: today } },
      create: { userId, date: today, xpEarned: amount },
      update: { xpEarned: { increment: amount } },
    }),
  ]);

  const membership = await ensureCurrentMembership(userId);
  await db.leagueMembership.update({
    where: { id: membership.id },
    data: { weeklyXp: { increment: amount } },
  });

  return { ...result, streak: { currentStreak: streak.currentStreak, bestStreak: streak.bestStreak } };
}
