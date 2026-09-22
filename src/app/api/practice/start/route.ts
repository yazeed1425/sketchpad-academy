import { NextResponse } from "next/server";
import { errorResponse, requireUserId } from "@/lib/requireUser";
import { startPractice } from "@/lib/services/quizService";

export async function POST() {
  try {
    const userId = await requireUserId();
    const result = await startPractice(userId);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
