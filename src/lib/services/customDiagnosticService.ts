import { db } from "@/lib/db";
import {
  planNextCustomStep,
  TIME_LIMIT_SEC,
  type CustomDiagnosticStep,
  type CustomDiagnosticResponseSummary,
  type CustomTopicRef,
} from "@/lib/gamification/customDiagnostic";
import {
  analyzeDocument,
  generateCustomQuestion,
  evaluateCustomDiagnosticAttempt,
  buildDistractorRationaleMap,
  lookupDistractorRationale,
  type CustomDiagnosticTranscriptEntry,
  type GeneratedQuestion,
} from "@/lib/llm/gemini";
import { generateAndAssignCustomPath } from "@/lib/services/roadmapService";
import type { $Enums } from "@/generated/prisma/client";

function normalize(answer: string) {
  return answer.trim().toLowerCase();
}

function parseTopics(topicsJson: string): CustomTopicRef[] {
  return JSON.parse(topicsJson) as CustomTopicRef[];
}

export interface CustomDiagnosticQuestionView {
  responseId: string;
  topic: string;
  difficulty: $Enums.DiagnosticDifficulty;
  prompt: string;
  options: string[];
  timeLimitSec: number;
}

export interface CustomDiagnosticProgress {
  questionNumber: number; // 1-indexed, cumulative across the attempt
  topicCount: number;
}

// Speculative prefetch mirrors diagnosticService.ts's rationale (Gemini calls take ~7-11s) but
// caches raw generated CONTENT, not a persisted DB row — a CustomDiagnosticResponse row is only
// ever created once a step is actually served to the student (see serveStep below), so an
// unrealized speculative branch just never touches the DB at all (no orphan rows, and no risk
// of two branches racing to claim the same `order`).
const speculativeContentCache = new Map<string, Promise<GeneratedQuestion>>();

function speculativeCacheKey(attemptId: string, step: CustomDiagnosticStep) {
  return `${attemptId}:${step.topic}:${step.difficulty}`;
}

function getOrGenerateContent(attemptId: string, step: CustomDiagnosticStep, avoidPrompts: string[]) {
  const key = speculativeCacheKey(attemptId, step);
  const cached = speculativeContentCache.get(key);
  if (cached) {
    speculativeContentCache.delete(key);
    return cached;
  }
  return generateCustomQuestion({ topic: step.topic, excerpt: step.excerpt, difficulty: step.difficulty, avoidPrompts });
}

/** Fire-and-forget: pre-generates content for both hypothetical outcomes of the question currently shown. */
function prefetchSpeculativeCandidates(
  attemptId: string,
  currentStep: CustomDiagnosticStep,
  topics: CustomTopicRef[],
  priorResponsesWithPrompt: { topic: string; prompt: string }[],
  priorResponseSummaries: CustomDiagnosticResponseSummary[]
) {
  for (const hypotheticalCorrect of [true, false]) {
    const step = planNextCustomStep(topics, [
      ...priorResponseSummaries,
      { topic: currentStep.topic, difficulty: currentStep.difficulty, isCorrect: hypotheticalCorrect },
    ]);
    if (!step) continue;

    const key = speculativeCacheKey(attemptId, step);
    if (speculativeContentCache.has(key)) continue;

    const avoidPrompts = priorResponsesWithPrompt.filter((r) => r.topic === step.topic).map((r) => r.prompt);
    const promise = generateCustomQuestion({ topic: step.topic, excerpt: step.excerpt, difficulty: step.difficulty, avoidPrompts });
    promise.catch(() => speculativeContentCache.delete(key));
    speculativeContentCache.set(key, promise);
  }
}

/** Generates (or reuses a speculative) question for this step and persists it as the Nth response row, now that it's actually being served. */
async function serveStep(attemptId: string, step: CustomDiagnosticStep, avoidPrompts: string[], order: number) {
  const generated = await getOrGenerateContent(attemptId, step, avoidPrompts);
  return db.customDiagnosticResponse.create({
    data: {
      attemptId,
      order,
      topic: step.topic,
      difficulty: step.difficulty,
      prompt: generated.prompt,
      optionsJson: JSON.stringify(generated.options),
      correctAnswer: generated.correctAnswer,
      explanation: generated.explanation,
      distractorRationaleJson: JSON.stringify(buildDistractorRationaleMap(generated.distractors)),
    },
  });
}

function toView(response: {
  id: string;
  topic: string;
  difficulty: $Enums.DiagnosticDifficulty;
  prompt: string;
  optionsJson: string;
}): CustomDiagnosticQuestionView {
  return {
    responseId: response.id,
    topic: response.topic,
    difficulty: response.difficulty,
    prompt: response.prompt,
    options: JSON.parse(response.optionsJson) as string[],
    timeLimitSec: TIME_LIMIT_SEC,
  };
}

