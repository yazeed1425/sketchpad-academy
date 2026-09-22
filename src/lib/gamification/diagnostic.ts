// Pure CAT (computerized adaptive testing) rules for the placement diagnostic —
// no DB access here, see services/diagnosticService.ts for orchestration.
import type { $Enums } from "@/generated/prisma/client";

type SubSkill = $Enums.DiagnosticSubSkill;
type Difficulty = $Enums.DiagnosticDifficulty;
type Domain = $Enums.DiagnosticDomain;

export const QUESTIONS_PER_SUBSKILL = 2;
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

export const TOTAL_QUESTIONS = SUBSKILL_ORDER.length * QUESTIONS_PER_SUBSKILL;

export interface DiagnosticStep {
  stepIndex: number;
  domain: Domain;
  subSkill: SubSkill;
  difficulty: Difficulty;
}

/**
 * Given how many responses have been recorded so far (in order) and the correctness of the
 * immediately preceding response, determines the domain/sub-skill/difficulty of the next question.
 * Rule: each sub-skill opens at MEDIUM; a correct answer escalates to HARD, a wrong one drops to EASY.
 */
export function planStep(stepIndex: number, previousWasCorrect: boolean | null): DiagnosticStep {
  const subSkillIndex = Math.floor(stepIndex / QUESTIONS_PER_SUBSKILL);
  const positionInSubSkill = stepIndex % QUESTIONS_PER_SUBSKILL;
  const { domain, subSkill } = SUBSKILL_ORDER[subSkillIndex];

  const difficulty: Difficulty =
    positionInSubSkill === 0 ? "MEDIUM" : previousWasCorrect ? "HARD" : "EASY";

  return { stepIndex, domain, subSkill, difficulty };
}
