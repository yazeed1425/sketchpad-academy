import { NextResponse } from "next/server";
import { errorResponse, requireUserId } from "@/lib/requireUser";
import { generateAndAssignComprehensivePath } from "@/lib/services/roadmapService";

export async function POST() {
  try {
    const userId = await requireUserId();
    const result = await generateAndAssignComprehensivePath(userId);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
