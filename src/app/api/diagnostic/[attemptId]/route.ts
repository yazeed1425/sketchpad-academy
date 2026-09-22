import { NextResponse } from "next/server";
import { errorResponse, requireUserId } from "@/lib/requireUser";
import { getDiagnosticState } from "@/lib/services/diagnosticService";

export async function GET(_request: Request, context: { params: Promise<{ attemptId: string }> }) {
  try {
    const userId = await requireUserId();
    const { attemptId } = await context.params;
    const state = await getDiagnosticState(userId, attemptId);
    return NextResponse.json(state);
  } catch (error) {
    return errorResponse(error);
  }
}
