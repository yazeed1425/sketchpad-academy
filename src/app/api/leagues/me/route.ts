import { NextResponse } from "next/server";
import { errorResponse, requireUserId } from "@/lib/requireUser";
import { getMyLeagueStanding } from "@/lib/services/leagueService";

export async function GET() {
  try {
    const userId = await requireUserId();
    const division = await getMyLeagueStanding(userId);

    return NextResponse.json({
      tier: division.league.tier,
      weekId: division.weekId,
      members: division.memberships.map((m, index) => ({
        userId: m.user.id,
        name: m.user.name,
        weeklyXp: m.weeklyXp,
        rank: index + 1,
        isMe: m.user.id === userId,
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
