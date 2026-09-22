import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { errorResponse, requireUserId } from "@/lib/requireUser";

export async function GET() {
  try {
    const userId = await requireUserId();
    const [badges, earned] = await Promise.all([
      db.badge.findMany(),
      db.userBadge.findMany({ where: { userId } }),
    ]);
    const earnedMap = new Map(earned.map((e) => [e.badgeId, e.earnedAt]));

    return NextResponse.json({
      badges: badges.map((b) => ({
        id: b.id,
        key: b.key,
        title: b.title,
        description: b.description,
        icon: b.icon,
        earned: earnedMap.has(b.id),
        earnedAt: earnedMap.get(b.id) ?? null,
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
