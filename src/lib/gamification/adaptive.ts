// Shared CAT (computerized adaptive testing) primitives — originally lived only in
// diagnostic.ts for the one-time placement test, now also used by quizService.ts to drive
// real-time difficulty adjustment in lesson quizzes and question-bank practice. No DB access
// here, same as diagnostic.ts.
import type { $Enums } from "@/generated/prisma/client";

type Difficulty = $Enums.DiagnosticDifficulty;

const DIFFICULTY_LADDER: Difficulty[] = ["EASY", "MEDIUM", "HARD"];

export interface AdaptiveResponseSummary {
  difficulty: Difficulty;
  isCorrect: boolean;
}

export function nextDifficulty(previousDifficulty: Difficulty, previousWasCorrect: boolean): Difficulty {
  const level = DIFFICULTY_LADDER.indexOf(previousDifficulty);
  const nextLevel = Math.min(DIFFICULTY_LADDER.length - 1, Math.max(0, level + (previousWasCorrect ? 1 : -1)));
  return DIFFICULTY_LADDER[nextLevel];
}

/** The difficulty for the next question, given every response so far (in order). Starts at MEDIUM. */
export function planNextDifficulty(responses: AdaptiveResponseSummary[]): Difficulty {
  const last = responses[responses.length - 1];
  return last ? nextDifficulty(last.difficulty, last.isCorrect) : "MEDIUM";
}

export interface AdaptiveBounds {
  minQuestions: number;
  maxQuestions: number;
}

/**
 * True once a run of responses has "resolved": pinned at the difficulty ceiling and agreeing
 * twice in a row (clear mastery — escalate/advance), pinned at the floor and missing twice in a
 * row (clear gap), or the max question count has been reached. Below minQuestions, never
 * resolved. Mirrors the diagnostic's per-sub-skill stopping rule (see subSkillIsResolved in
 * diagnostic.ts), generalized to any single response stream.
 */
export function isResolved(responses: AdaptiveResponseSummary[], bounds: AdaptiveBounds): boolean {
  if (responses.length < bounds.minQuestions) return false;
  if (responses.length >= bounds.maxQuestions) return true;

  const lastTwo = responses.slice(-2);
  const allHardCorrect = lastTwo.length === 2 && lastTwo.every((r) => r.difficulty === "HARD" && r.isCorrect);
  const allEasyWrong = lastTwo.length === 2 && lastTwo.every((r) => r.difficulty === "EASY" && !r.isCorrect);
  return allHardCorrect || allEasyWrong;
}

/**
 * True when the last two responses were both wrong at the EASY floor — the "Low Performance"
 * branch of the adaptive gamification workflow (Fig. 2): before continuing at a lowered
 * difficulty, the student should see targeted remediation content, not just another question.
 */
export function needsRemediation(responses: AdaptiveResponseSummary[]): boolean {
  if (responses.length < 2) return false;
  const lastTwo = responses.slice(-2);
  return lastTwo.every((r) => r.difficulty === "EASY" && !r.isCorrect);
}
