import { NextResponse } from "next/server";
import { errorResponse, requireUserId } from "@/lib/requireUser";
import { getQuizState } from "@/lib/services/quizService";

export async function GET(_request: Request, context: { params: Promise<{ attemptId: string }> }) {
  try {
    const userId = await requireUserId();
    const { attemptId } = await context.params;
    const state = await getQuizState(userId, attemptId);
    return NextResponse.json(state);
  } catch (error) {
    return errorResponse(error);
  }
}