/** Reads and analyzes the uploaded file once, creates a fresh attempt (no resume — a new upload always starts over), returns its first question. */
export async function startCustomDiagnostic(
  userId: string,
  file: { mimeType: string; base64Data: string; fileName: string }
) {
  const analysis = await analyzeDocument({ mimeType: file.mimeType, base64Data: file.base64Data });
  const attempt = await db.customDiagnosticAttempt.create({
    data: {
      userId,
      sourceFileName: file.fileName,
      sourceMimeType: file.mimeType,
      documentTitle: analysis.documentTitle,
      topicsJson: JSON.stringify(analysis.topics),
    },
  });
  return getCustomDiagnosticState(userId, attempt.id);
}

/** Returns the current state of an attempt: either the next question to answer, or its stored report. */
export async function getCustomDiagnosticState(userId: string, attemptId: string) {
  const attempt = await db.customDiagnosticAttempt.findUniqueOrThrow({
    where: { id: attemptId },
    include: { responses: { orderBy: { order: "asc" } } },
  });
  if (attempt.userId !== userId) throw new Error("Forbidden");

  if (attempt.completedAt) {
    return { status: "completed" as const, attemptId, report: JSON.parse(attempt.reportJson!) as CustomDiagnosticReport };
  }

  // A response row is only ever created once a step is actually served (see serveStep) — if one
  // is already pending (generated but not yet answered), state was simply re-fetched (e.g. a
  // background prefetch poll) and must return that SAME row, not plan/serve a new one, or every
  // repeated GET before the student answers would mint another question and inflate progress.
  const pending = attempt.responses.find((r) => r.isCorrect === null);
  if (pending) {
    return {
      status: "in-progress" as const,
      attemptId,
      progress: { questionNumber: pending.order + 1, topicCount: JSON.parse(attempt.topicsJson).length } satisfies CustomDiagnosticProgress,
      question: toView(pending),
    };
  }

  const topics = parseTopics(attempt.topicsJson);
  const responseSummaries: CustomDiagnosticResponseSummary[] = attempt.responses
    .filter((r) => r.isCorrect !== null)
    .map((r) => ({ topic: r.topic, difficulty: r.difficulty, isCorrect: r.isCorrect! }));

  const step = planNextCustomStep(topics, responseSummaries);
  if (!step) {
    return { status: "ready-to-complete" as const, attemptId };
  }

  const avoidPrompts = attempt.responses.filter((r) => r.topic === step.topic).map((r) => r.prompt);
  const order = attempt.responses.length;
  let response;
  try {
    response = await serveStep(attemptId, step, avoidPrompts, order);
  } catch (err) {
    // Two concurrent GETs (e.g. a network retry racing the original request) can both pass the
    // "no pending row yet" check above and then both try to serve/persist the same order — the
    // loser hits this unique constraint instead of silently duplicating a question. Treat it as
    // "someone else already served this step": re-fetch and return whatever is now pending.
    if ((err as { code?: string }).code === "P2002") {
      const retryAttempt = await db.customDiagnosticAttempt.findUniqueOrThrow({
        where: { id: attemptId },
        include: { responses: { orderBy: { order: "asc" } } },
      });
      const retryPending = retryAttempt.responses.find((r) => r.isCorrect === null);
      if (retryPending) {
        return {
          status: "in-progress" as const,
          attemptId,
          progress: { questionNumber: retryPending.order + 1, topicCount: topics.length } satisfies CustomDiagnosticProgress,
          question: toView(retryPending),
        };
      }
    }
    throw err;
  }

  prefetchSpeculativeCandidates(
    attemptId,
    step,
    topics,
    attempt.responses.map((r) => ({ topic: r.topic, prompt: r.prompt })),
    responseSummaries
  );

  return {
    status: "in-progress" as const,
    attemptId,
    progress: { questionNumber: order + 1, topicCount: topics.length } satisfies CustomDiagnosticProgress,
    question: toView(response),
  };
}

/** Records one answer and returns feedback only — mirrors submitDiagnosticAnswer's split (grading is instant, the next question is fetched separately). */
export async function submitCustomDiagnosticAnswer(
  userId: string,
  attemptId: string,
  responseId: string,
  answer: string,
  timeTakenSec: number
) {
  const attempt = await db.customDiagnosticAttempt.findUniqueOrThrow({ where: { id: attemptId } });
  if (attempt.userId !== userId) throw new Error("Forbidden");
  if (attempt.completedAt) throw new Error("Attempt already completed");

  const response = await db.customDiagnosticResponse.findUniqueOrThrow({ where: { id: responseId } });
  if (response.attemptId !== attemptId) throw new Error("Forbidden");
  const isCorrect = normalize(answer) === normalize(response.correctAnswer);
  const { explanation, misconceptionTag } = isCorrect
    ? { explanation: response.explanation, misconceptionTag: null as string | null }
    : lookupDistractorRationale(response.distractorRationaleJson, answer, response.explanation);

  await db.customDiagnosticResponse.update({
    where: { id: responseId },
    data: { userAnswer: answer, isCorrect, misconceptionTag, timeTakenSec: Math.max(0, Math.round(timeTakenSec)), answeredAt: new Date() },
  });

  return { feedback: { isCorrect, correctAnswer: response.correctAnswer, explanation } };
}

