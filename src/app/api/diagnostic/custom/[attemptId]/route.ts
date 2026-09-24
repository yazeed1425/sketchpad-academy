import { NextResponse } from "next/server";
import { errorResponse, requireUserId } from "@/lib/requireUser";
import { getCustomDiagnosticState } from "@/lib/services/customDiagnosticService";

export async function GET(_request: Request, context: { params: Promise<{ attemptId: string }> }) {
  try {
    const userId = await requireUserId();
    const { attemptId } = await context.params;
    const state = await getCustomDiagnosticState(userId, attemptId);
    return NextResponse.json(state);
  } catch (error) {
    return errorResponse(error);
  }
}
