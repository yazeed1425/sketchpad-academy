import { NextResponse } from "next/server";
import { errorResponse, requireUserId } from "@/lib/requireUser";
import { startDiagnostic } from "@/lib/services/diagnosticService";

export async function POST() {
  try {
    const userId = await requireUserId();
    const state = await startDiagnostic(userId);
    return NextResponse.json(state);
  } catch (error) {
    return errorResponse(error);
  }
}
