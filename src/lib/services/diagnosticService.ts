import { db } from "@/lib/db";
import { SUBSKILL_ORDER, TIME_LIMIT_SEC, TOTAL_QUESTIONS, planStep } from "@/lib/gamification/diagnostic";
import { evaluateDiagnosticAttempt, generateDiagnosticQuestion, type DiagnosticTranscriptEntry } from "@/lib/llm/gemini";
import { generateAndAssignPersonalizedPath } from "@/lib/services/roadmapService";
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

/** Generates a fresh question via Gemini for this step and persists it so it can be graded/referenced later. */
async function generateAndStoreQuestion(
  domain: $Enums.DiagnosticDomain,
  subSkill: $Enums.DiagnosticSubSkill,
  difficulty: $Enums.DiagnosticDifficulty,
  avoidPrompts: string[]
) {
  const generated = await generateDiagnosticQuestion({ domain, subSkill, difficulty, avoidPrompts });
  return db.diagnosticQuestion.create({
    data: {
      domain,
      subSkill,
      difficulty,
      prompt: generated.prompt,
      optionsJson: JSON.stringify(generated.options),
      correctAnswer: generated.correctAnswer,
      explanation: generated.explanation,
    },
  });
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
    include: { responses: { orderBy: { order: "asc" }, include: { question: true } } },
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
  const avoidPrompts = attempt.responses.filter((r) => r.subSkill === step.subSkill).map((r) => r.question.prompt);
  const question = await generateAndStoreQuestion(step.domain, step.subSkill, step.difficulty, avoidPrompts);

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
  rationale: string;
}

export interface DiagnosticReport {
  attemptId: string;
  completedAt: string;
  overallAccuracyPct: number;
  quantitativeAccuracyPct: number;
  verbalAccuracyPct: number;
  overallSummary: string;
  bonusXp: number;
  roadmapPathId: string;
  roadmapTitle: string;
  subSkills: DiagnosticSubSkillResult[];
}

/** Finalizes an attempt: has Gemini judge mastery per sub-skill, syncs the real skill tree, and persists the report. */
export async function completeDiagnostic(userId: string, attemptId: string): Promise<DiagnosticReport> {
  const attempt = await db.diagnosticAttempt.findUniqueOrThrow({
    where: { id: attemptId },
    include: { responses: { orderBy: { order: "asc" }, include: { question: true } } },
  });
  if (attempt.userId !== userId) throw new Error("Forbidden");
  if (attempt.completedAt) return JSON.parse(attempt.reportJson!) as DiagnosticReport;
  if (attempt.responses.length < TOTAL_QUESTIONS) throw new Error("Diagnostic not finished yet");

  const transcript: DiagnosticTranscriptEntry[] = attempt.responses.map((r) => ({
    subSkill: r.subSkill,
    domain: r.question.domain,
    difficulty: r.difficulty,
    prompt: r.question.prompt,
    userAnswer: r.userAnswer,
    correctAnswer: r.question.correctAnswer,
    isCorrect: r.isCorrect,
  }));
  const evaluation = await evaluateDiagnosticAttempt(transcript);

  const evaluationBySubSkill = new Map(evaluation.subSkills.map((s) => [s.subSkill, s]));
  for (const { subSkill } of SUBSKILL_ORDER) {
    if (!evaluationBySubSkill.has(subSkill)) throw new Error(`Gemini's evaluation is missing sub-skill ${subSkill}`);
  }

  const correctBySubSkill = new Map<$Enums.DiagnosticSubSkill, { correct: number; total: number }>();
  for (const { subSkill } of SUBSKILL_ORDER) correctBySubSkill.set(subSkill, { correct: 0, total: 0 });
  for (const r of attempt.responses) {
    const tally = correctBySubSkill.get(r.subSkill)!;
    tally.total += 1;
    if (r.isCorrect) tally.correct += 1;
  }

  const subSkillResults: DiagnosticSubSkillResult[] = SUBSKILL_ORDER.map(({ domain, subSkill }) => {
    const { mastery, rationale } = evaluationBySubSkill.get(subSkill)!;
    const { correct, total } = correctBySubSkill.get(subSkill)!;
    return {
      domain,
      subSkill,
      correct,
      total,
      accuracyPct: total > 0 ? Math.round((correct / total) * 100) : 0,
      mastery,
      rationale,
    };
  });

  // Gemini designs a personalized skill tree from these results — this becomes the
  // student's dashboard roadmap, replacing whatever personalized path they had before.
  const roadmap = await generateAndAssignPersonalizedPath(userId, {
    subSkills: subSkillResults.map(({ subSkill, mastery, rationale }) => ({ subSkill, mastery, rationale })),
    overallSummary: evaluation.overallSummary,
  });

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
    overallSummary: evaluation.overallSummary,
    bonusXp: roadmap.bonusXp,
    roadmapPathId: roadmap.pathId,
    roadmapTitle: roadmap.title,
    subSkills: subSkillResults,
  };

  await db.diagnosticAttempt.update({
    where: { id: attemptId },
    data: { completedAt: new Date(), reportJson: JSON.stringify(report) },
  });

  return report;
}
