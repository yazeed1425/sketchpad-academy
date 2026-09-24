import { NextResponse } from "next/server";
import { errorResponse, requireUserId } from "@/lib/requireUser";
import { startQuestionBankPractice } from "@/lib/services/quizService";

export async function POST(_request: Request, context: { params: Promise<{ lessonId: string }> }) {
  try {
    const userId = await requireUserId();
    const { lessonId } = await context.params;
    const result = await startQuestionBankPractice(userId, lessonId);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
