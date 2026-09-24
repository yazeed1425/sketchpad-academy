import { db } from "@/lib/db";
import { SUBSKILL_ORDER, TIME_LIMIT_SEC, planNextStep, type DiagnosticStep, type DiagnosticResponseSummary } from "@/lib/gamification/diagnostic";
import {
  evaluateDiagnosticAttempt,
  generateDiagnosticQuestion,
  generateMutatedDiagnosticQuestion,
  generateEmbedding,
  SUBSKILL_LABEL_AR,
  type DiagnosticTranscriptEntry,
  type DiagnosticReference,
} from "@/lib/llm/gemini";
import { getSupabase } from "@/lib/supabase";
import { generateAndAssignComprehensivePath } from "@/lib/services/roadmapService";
import type { $Enums } from "@/generated/prisma/client";

function normalize(answer: string) {
  return answer.trim().toLowerCase();
}

// Below this cosine similarity, the closest match in the question bank is too unrelated to
// the sub-skill to be worth mutating — same floor used for lesson-content RAG (quizService.ts).
const RAG_SIMILARITY_FLOOR = 0.3;

// The Supabase question bank only holds quantitative (math) content across its 5 tables — no
// verbal analogies/contextual-errors/reading-comprehension rows exist (verified directly against
// the DB), so RAG is skipped entirely for VERBAL sub-skills in generateAndStoreQuestion below.
// ALGEBRA/GEOMETRY map 1:1 to a table; ARITHMETIC has no single matching table, so its lookup
// searches all tables unfiltered and relies on vector similarity alone to surface the closest row.
const SUBSKILL_TO_SUPABASE_SKILL: Partial<Record<$Enums.DiagnosticSubSkill, string>> = {
  ALGEBRA: "جبر",
  GEOMETRY: "هندسة",
};

// The RAG query text is always just the sub-skill's fixed Arabic label (never per-question),
// so its embedding is the same on every lookup — cache it instead of re-calling Gemini's
// embedding endpoint (a full extra network round-trip) for every single question generated.
// Only 3 quantitative sub-skills ever hit this, so the cache never grows past 3 entries.
// A failed embedding isn't cached, so quota/network errors get retried on the next question.
const subSkillEmbeddingCache = new Map<string, Promise<number[]>>();

function getSubSkillEmbedding(subSkill: $Enums.DiagnosticSubSkill): Promise<number[]> {
  const label = SUBSKILL_LABEL_AR[subSkill];
  let cached = subSkillEmbeddingCache.get(label);
  if (!cached) {
    cached = generateEmbedding(label);
    cached.catch(() => subSkillEmbeddingCache.delete(label));
    subSkillEmbeddingCache.set(label, cached);
  }
  return cached;
}

/**
 * Looks up a real reference question for this sub-skill/difficulty via vector search against
 * the Supabase GAT question bank, for generateMutatedDiagnosticQuestion to vary. Never throws —
 * RAG is a nice-to-have grounding signal, not a hard dependency; any failure (missing config,
 * quota limits, network, no match) just falls back to pure Gemini generation.
 */
async function findDiagnosticReference(
  subSkill: $Enums.DiagnosticSubSkill,
  difficulty: $Enums.DiagnosticDifficulty
): Promise<DiagnosticReference | undefined> {
  try {
    const embedding = await getSubSkillEmbedding(subSkill);
    const { data, error } = await getSupabase().rpc("match_qudurat_questions_all", {
      query_embedding: embedding,
      match_count: 5,
      filter_skill: SUBSKILL_TO_SUPABASE_SKILL[subSkill] ?? null,
    });
    if (error) throw error;

    const candidates = ((data ?? []) as { similarity: number; difficulty: string; question_text: string; options: unknown; correct_answer: string; explanation: string }[]).filter(
      (row) => row.similarity >= RAG_SIMILARITY_FLOOR
    );
    if (candidates.length === 0) return undefined;

    const targetDifficulty = difficulty.toLowerCase();
    const match = candidates.find((row) => row.difficulty === targetDifficulty) ?? candidates[0];

    return {
      question: match.question_text,
      options: Array.isArray(match.options) ? (match.options as string[]) : undefined,
      correctAnswer: match.correct_answer ?? undefined,
      explanation: match.explanation ?? undefined,
    };
  } catch (err) {
    console.error("Diagnostic RAG lookup failed, falling back to pure generation:", err);
    return undefined;
  }
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
  questionNumber: number; // 1-indexed, cumulative across the whole attempt
  subSkillNumber: number; // 1-indexed, which of the sub-skills this question belongs to
  totalSubSkills: number;
}

