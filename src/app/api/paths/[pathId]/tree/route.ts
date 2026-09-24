import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { errorResponse, requireUserId } from "@/lib/requireUser";

export async function GET(_request: Request, context: { params: Promise<{ pathId: string }> }) {
  try {
    const userId = await requireUserId();
    const { pathId } = await context.params;

    const path = await db.learningPath.findUniqueOrThrow({ where: { id: pathId }, select: { userId: true } });
    if (path.userId && path.userId !== userId) throw new Error("Forbidden");

    const skills = await db.skill.findMany({
      where: { pathId },
      orderBy: [{ tier: "asc" }, { col: "asc" }],
      include: {
        prerequisites: { select: { prerequisiteId: true } },
        milestone: { select: { id: true, title: true } },
        lessons: { select: { id: true, title: true, order: true }, orderBy: { order: "asc" } },
        progress: { where: { userId } },
      },
    });

    const nodes = skills.map((skill) => ({
      id: skill.id,
      title: skill.title,
      description: skill.description,
      icon: skill.icon,
      xpReward: skill.xpReward,
      tier: skill.tier,
      col: skill.col,
      milestone: skill.milestone,
      prerequisiteIds: skill.prerequisites.map((p) => p.prerequisiteId),
      lessons: skill.lessons,
      status: skill.progress[0]?.status ?? "LOCKED",
      bestScore: skill.progress[0]?.bestScore ?? 0,
      completedAt: skill.progress[0]?.completedAt ?? null,
    }));

    return NextResponse.json({ nodes });
  } catch (error) {
    return errorResponse(error);
  }
}
