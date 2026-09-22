import { NextResponse } from "next/server";
import { errorResponse, requireUserId } from "@/lib/requireUser";
import { getActiveDates, getResolvedProfile } from "@/lib/services/profileService";
import { levelFromTotalXp } from "@/lib/gamification/xp";
import { buildStreakCalendar } from "@/lib/gamification/streak";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const userId = await requireUserId();
    const [profile, user, activeDates] = await Promise.all([
      getResolvedProfile(userId),
      db.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } }),
      getActiveDates(userId, 84),
    ]);

    const levelState = levelFromTotalXp(profile.totalXp);
    const calendar = buildStreakCalendar(activeDates, 84);

    return NextResponse.json({
      name: user.name,
      level: levelState.level,
      xpIntoLevel: levelState.xpIntoLevel,
      xpForNextLevel: levelState.xpForNextLevel,
      totalXp: profile.totalXp,
      hearts: profile.hearts,
      heartsMax: profile.heartsMax,
      nextRegenAt: profile.nextRegenAt,
      currentStreak: profile.currentStreak,
      bestStreak: profile.bestStreak,
      calendar,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
