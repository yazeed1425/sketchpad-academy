import { NextResponse } from "next/server";
import { errorResponse, requireUserId } from "@/lib/requireUser";
import { getOrGenerateKnowledgeGraph } from "@/lib/services/tutorService";

export async function GET(_request: Request, context: { params: Promise<{ lessonId: string }> }) {
  try {
    const userId = await requireUserId();
    const { lessonId } = await context.params;
    const graph = await getOrGenerateKnowledgeGraph(userId, lessonId);
    return NextResponse.json(graph);
  } catch (error) {
    return errorResponse(error);
  }
}
