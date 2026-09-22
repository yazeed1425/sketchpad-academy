// Pure CAT (computerized adaptive testing) rules for the placement diagnostic —
// no DB access here, see services/diagnosticService.ts for orchestration.
import type { $Enums } from "@/generated/prisma/client";

type SubSkill = $Enums.DiagnosticSubSkill;
type Difficulty = $Enums.DiagnosticDifficulty;
type Domain = $Enums.DiagnosticDomain;

export const QUESTIONS_PER_SUBSKILL = 5;
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

// 6 sub-skills x 5 questions = 30 questions total, covering both GAT sections (quant + verbal).
export const TOTAL_QUESTIONS = SUBSKILL_ORDER.length * QUESTIONS_PER_SUBSKILL;

export interface DiagnosticStep {
  stepIndex: number;
  domain: Domain;
  subSkill: SubSkill;
  difficulty: Difficulty;
}

const DIFFICULTY_LADDER: Difficulty[] = ["EASY", "MEDIUM", "HARD"];

/**
 * Given how many responses have been recorded so far (in order) and the difficulty/correctness of
 * the immediately preceding response, determines the domain/sub-skill/difficulty of the next question.
 * Rule: each sub-skill opens at MEDIUM; every following question within that sub-skill steps one
 * level up the EASY/MEDIUM/HARD ladder on a correct answer, or one level down on a wrong one.
 */
export function planStep(stepIndex: number, previousDifficulty: Difficulty | null, previousWasCorrect: boolean | null): DiagnosticStep {
  const subSkillIndex = Math.floor(stepIndex / QUESTIONS_PER_SUBSKILL);
  const positionInSubSkill = stepIndex % QUESTIONS_PER_SUBSKILL;
  const { domain, subSkill } = SUBSKILL_ORDER[subSkillIndex];

  let difficulty: Difficulty;
  if (positionInSubSkill === 0 || previousDifficulty === null || previousWasCorrect === null) {
    difficulty = "MEDIUM";
  } else {
    const level = DIFFICULTY_LADDER.indexOf(previousDifficulty);
    const nextLevel = Math.min(DIFFICULTY_LADDER.length - 1, Math.max(0, level + (previousWasCorrect ? 1 : -1)));
    difficulty = DIFFICULTY_LADDER[nextLevel];
  }

  return { stepIndex, domain, subSkill, difficulty };
}
