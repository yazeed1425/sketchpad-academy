import { db } from "@/lib/db";
import {
  SUBSKILL_ORDER,
  SUBSKILL_SKILL_MAP,
  TIME_LIMIT_SEC,
  TOTAL_QUESTIONS,
  classifyMastery,
  planStep,
  type SubSkillTally,
} from "@/lib/gamification/diagnostic";
import { initializeSkillProgressForEnrollment, recordSkillScore } from "@/lib/services/skillService";
import type { $Enums } from "@/generated/prisma/client";

function normalize(answer: string) {
  return answer.trim().toLowerCase();
}

export interface DiagnosticQuestionView {
  id: string;
  domain: $Enums.DiagnosticDomain;
  subSkill: $Enums.DiagnosticSubSkill;
  difficulty: $Enums.DiagnosticDifficulty;
  prompt: string;
  options: string[];
  timeLimitSec: number;
}

export interface DiagnosticProgress {
  current: number; // 1-indexed question number about to be answered
  total: number;
}

async function pickQuestion(
  subSkill: $Enums.DiagnosticSubSkill,
  difficulty: $Enums.DiagnosticDifficulty,
  excludeIds: string[]
) {
  const candidates = await db.diagnosticQuestion.findMany({
    where: { subSkill, difficulty, id: { notIn: excludeIds } },
  });
  if (candidates.length === 0) {
    // Fall back to any unused question for the sub-skill if that exact difficulty is exhausted.
    const fallback = await db.diagnosticQuestion.findMany({ where: { subSkill, id: { notIn: excludeIds } } });
    if (fallback.length === 0) throw new Error(`No diagnostic questions left for ${subSkill}`);
    return fallback[Math.floor(Math.random() * fallback.length)];
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function toView(question: { id: string; domain: $Enums.DiagnosticDomain; subSkill: $Enums.DiagnosticSubSkill; difficulty: $Enums.DiagnosticDifficulty; prompt: string; optionsJson: string }): DiagnosticQuestionView {
  return {
    id: question.id,
    domain: question.domain,
    subSkill: question.subSkill,
    difficulty: question.difficulty,
    prompt: question.prompt,
    options: JSON.parse(question.optionsJson) as string[],
    timeLimitSec: TIME_LIMIT_SEC,
  };
}

/** Starts a fresh attempt (or resumes an in-progress one) and returns its next question. */
export async function startDiagnostic(userId: string) {
  const existing = await db.diagnosticAttempt.findFirst({
    where: { userId, completedAt: null },
    orderBy: { startedAt: "desc" },
  });
  const attempt = existing ?? (await db.diagnosticAttempt.create({ data: { userId } }));
  const state = await getDiagnosticState(userId, attempt.id);
  return state;
}

/** Returns the current state of an attempt: either the next question to answer, or its stored report. */
export async function getDiagnosticState(userId: string, attemptId: string) {
  const attempt = await db.diagnosticAttempt.findUniqueOrThrow({
    where: { id: attemptId },
    include: { responses: { orderBy: { order: "asc" } } },
  });
  if (attempt.userId !== userId) throw new Error("Forbidden");

  if (attempt.completedAt) {
    return { status: "completed" as const, attemptId, report: JSON.parse(attempt.reportJson!) as DiagnosticReport };
  }

  const stepIndex = attempt.responses.length;
  if (stepIndex >= TOTAL_QUESTIONS) {
    return { status: "ready-to-complete" as const, attemptId };
  }

  const previous = attempt.responses[attempt.responses.length - 1];
  const step = planStep(stepIndex, previous?.isCorrect ?? null);
  const usedIds = attempt.responses.map((r) => r.questionId);
  const question = await pickQuestion(step.subSkill, step.difficulty, usedIds);

  return {
    status: "in-progress" as const,
    attemptId,
    progress: { current: stepIndex + 1, total: TOTAL_QUESTIONS } satisfies DiagnosticProgress,
    question: toView(question),
  };
}

/** Records one answer and returns feedback plus the next state (next question or ready-to-complete). */
export async function submitDiagnosticAnswer(
  userId: string,
  attemptId: string,
  questionId: string,
  answer: string,
  timeTakenSec: number
) {
  const attempt = await db.diagnosticAttempt.findUniqueOrThrow({ where: { id: attemptId } });
  if (attempt.userId !== userId) throw new Error("Forbidden");
  if (attempt.completedAt) throw new Error("Attempt already completed");

  const question = await db.diagnosticQuestion.findUniqueOrThrow({ where: { id: questionId } });
  const isCorrect = normalize(answer) === normalize(question.correctAnswer);
  const order = await db.diagnosticResponse.count({ where: { attemptId } });

  await db.diagnosticResponse.create({
    data: {
      attemptId,
      questionId,
      order,
      subSkill: question.subSkill,
      difficulty: question.difficulty,
      userAnswer: answer,
      isCorrect,
      timeTakenSec: Math.max(0, Math.round(timeTakenSec)),
    },
  });

  const next = await getDiagnosticState(userId, attemptId);
  return {
    feedback: { isCorrect, correctAnswer: question.correctAnswer, explanation: question.explanation },
    next,
  };
}

export interface DiagnosticSubSkillResult {
  domain: $Enums.DiagnosticDomain;
  subSkill: $Enums.DiagnosticSubSkill;
  correct: number;
  total: number;
  accuracyPct: number;
  mastery: $Enums.MasteryLevel;
  xpAwarded: number;
  skillUnlockedIds: string[];
}

export interface DiagnosticReport {
  attemptId: string;
  completedAt: string;
  overallAccuracyPct: number;
  quantitativeAccuracyPct: number;
  verbalAccuracyPct: number;
  bonusXp: number;
  subSkills: DiagnosticSubSkillResult[];
}

/** Finalizes an attempt: classifies each sub-skill, syncs the real skill tree, and persists the report. */
export async function completeDiagnostic(userId: string, attemptId: string): Promise<DiagnosticReport> {
  const attempt = await db.diagnosticAttempt.findUniqueOrThrow({
    where: { id: attemptId },
    include: { responses: true },
  });
  if (attempt.userId !== userId) throw new Error("Forbidden");
  if (attempt.completedAt) return JSON.parse(attempt.reportJson!) as DiagnosticReport;
  if (attempt.responses.length < TOTAL_QUESTIONS) throw new Error("Diagnostic not finished yet");

  const tallies = new Map<$Enums.DiagnosticSubSkill, SubSkillTally>();
  for (const { domain, subSkill } of SUBSKILL_ORDER) {
    tallies.set(subSkill, { domain, subSkill, correct: 0, total: 0, reachedHard: false });
  }
  for (const response of attempt.responses) {
    const tally = tallies.get(response.subSkill)!;
    tally.total += 1;
    if (response.isCorrect) {
      tally.correct += 1;
      if (response.difficulty === "HARD") tally.reachedHard = true;
    }
  }

  // Ensure the user is enrolled in every path this diagnostic touches, so the tree's
  // normal LOCKED/UNLOCKED structure is in place before we layer placement results on top.
  const pathSlugs = [...new Set(Object.values(SUBSKILL_SKILL_MAP).map((m) => m.pathSlug))];
  const paths = await db.learningPath.findMany({ where: { slug: { in: pathSlugs } } });
  for (const path of paths) {
    await db.pathEnrollment.upsert({
      where: { userId_pathId: { userId, pathId: path.id } },
      create: { userId, pathId: path.id },
      update: {},
    });
    await initializeSkillProgressForEnrollment(userId, path.id);
  }

  const subSkillResults: DiagnosticSubSkillResult[] = [];
  let bonusXp = 0;

  for (const tally of tallies.values()) {
    const mastery = classifyMastery(tally);
    const mapping = SUBSKILL_SKILL_MAP[tally.subSkill];
    const skill = await db.skill.findFirst({ where: { title: mapping.skillTitle, path: { slug: mapping.pathSlug } } });

    let xpAwarded = 0;
    let skillUnlockedIds: string[] = [];

    if (skill) {
      if (mastery === "MASTERED") {
        const result = await recordSkillScore(userId, skill.id, 100);
        if (result.completedNow) {
          xpAwarded = skill.xpReward;
          skillUnlockedIds = result.unlockedSkillIds;
        }
      } else if (mastery === "DEVELOPING") {
        const accuracyPct = Math.round((tally.correct / tally.total) * 100);
        const existing = await db.userSkillProgress.findUnique({ where: { userId_skillId: { userId, skillId: skill.id } } });
        if (existing?.status !== "COMPLETED") {
          await db.userSkillProgress.upsert({
            where: { userId_skillId: { userId, skillId: skill.id } },
            create: { userId, skillId: skill.id, status: "IN_PROGRESS", bestScore: accuracyPct },
            update: { status: "IN_PROGRESS", bestScore: Math.max(existing?.bestScore ?? 0, accuracyPct) },
          });
        }
      }
      // GAP: leave whatever initializeSkillProgressForEnrollment set (LOCKED/UNLOCKED) —
      // that position in the tree *is* the student's starting point.
    }

    bonusXp += xpAwarded;
    subSkillResults.push({
      domain: tally.domain,
      subSkill: tally.subSkill,
      correct: tally.correct,
      total: tally.total,
      accuracyPct: Math.round((tally.correct / tally.total) * 100),
      mastery,
      xpAwarded,
      skillUnlockedIds,
    });
  }

  const totalCorrect = subSkillResults.reduce((sum, r) => sum + r.correct, 0);
  const quant = subSkillResults.filter((r) => r.domain === "QUANTITATIVE");
  const verbal = subSkillResults.filter((r) => r.domain === "VERBAL");
  const pct = (rows: DiagnosticSubSkillResult[]) =>
    Math.round((rows.reduce((s, r) => s + r.correct, 0) / rows.reduce((s, r) => s + r.total, 0)) * 100);

  const report: DiagnosticReport = {
    attemptId,
    completedAt: new Date().toISOString(),
    overallAccuracyPct: Math.round((totalCorrect / TOTAL_QUESTIONS) * 100),
    quantitativeAccuracyPct: pct(quant),
    verbalAccuracyPct: pct(verbal),
    bonusXp,
    subSkills: subSkillResults,
  };

  await db.diagnosticAttempt.update({
    where: { id: attemptId },
    data: { completedAt: new Date(), reportJson: JSON.stringify(report) },
  });

  return report;
}
