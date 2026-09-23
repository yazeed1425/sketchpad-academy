// Pure CAT (computerized adaptive testing) rules for the placement diagnostic —
// no DB access here, see services/diagnosticService.ts for orchestration.
import type { $Enums } from "@/generated/prisma/client";

type SubSkill = $Enums.DiagnosticSubSkill;
type Difficulty = $Enums.DiagnosticDifficulty;
type Domain = $Enums.DiagnosticDomain;

export const MIN_QUESTIONS_PER_SUBSKILL = 2;
export const MAX_QUESTIONS_PER_SUBSKILL = 5;
export const TIME_LIMIT_SEC = 60;

// Alternates Quantitative/Verbal so the test doesn't feel like two back-to-back blocks.
export const SUBSKILL_ORDER: { domain: Domain; subSkill: SubSkill }[] = [
  { domain: "QUANTITATIVE", subSkill: "ARITHMETIC" },
  { domain: "VERBAL", subSkill: "ANALOGIES" },
  { domain: "QUANTITATIVE", subSkill: "ALGEBRA" },
  { domain: "VERBAL", subSkill: "CONTEXTUAL_ERRORS" },
  { domain: "QUANTITATIVE", subSkill: "GEOMETRY" },
  { domain: "VERBAL", subSkill: "READING_COMPREHENSION" },
];

// Upper bound only (6 sub-skills x 5 questions) — actual length adapts per sub-skill, see
// planNextStep. Used for "up to N questions" framing in the intro copy, not a hard total.
export const MAX_TOTAL_QUESTIONS = SUBSKILL_ORDER.length * MAX_QUESTIONS_PER_SUBSKILL;

export interface DiagnosticStep {
  domain: Domain;
  subSkill: SubSkill;
  difficulty: Difficulty;
}

export interface DiagnosticResponseSummary {
  subSkill: SubSkill;
  difficulty: Difficulty;
  isCorrect: boolean;
}

const DIFFICULTY_LADDER: Difficulty[] = ["EASY", "MEDIUM", "HARD"];

function nextDifficulty(previousDifficulty: Difficulty, previousWasCorrect: boolean): Difficulty {
  const level = DIFFICULTY_LADDER.indexOf(previousDifficulty);
  const nextLevel = Math.min(DIFFICULTY_LADDER.length - 1, Math.max(0, level + (previousWasCorrect ? 1 : -1)));
  return DIFFICULTY_LADDER[nextLevel];
}

/**
 * A sub-skill stops early once its last two responses are both HARD+correct (pinned at the
 * difficulty ceiling and agreeing twice in a row — clear mastery) or both EASY+incorrect
 * (pinned at the floor, struggling twice in a row — clear gap). Since every sub-skill opens
 * at MEDIUM (never an extreme), the earliest this can actually fire is its 3rd question;
 * mixed/oscillating performance runs the full MAX_QUESTIONS_PER_SUBSKILL.
 */
function subSkillIsResolved(responses: DiagnosticResponseSummary[]): boolean {
  if (responses.length < MIN_QUESTIONS_PER_SUBSKILL) return false;
  if (responses.length >= MAX_QUESTIONS_PER_SUBSKILL) return true;

  const lastTwo = responses.slice(-2);
  const allHardCorrect = lastTwo.every((r) => r.difficulty === "HARD" && r.isCorrect);
  const allEasyWrong = lastTwo.every((r) => r.difficulty === "EASY" && !r.isCorrect);
  return allHardCorrect || allEasyWrong;
}

/**
 * Given every response recorded so far (in order), finds the first sub-skill that isn't
 * resolved yet and plans its next question (MEDIUM if it hasn't started, otherwise one step
 * up/down the EASY/MEDIUM/HARD ladder from its last response). Returns null once every
 * sub-skill is resolved — the attempt is complete.
 */
export function planNextStep(responses: DiagnosticResponseSummary[]): DiagnosticStep | null {
  for (const { domain, subSkill } of SUBSKILL_ORDER) {
    const subResponses = responses.filter((r) => r.subSkill === subSkill);
    if (subSkillIsResolved(subResponses)) continue;

    const last = subResponses[subResponses.length - 1];
    const difficulty: Difficulty = last ? nextDifficulty(last.difficulty, last.isCorrect) : "MEDIUM";
    return { domain, subSkill, difficulty };
  }
  return null;
}