/** Generates a fresh question via Gemini for this step and persists it so it can be graded/referenced later. */
async function generateAndStoreQuestion(
  domain: $Enums.DiagnosticDomain,
  subSkill: $Enums.DiagnosticSubSkill,
  difficulty: $Enums.DiagnosticDifficulty,
  avoidPrompts: string[]
) {
  const reference = domain === "QUANTITATIVE" ? await findDiagnosticReference(subSkill, difficulty) : undefined;
  const generated = reference
    ? await generateMutatedDiagnosticQuestion({ domain, subSkill, difficulty, reference, avoidPrompts }).catch((err) => {
        // A mutated question occasionally fails validation (e.g. Gemini's correctAnswer drifts
        // from its own options after changing numbers) — never let that block the diagnostic,
        // fall back to an unreferenced generation like when no RAG match was found at all.
        console.error("Diagnostic question mutation failed, falling back to pure generation:", err);
        return generateDiagnosticQuestion({ domain, subSkill, difficulty, avoidPrompts });
      })
    : await generateDiagnosticQuestion({ domain, subSkill, difficulty, avoidPrompts });
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

// The actual bottleneck in generating a question is the Gemini call itself (7-11s measured,
// same with or without RAG) — not something a code tweak can shrink. The only way to hide that
// latency is to not need it at answer time at all: as soon as a question is SHOWN to the
// student, speculatively pre-generate BOTH possible next questions (assuming they answer this
// one right, and assuming they answer it wrong) in the background, while they still have up to
// TIME_LIMIT_SEC to look at it — far more headroom than the few seconds they spend reading
// feedback. By the time they actually answer, the matching branch is usually already done.
// Keyed by attempt + the resulting step's identity so a fast responder who answers before a
// branch finishes just joins the same in-flight generation instead of starting a duplicate one.
// Costs roughly 2x the Gemini/RAG calls per question transition (the unrealized branch's
// generated question is simply left unlinked in the DB, same as any other race-orphaned row).
const speculativeQuestionCache = new Map<string, ReturnType<typeof generateAndStoreQuestion>>();

function speculativeCacheKey(attemptId: string, step: DiagnosticStep) {
  return `${attemptId}:${step.subSkill}:${step.difficulty}`;
}

/** Returns the pre-generated question for this step if a speculative prefetch already covered it, otherwise generates it fresh. */
function getOrGenerateQuestion(attemptId: string, step: DiagnosticStep, avoidPrompts: string[]) {
  const key = speculativeCacheKey(attemptId, step);
  const cached = speculativeQuestionCache.get(key);
  if (cached) {
    speculativeQuestionCache.delete(key);
    return cached;
  }
  return generateAndStoreQuestion(step.domain, step.subSkill, step.difficulty, avoidPrompts);
}

/**
 * Fire-and-forget: pre-generates the next question for both hypothetical outcomes of the
 * question currently being shown. Never awaited by its caller — runs in the background on this
 * (long-lived, non-serverless) dev/server process while the student is still looking at the
 * current question.
 */
function prefetchSpeculativeCandidates(
  attemptId: string,
  currentStep: DiagnosticStep,
  priorResponsesWithPrompt: { subSkill: $Enums.DiagnosticSubSkill; question: { prompt: string } }[],
  priorResponseSummaries: DiagnosticResponseSummary[]
) {
  for (const hypotheticalCorrect of [true, false]) {
    const step = planNextStep([
      ...priorResponseSummaries,
      { subSkill: currentStep.subSkill, difficulty: currentStep.difficulty, isCorrect: hypotheticalCorrect },
    ]);
    if (!step) continue; // this branch means the attempt would be ready-to-complete — nothing to pre-generate

    const key = speculativeCacheKey(attemptId, step);
    if (speculativeQuestionCache.has(key)) continue; // both branches happened to land on the same step, or already prefetched

    const avoidPrompts = priorResponsesWithPrompt.filter((r) => r.subSkill === step.subSkill).map((r) => r.question.prompt);
    const promise = generateAndStoreQuestion(step.domain, step.subSkill, step.difficulty, avoidPrompts);
    promise.catch(() => speculativeQuestionCache.delete(key)); // a failed speculative attempt shouldn't block the real request later — let it regenerate fresh
    speculativeQuestionCache.set(key, promise);
  }
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

  const responseSummaries = attempt.responses.map((r) => ({ subSkill: r.subSkill, difficulty: r.difficulty, isCorrect: r.isCorrect }));
  const step = planNextStep(responseSummaries);
  if (!step) {
    return { status: "ready-to-complete" as const, attemptId };
  }

  const avoidPrompts = attempt.responses.filter((r) => r.subSkill === step.subSkill).map((r) => r.question.prompt);
  const question = await getOrGenerateQuestion(attemptId, step, avoidPrompts);

  // Start generating both possible follow-ups to THIS question now, in the background, while
  // the student is still looking at it — see prefetchSpeculativeCandidates for why.
  prefetchSpeculativeCandidates(attemptId, step, attempt.responses, responseSummaries);

  const subSkillNumber = SUBSKILL_ORDER.findIndex((s) => s.subSkill === step.subSkill) + 1;

  return {
    status: "in-progress" as const,
    attemptId,
    progress: {
      questionNumber: attempt.responses.length + 1,
      subSkillNumber,
      totalSubSkills: SUBSKILL_ORDER.length,
    } satisfies DiagnosticProgress,
    question: toView(question),
  };
}

/**
 * Records one answer and returns feedback only — grading is a string comparison against an
 * already-stored question, so this resolves near-instantly. It deliberately does NOT generate
 * the next question (that's the slow, Gemini/RAG-bound step): the client fetches it separately
 * via GET /api/diagnostic/[attemptId] in the background while the student reads this feedback,
 * instead of making them wait through "checking..." for both at once.
 */
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

  return {
    feedback: { isCorrect, correctAnswer: question.correctAnswer, explanation: question.explanation },
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
  const responseSummaries = attempt.responses.map((r) => ({ subSkill: r.subSkill, difficulty: r.difficulty, isCorrect: r.isCorrect }));
  if (planNextStep(responseSummaries) !== null) throw new Error("Diagnostic not finished yet");

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
  const roadmap = await generateAndAssignComprehensivePath(userId, {
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
    overallAccuracyPct: Math.round((totalCorrect / attempt.responses.length) * 100),
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
