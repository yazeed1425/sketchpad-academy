import { NextResponse } from "next/server";
import { errorResponse, requireUserId } from "@/lib/requireUser";
import { ensureDailyQuests } from "@/lib/services/questService";

export async function GET() {
  try {
    const userId = await requireUserId();
    const quests = await ensureDailyQuests(userId);
    return NextResponse.json({
      quests: quests.map((q) => ({
        id: q.id,
        description: q.template.description.replace("{target}", String(q.target)),
        type: q.template.type,
        target: q.target,
        progress: q.progress,
        completed: q.completed,
        xpReward: q.xpReward,
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
