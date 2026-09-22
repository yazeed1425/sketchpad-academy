import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { errorResponse, requireUserId } from "@/lib/requireUser";
import { initializeSkillProgressForEnrollment } from "@/lib/services/skillService";

export async function POST(_request: Request, context: { params: Promise<{ pathId: string }> }) {
  try {
    const userId = await requireUserId();
    const { pathId } = await context.params;

    await db.pathEnrollment.upsert({
      where: { userId_pathId: { userId, pathId } },
      create: { userId, pathId },
      update: {},
    });
    await initializeSkillProgressForEnrollment(userId, pathId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