export interface CustomTopicResult {
  topic: string;
  correct: number;
  total: number;
  accuracyPct: number;
  mastery: $Enums.MasteryLevel;
  rationale: string;
}

export interface CustomDiagnosticReport {
  attemptId: string;
  completedAt: string;
  documentTitle: string;
  overallAccuracyPct: number;
  overallSummary: string;
  bonusXp: number;
  roadmapPathId: string;
  roadmapTitle: string;
  topics: CustomTopicResult[];
}

/** Finalizes an attempt: has Gemini judge mastery per extracted topic, builds a roadmap from them, and persists the report. */
export async function completeCustomDiagnostic(userId: string, attemptId: string): Promise<CustomDiagnosticReport> {
  const attempt = await db.customDiagnosticAttempt.findUniqueOrThrow({
    where: { id: attemptId },
    include: { responses: { orderBy: { order: "asc" } } },
  });
  if (attempt.userId !== userId) throw new Error("Forbidden");
  if (attempt.completedAt) return JSON.parse(attempt.reportJson!) as CustomDiagnosticReport;

  const topics = parseTopics(attempt.topicsJson);
  const answered = attempt.responses.filter((r) => r.isCorrect !== null);
  const responseSummaries: CustomDiagnosticResponseSummary[] = answered.map((r) => ({
    topic: r.topic,
    difficulty: r.difficulty,
    isCorrect: r.isCorrect!,
  }));
  if (planNextCustomStep(topics, responseSummaries) !== null) throw new Error("Custom diagnostic not finished yet");

  const transcript: CustomDiagnosticTranscriptEntry[] = answered.map((r) => ({
    topic: r.topic,
    difficulty: r.difficulty,
    prompt: r.prompt,
    userAnswer: r.userAnswer!,
    correctAnswer: r.correctAnswer,
    isCorrect: r.isCorrect!,
  }));
  const evaluation = await evaluateCustomDiagnosticAttempt(
    transcript,
    topics.map((t) => t.name)
  );

  const evaluationByTopic = new Map(evaluation.topics.map((t) => [t.topic, t]));
  for (const t of topics) {
    if (!evaluationByTopic.has(t.name)) throw new Error(`Gemini's evaluation is missing topic ${t.name}`);
  }

  const correctByTopic = new Map<string, { correct: number; total: number }>();
  for (const t of topics) correctByTopic.set(t.name, { correct: 0, total: 0 });
  for (const r of answered) {
    const tally = correctByTopic.get(r.topic);
    if (!tally) continue;
    tally.total += 1;
    if (r.isCorrect) tally.correct += 1;
  }

  const topicResults: CustomTopicResult[] = topics.map((t) => {
    const { mastery, rationale } = evaluationByTopic.get(t.name)!;
    const { correct, total } = correctByTopic.get(t.name)!;
    return { topic: t.name, correct, total, accuracyPct: total > 0 ? Math.round((correct / total) * 100) : 0, mastery, rationale };
  });

  const excerptByTopicName = new Map(topics.map((t) => [t.name, t.excerpt]));
  const roadmap = await generateAndAssignCustomPath(userId, {
    documentTitle: attempt.documentTitle,
    topics: topicResults.map(({ topic, mastery, rationale }) => ({
      topic,
      mastery,
      rationale,
      excerpt: excerptByTopicName.get(topic) ?? "",
    })),
    overallSummary: evaluation.overallSummary,
  });

  const totalCorrect = topicResults.reduce((sum, r) => sum + r.correct, 0);

  const report: CustomDiagnosticReport = {
    attemptId,
    completedAt: new Date().toISOString(),
    documentTitle: attempt.documentTitle,
    overallAccuracyPct: answered.length > 0 ? Math.round((totalCorrect / answered.length) * 100) : 0,
    overallSummary: evaluation.overallSummary,
    bonusXp: roadmap.bonusXp,
    roadmapPathId: roadmap.pathId,
    roadmapTitle: roadmap.title,
    topics: topicResults,
  };

  await db.customDiagnosticAttempt.update({
    where: { id: attemptId },
    data: { completedAt: new Date(), reportJson: JSON.stringify(report) },
  });

  return report;
}
