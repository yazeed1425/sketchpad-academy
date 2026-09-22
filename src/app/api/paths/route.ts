import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { errorResponse, requireUserId } from "@/lib/requireUser";

export async function GET() {
  try {
    const userId = await requireUserId();
    const [paths, enrollments] = await Promise.all([
      db.learningPath.findMany({
        orderBy: { order: "asc" },
        include: {
          milestones: { orderBy: { order: "asc" } },
          _count: { select: { skills: true } },
        },
      }),
      db.pathEnrollment.findMany({ where: { userId }, select: { pathId: true } }),
    ]);

    const enrolledIds = new Set(enrollments.map((e) => e.pathId));

    const withProgress = await Promise.all(
      paths.map(async (path) => {
        const completed = await db.userSkillProgress.count({
          where: { userId, status: "COMPLETED", skill: { pathId: path.id } },
        });
        return {
          id: path.id,
          slug: path.slug,
          title: path.title,
          description: path.description,
          icon: path.icon,
          skillCount: path._count.skills,
          completedCount: completed,
          enrolled: enrolledIds.has(path.id),
          milestones: path.milestones.map((m) => ({ id: m.id, title: m.title, description: m.description })),
        };
      })
    );

    return NextResponse.json({ paths: withProgress });
  } catch (error) {
    return errorResponse(error);
  }
}
