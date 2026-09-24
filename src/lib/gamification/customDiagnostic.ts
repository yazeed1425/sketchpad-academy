// Pure CAT rules for the custom-content diagnostic — same difficulty-ladder/early-stop logic
// as diagnostic.ts, but iterating a dynamic topic list (extracted per-document) instead of the
// fixed 6-item SUBSKILL_ORDER. See services/customDiagnosticService.ts for orchestration.
import type { $Enums } from "@/generated/prisma/client";
import { nextDifficulty, TIME_LIMIT_SEC } from "./diagnostic";

type Difficulty = $Enums.DiagnosticDifficulty;

export { TIME_LIMIT_SEC };

export const MIN_QUESTIONS_PER_TOPIC = 2;
export const MAX_QUESTIONS_PER_TOPIC = 4; // topic count itself varies 5-8, worst case 8*4=32 questions
export const MIN_CUSTOM_TOPICS = 5; // must match analyzeDocument's bounds in gemini.ts
export const MAX_CUSTOM_TOPICS = 8;

export const ALLOWED_UPLOAD_MIME_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"] as const;
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8MB raw (~10.7MB base64), well under Gemini's inline-data ceiling

export interface CustomTopicRef {
  name: string;
  excerpt: string;
}

export interface CustomDiagnosticStep {
  topic: string;
  excerpt: string;
  difficulty: Difficulty;
}

export interface CustomDiagnosticResponseSummary {
  topic: string;
  difficulty: Difficulty;
  isCorrect: boolean;
}

/** Upper bound only, mirrors MAX_TOTAL_QUESTIONS — actual length adapts per topic. */
export function maxTotalCustomQuestions(topicCount: number): number {
  return topicCount * MAX_QUESTIONS_PER_TOPIC;
}

function topicIsResolved(responses: CustomDiagnosticResponseSummary[]): boolean {
  if (responses.length < MIN_QUESTIONS_PER_TOPIC) return false;
  if (responses.length >= MAX_QUESTIONS_PER_TOPIC) return true;

  const lastTwo = responses.slice(-2);
  const allHardCorrect = lastTwo.every((r) => r.difficulty === "HARD" && r.isCorrect);
  const allEasyWrong = lastTwo.every((r) => r.difficulty === "EASY" && !r.isCorrect);
  return allHardCorrect || allEasyWrong;
}

/** Same shape as planNextStep, but iterates the document's dynamic topic list instead of the fixed SUBSKILL_ORDER. */
export function planNextCustomStep(
  topics: CustomTopicRef[],
  responses: CustomDiagnosticResponseSummary[]
): CustomDiagnosticStep | null {
  for (const t of topics) {
    const topicResponses = responses.filter((r) => r.topic === t.name);
    if (topicIsResolved(topicResponses)) continue;

    const last = topicResponses[topicResponses.length - 1];
    const difficulty: Difficulty = last ? nextDifficulty(last.difficulty, last.isCorrect) : "MEDIUM";
    return { topic: t.name, excerpt: t.excerpt, difficulty };
  }
  return null;
}
