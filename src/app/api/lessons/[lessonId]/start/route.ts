import { NextResponse } from "next/server";
import { errorResponse, requireUserId } from "@/lib/requireUser";
import { NoHeartsError, startAttempt } from "@/lib/services/quizService";

export async function POST(_request: Request, context: { params: Promise<{ lessonId: string }> }) {
  try {
    const userId = await requireUserId();
    const { lessonId } = await context.params;
    const result = await startAttempt(userId, lessonId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof NoHeartsError) {
      return NextResponse.json({ error: "No hearts remaining. Recover a heart or wait for regen." }, { status: 409 });
    }
    return errorResponse(error);
  }
}
