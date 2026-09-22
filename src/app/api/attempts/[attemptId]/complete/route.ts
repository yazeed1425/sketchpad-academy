import { NextResponse } from "next/server";
import { errorResponse, requireUserId } from "@/lib/requireUser";
import { completeAttempt } from "@/lib/services/quizService";

export async function POST(_request: Request, context: { params: Promise<{ attemptId: string }> }) {
  try {
    const userId = await requireUserId();
    const { attemptId } = await context.params;
    const result = await completeAttempt(userId, attemptId);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
