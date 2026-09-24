import { NextResponse } from "next/server";
import { errorResponse, requireUserId } from "@/lib/requireUser";
import { completeCustomDiagnostic } from "@/lib/services/customDiagnosticService";

export const maxDuration = 60;

export async function POST(_request: Request, context: { params: Promise<{ attemptId: string }> }) {
  try {
    const userId = await requireUserId();
    const { attemptId } = await context.params;
    const report = await completeCustomDiagnostic(userId, attemptId);
    return NextResponse.json({ report });
  } catch (error) {
    return errorResponse(error);
  }
}
