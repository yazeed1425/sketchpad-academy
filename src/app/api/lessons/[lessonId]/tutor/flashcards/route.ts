import { NextResponse } from "next/server";
import { errorResponse, requireUserId } from "@/lib/requireUser";
import { getOrGenerateFlashcards } from "@/lib/services/tutorService";

export async function GET(_request: Request, context: { params: Promise<{ lessonId: string }> }) {
  try {
    const userId = await requireUserId();
    const { lessonId } = await context.params;
    const cards = await getOrGenerateFlashcards(userId, lessonId);
    return NextResponse.json({ cards });
  } catch (error) {
    return errorResponse(error);
  }
}
