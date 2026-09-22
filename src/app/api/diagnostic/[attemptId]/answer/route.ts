import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, requireUserId } from "@/lib/requireUser";
import { submitDiagnosticAnswer } from "@/lib/services/diagnosticService";

const schema = z.object({ questionId: z.string(), answer: z.string(), timeTakenSec: z.number() });

export async function POST(request: Request, context: { params: Promise<{ attemptId: string }> }) {
  try {
    const userId = await requireUserId();
    const { attemptId } = await context.params;
    const body = schema.parse(await request.json());
    const result = await submitDiagnosticAnswer(userId, attemptId, body.questionId, body.answer, body.timeTakenSec);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
