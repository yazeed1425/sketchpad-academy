import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, requireUserId } from "@/lib/requireUser";
import { askPlanTutorQuestion } from "@/lib/services/tutorService";

const schema = z.object({
  question: z.string().min(1),
  history: z.array(z.object({ role: z.enum(["user", "tutor"]), text: z.string() })).default([]),
});

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const body = schema.parse(await request.json());
    const answer = await askPlanTutorQuestion(userId, body.history, body.question);
    return NextResponse.json({ answer });
  } catch (error) {
    return errorResponse(error);
  }
}
