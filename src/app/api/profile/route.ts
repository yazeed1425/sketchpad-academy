import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, requireUserId } from "@/lib/requireUser";
import { getActiveDates, getResolvedProfile, setLeaderboardAnonymous } from "@/lib/services/profileService";
import { levelFromTotalXp } from "@/lib/gamification/xp";
import { buildStreakCalendar } from "@/lib/gamification/streak";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const userId = await requireUserId();
    const [profile, user, activeDates, weakTopicsMastered] = await Promise.all([
      getResolvedProfile(userId),
      db.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } }),
      getActiveDates(userId, 84),
      db.userSkillProgress.count({ where: { userId, status: "COMPLETED", skill: { diagnosedMastery: { in: ["GAP", "DEVELOPING"] } } } }),
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
      leaderboardAnonymous: profile.leaderboardAnonymous,
      weakTopicsMastered,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

const patchSchema = z.object({ leaderboardAnonymous: z.boolean() });

/** Currently only supports toggling the leaderboard privacy setting (see setLeaderboardAnonymous). */
export async function PATCH(request: Request) {
  try {
    const userId = await requireUserId();
    const body = patchSchema.parse(await request.json());
    const profile = await setLeaderboardAnonymous(userId, body.leaderboardAnonymous);
    return NextResponse.json({ leaderboardAnonymous: profile.leaderboardAnonymous });
  } catch (error) {
    return errorResponse(error);
  }
}
