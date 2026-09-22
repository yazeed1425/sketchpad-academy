import { NextResponse } from "next/server";
import { errorResponse, requireUserId } from "@/lib/requireUser";
import { completeDiagnostic } from "@/lib/services/diagnosticService";

export async function POST(_request: Request, context: { params: Promise<{ attemptId: string }> }) {
  try {
    const userId = await requireUserId();
    const { attemptId } = await context.params;
    const report = await completeDiagnostic(userId, attemptId);
    return NextResponse.json({ report });
  } catch (error) {
    return errorResponse(error);
  }
}
