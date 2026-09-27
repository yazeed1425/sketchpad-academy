import { db } from "@/lib/db";
import { getResolvedHearts, loseHeartForWrongAnswer, refillHeartsFromPractice } from "@/lib/services/heartsService";
import { grantXp } from "@/lib/services/xpService";
import { incrementQuestProgress } from "@/lib/services/questService";
import { recordSkillScore } from "@/lib/services/skillService";
import { checkAndAwardBadges } from "@/lib/services/badgeService";
import { planNextDifficulty, isQuizResolved, needsRemediation, type AdaptiveResponseSummary, type AdaptiveBounds } from "@/lib/gamification/adaptive";
import {
  generateLessonContent,
  generateEmbedding,
  generatePracticeQuestion,
  generateMutatedPracticeQuestion,
  generateCustomQuestion,
  buildDistractorRationaleMap,
  lookupDistractorRationale,
  type LessonContent,
  type LessonReference,
  type QuestionBankReference,
  type GeneratedQuestion,
} from "@/lib/llm/gemini";
import { getSupabase } from "@/lib/supabase";
import type { $Enums } from "@/generated/prisma/client";

const PRACTICE_QUESTION_COUNT = 5;
const PRACTICE_PASS_RATIO = 0.7;

// Real-time difficulty adaptation for lesson curriculum quizzes and question-bank practice
// (Fig. 2 / Section 3.3 of the adaptive-gamification research) — same EASY/MEDIUM/HARD ladder
// and early-stop bounds as the placement diagnostic (src/lib/gamification/diagnostic.ts), just
// scoped to one lesson's response stream instead of 6 fixed sub-skills.
const MIN_QUESTIONS_PER_QUIZ = 3;
const MAX_QUESTIONS_PER_QUIZ = 5;
const ADAPTIVE_QUIZ_BOUNDS: AdaptiveBounds = { minQuestions: MIN_QUESTIONS_PER_QUIZ, maxQuestions: MAX_QUESTIONS_PER_QUIZ };
const DIFFICULTIES: $Enums.DiagnosticDifficulty[] = ["EASY", "MEDIUM", "HARD"];

// A CURRICULUM lesson quiz is shared across every student who takes that lesson (unlike
// PRACTICE_BANK/diagnostic questions, generated fresh per session) — so instead of generating
// fresh questions per attempt, a small per-difficulty pool is built once per lesson (see
// ensureCurriculumPool) and each attempt adaptively draws from it. Small enough to keep the
// first-ever open of a lesson fast, self-healing (ensureQuestionForDifficulty tops it up on
// demand) if a difficulty tier runs out across many concurrent attempts.
const CURRICULUM_POOL_SIZE_PER_DIFFICULTY = 2;

// Below this cosine similarity, the closest match in the question bank is too unrelated
// to the lesson's topic to be worth grounding the example on.
const RAG_SIMILARITY_FLOOR = 0.3;

/**
 * Looks up the closest real GAT question for a topic via vector search against the Supabase
 * question bank. Never throws — RAG is a nice-to-have grounding signal, not a hard dependency,
 * so any failure (missing config, quota limits, network) just means no reference was found.
 */
async function findReference(topic: string): Promise<LessonReference | undefined> {
  try {
    const embedding = await generateEmbedding(topic);
    const { data, error } = await getSupabase().rpc("match_qudurat_questions_all", {
      query_embedding: embedding,
      match_count: 1,
    });
    if (error) throw error;

    const match = data?.[0];
    if (!match || match.similarity < RAG_SIMILARITY_FLOOR) return undefined;

    return {
      question: match.question_text,
      explanation: match.explanation,
      imageUrl: match.image_url ?? match.diagram_image_url ?? undefined,
    };
  } catch (err) {
    console.error("RAG lookup failed, falling back to unreferenced lesson content:", err);
    return undefined;
  }
}

/**
 * Looks up up to `count` real GAT questions for a topic via vector search against the Supabase
 * question bank, for "تدرب من بنك الاسئلة" to mutate into fresh practice questions. Same
 * never-throws contract as findReference — an empty array (RAG unavailable, or the topic has no
 * good match, e.g. most verbal topics aren't covered by this bank) just means the caller falls
 * back to unreferenced generation for that many questions.
 */
async function findQuestionBankReferences(topic: string, count: number): Promise<QuestionBankReference[]> {
  try {
    const embedding = await generateEmbedding(topic);
    const { data, error } = await getSupabase().rpc("match_qudurat_questions_all", {
      query_embedding: embedding,
      match_count: count,
    });
    if (error) throw error;

    return ((data ?? []) as { similarity: number; question_text: string; options: unknown; correct_answer: string; explanation: string }[])
      .filter((row) => row.similarity >= RAG_SIMILARITY_FLOOR)
      .map((row) => ({
        question: row.question_text,
        options: Array.isArray(row.options) ? (row.options as string[]) : undefined,
        correctAnswer: row.correct_answer ?? undefined,
        explanation: row.explanation ?? undefined,
      }));
  } catch (err) {
    console.error("Question bank RAG lookup failed, falling back to unreferenced practice questions:", err);
    return [];
  }
}

/**
 * Generates and persists one fresh multiple-choice question for a topic at a specific
 * difficulty. When `sourceExcerpt` is given (a custom-content skill, see Skill.sourceExcerpt),
 * the question is grounded in that excerpt directly — the Qudurat RAG bank has no relevant
 * content for arbitrary uploaded material, so it is skipped entirely. Otherwise tries to mutate
 * a real Supabase question-bank reference at this difficulty, falling back to unreferenced
 * generation (covers topics the bank doesn't have, e.g. most verbal ones — never blocks on RAG).
 * One-question-at-a-time (rather than a fixed upfront batch) is what lets the adaptive engine
 * step the difficulty ladder between questions — see getQuizState.
 */
async function generateAndStoreQuizQuestion(
  lessonId: string,
  topic: string,
  difficulty: $Enums.DiagnosticDifficulty,
  avoidPrompts: string[],
  source: $Enums.QuestionSource,
  sourceExcerpt?: string
) {
  let generated: GeneratedQuestion;
  if (sourceExcerpt) {
    generated = await generateCustomQuestion({ topic, excerpt: sourceExcerpt, difficulty, avoidPrompts });
  } else {
    const [reference] = await findQuestionBankReferences(topic, 1);
    generated = reference
      ? await generateMutatedPracticeQuestion({ topic, difficulty, reference, avoidPrompts }).catch((err) => {
          console.error("Question mutation failed, falling back to unreferenced generation:", err);
          return generatePracticeQuestion({ topic, difficulty, avoidPrompts });
        })
      : await generatePracticeQuestion({ topic, difficulty, avoidPrompts });
  }

  return db.question.create({
    data: {
      lessonId,
      source,
      type: "MULTIPLE_CHOICE",
      difficulty,
      prompt: generated.prompt,
      optionsJson: JSON.stringify(generated.options),
      correctAnswer: generated.correctAnswer,
      explanation: generated.explanation,
      distractorRationaleJson: JSON.stringify(buildDistractorRationaleMap(generated.distractors)),
    },
  });
}

/**
 * Builds a lesson's shared CURRICULUM question pool the first time it's ever opened by anyone —
 * a small number of questions per difficulty tier, generated once and reused by every student's
 * attempt from then on (same cost model as the old fixed 5-question curriculum quiz), so each
 * attempt can adaptively draw from a real difficulty spread instead of regenerating per student.
 * Each tier is built sequentially (to dedupe within that tier via avoidPrompts) but the three
 * tiers run concurrently, so this costs about as much wall-clock time as before despite building
 * more questions overall.
 */
async function ensureCurriculumPool(lesson: { id: string; title: string; skill: { title: string; sourceExcerpt: string | null } }) {
  const existingCount = await db.question.count({ where: { lessonId: lesson.id, source: "CURRICULUM" } });
  if (existingCount > 0) return;

  const topic = `${lesson.skill.title}: ${lesson.title}`;
  await Promise.all(
    DIFFICULTIES.map(async (difficulty) => {
      const avoidPrompts: string[] = [];
      for (let i = 0; i < CURRICULUM_POOL_SIZE_PER_DIFFICULTY; i++) {
        const question = await generateAndStoreQuizQuestion(lesson.id, topic, difficulty, avoidPrompts, "CURRICULUM", lesson.skill.sourceExcerpt ?? undefined);
        avoidPrompts.push(question.prompt);
      }
    })
  );
}

/**
 * Picks a not-yet-asked CURRICULUM question at this difficulty from the lesson's shared pool for
 * this attempt, choosing randomly among matches so repeated attempts (by this or other students)
 * don't always see the same one. If every pooled question at this difficulty has already been
 * asked in this attempt (pool exhausted — rare, but possible under concurrent load), generates
 * one more and adds it to the pool permanently, self-healing for future attempts too.
 */
async function pickCurriculumQuestion(
  lesson: { id: string; title: string; skill: { title: string; sourceExcerpt: string | null } },
  difficulty: $Enums.DiagnosticDifficulty,
  excludeQuestionIds: string[]
) {
  const candidates = await db.question.findMany({
    where: { lessonId: lesson.id, source: "CURRICULUM", difficulty, id: { notIn: excludeQuestionIds } },
  });
  if (candidates.length > 0) return candidates[Math.floor(Math.random() * candidates.length)];

  const topic = `${lesson.skill.title}: ${lesson.title}`;
  const avoidPrompts = (await db.question.findMany({ where: { lessonId: lesson.id, source: "CURRICULUM" }, select: { prompt: true } })).map((q) => q.prompt);
  return generateAndStoreQuizQuestion(lesson.id, topic, difficulty, avoidPrompts, "CURRICULUM", lesson.skill.sourceExcerpt ?? undefined);
}

export class NoHeartsError extends Error {
  constructor() {
    super("No hearts remaining");
    this.name = "NoHeartsError";
  }
}

/** Pulls a handful of questions from skills the user has already completed, for heart-free review. */
export async function startPractice(userId: string) {
  const completedSkillIds = (
    await db.userSkillProgress.findMany({ where: { userId, status: "COMPLETED" }, select: { skillId: true } })
  ).map((p) => p.skillId);

  if (completedSkillIds.length === 0) throw new Error("Complete a skill first to unlock practice");

  const candidateQuestions = await db.question.findMany({
    where: { lesson: { skillId: { in: completedSkillIds } } },
    include: { lesson: true },
  });
  if (candidateQuestions.length === 0) throw new Error("No practice questions available yet");

  const shuffled = [...candidateQuestions].sort(() => Math.random() - 0.5).slice(0, PRACTICE_QUESTION_COUNT);
  const anchorLessonId = shuffled[0].lessonId;
  const attempt = await db.quizAttempt.create({ data: { userId, lessonId: anchorLessonId, isPractice: true } });

  return {
    attemptId: attempt.id,
    questions: shuffled.map((q) => ({
      id: q.id,
      type: q.type,
      prompt: q.prompt,
      options: JSON.parse(q.optionsJson) as string[],
    })),
  };
}

export interface QuizQuestionView {
  id: string;
  type: $Enums.QuestionType;
  difficulty: $Enums.DiagnosticDifficulty;
  prompt: string;
  options: string[];
}

function toQuestionView(question: {
  id: string;
  type: $Enums.QuestionType;
  difficulty: $Enums.DiagnosticDifficulty;
  prompt: string;
  optionsJson: string;
}): QuizQuestionView {
  return {
    id: question.id,
    type: question.type,
    difficulty: question.difficulty,
    prompt: question.prompt,
    options: JSON.parse(question.optionsJson) as string[],
  };
}

export interface QuizProgress {
  questionNumber: number; // 1-indexed, cumulative across the attempt so far
  minQuestions: number;
  maxQuestions: number;
}

const LESSON_SELECT = { pathId: true, title: true, description: true, sourceExcerpt: true, domainLabel: true } as const;

/**
 * Starts a heart-free practice session for one lesson, sourced from the real Supabase GAT
 * question bank when a good topical match exists (mutated into a fresh question the same way
 * diagnostic questions are), falling back to unreferenced generation otherwise. Persisted as
 * PRACTICE_BANK questions on the same lesson so grading works like any other question, but
 * excluded from the lesson's own curriculum quiz (see startAttempt below). Always generates
 * fresh per session (unlike the shared CURRICULUM pool) — see generateAndStoreQuizQuestion.
 * Returns only the first question; subsequent ones are fetched adaptively via getQuizState,
 * same pattern as the diagnostic (src/lib/services/diagnosticService.ts).
 */
export async function startQuestionBankPractice(userId: string, lessonId: string) {
  const lesson = await db.lesson.findUniqueOrThrow({
    where: { id: lessonId },
    include: { skill: { select: { pathId: true, title: true, description: true, sourceExcerpt: true, domainLabel: true } } },
  });
  const topic = `${lesson.skill.title}: ${lesson.title}`;

  const [attempt, question] = await Promise.all([
    db.quizAttempt.create({ data: { userId, lessonId, isPractice: true } }),
    generateAndStoreQuizQuestion(lessonId, topic, "MEDIUM", [], "PRACTICE_BANK", lesson.skill.sourceExcerpt ?? undefined),
  ]);

  return {
    attemptId: attempt.id,
    progress: { questionNumber: 1, minQuestions: MIN_QUESTIONS_PER_QUIZ, maxQuestions: MAX_QUESTIONS_PER_QUIZ } satisfies QuizProgress,
    question: toQuestionView(question),
  };
}

/**
 * Starts a lesson's curriculum quiz attempt and returns only its first (MEDIUM-difficulty)
 * question — difficulty then steps up/down adaptively based on the running response stream (see
 * getQuizState), same real-time adaptation Fig. 2 of the gamification research describes. Builds
 * the lesson's shared difficulty pool on first-ever open (see ensureCurriculumPool).
 */
export async function startAttempt(userId: string, lessonId: string) {
  const hearts = await getResolvedHearts(userId);
  if (hearts.hearts <= 0) throw new NoHeartsError();

  const lesson = await db.lesson.findUniqueOrThrow({
    where: { id: lessonId },
    include: { skill: { select: LESSON_SELECT } },
  });

  const [attempt, content] = await Promise.all([
    db.quizAttempt.create({ data: { userId, lessonId } }),
    getOrGenerateLessonContent(lesson),
  ]);

  await ensureCurriculumPool(lesson);
  const firstQuestion = await pickCurriculumQuestion(lesson, "MEDIUM", []);

  return {
    attemptId: attempt.id,
    lessonTitle: lesson.title,
    pathId: lesson.skill.pathId,
    domainLabel: lesson.skill.domainLabel,
    content,
    progress: { questionNumber: 1, minQuestions: MIN_QUESTIONS_PER_QUIZ, maxQuestions: MAX_QUESTIONS_PER_QUIZ } satisfies QuizProgress,
    question: toQuestionView(firstQuestion),
  };
}

export type QuizState =
  | { status: "in-progress"; attemptId: string; progress: QuizProgress; remediation: boolean; question: QuizQuestionView }
  | { status: "ready-to-complete"; attemptId: string };

/**
 * Returns the current state of a lesson/practice attempt: the next adaptively-selected question
 * to answer (with `remediation: true` when the student just missed two EASY questions in a row —
 * the "Low Performance" branch of Fig. 2, signaling the client to show a review of the lesson's
 * concept/example/common-mistake content before continuing), or "ready-to-complete" once the
 * response stream has resolved (see isResolved in adaptive.ts). Mirrors
 * diagnosticService.getDiagnosticState's two-step "grade instantly, fetch next separately"
 * pattern so the slow Gemini/RAG generation never blocks the answer-feedback screen.
 */
export async function getQuizState(userId: string, attemptId: string): Promise<QuizState> {
  const attempt = await db.quizAttempt.findUniqueOrThrow({
    where: { id: attemptId },
    include: {
      responses: { include: { question: true }, orderBy: { answeredAt: "asc" } },
      lesson: { include: { skill: { select: LESSON_SELECT } } },
    },
  });
  if (attempt.userId !== userId) throw new Error("Forbidden");

  const responseSummaries: AdaptiveResponseSummary[] = attempt.responses.map((r) => ({ difficulty: r.question.difficulty, isCorrect: r.isCorrect }));
  if (attempt.completedAt || isQuizResolved(responseSummaries, ADAPTIVE_QUIZ_BOUNDS)) {
    return { status: "ready-to-complete", attemptId };
  }

  const difficulty = planNextDifficulty(responseSummaries);
  const remediation = needsRemediation(responseSummaries);
  const topic = `${attempt.lesson.skill.title}: ${attempt.lesson.title}`;

  const question = attempt.isPractice
    ? await generateAndStoreQuizQuestion(
        attempt.lessonId,
        topic,
        difficulty,
        attempt.responses.map((r) => r.question.prompt),
        "PRACTICE_BANK",
        attempt.lesson.skill.sourceExcerpt ?? undefined
      )
    : await pickCurriculumQuestion(
        { id: attempt.lessonId, title: attempt.lesson.title, skill: attempt.lesson.skill },
        difficulty,
        attempt.responses.map((r) => r.questionId)
      );

  return {
    status: "in-progress",
    attemptId,
    progress: { questionNumber: attempt.responses.length + 1, minQuestions: MIN_QUESTIONS_PER_QUIZ, maxQuestions: MAX_QUESTIONS_PER_QUIZ },
    remediation,
    question: toQuestionView(question),
  };
}

/**
 * Returns the lesson's cached explanatory content, generating and persisting it via Gemini on
 * first view — grounded in the skill's own sourceExcerpt for custom-content skills (never in the
 * Qudurat RAG bank, which has no relevant content for arbitrary uploaded material), or in the
 * Qudurat RAG bank when available otherwise.
 */
async function getOrGenerateLessonContent(lesson: {
  id: string;
  content: string | null;
  title: string;
  skill: { title: string; description: string; sourceExcerpt: string | null };
}): Promise<LessonContent> {
  if (lesson.content) return JSON.parse(lesson.content) as LessonContent;

  if (lesson.skill.sourceExcerpt) {
    const generated = await generateLessonContent({
      title: lesson.title,
      description: lesson.skill.description,
      sourceExcerpt: lesson.skill.sourceExcerpt,
    });
    await db.lesson.update({ where: { id: lesson.id }, data: { content: JSON.stringify(generated) } });
    return generated;
  }

  const reference = await findReference(`${lesson.title} ${lesson.skill.description}`);
  const generated = await generateLessonContent({ title: lesson.title, description: lesson.skill.description, reference });
  await db.lesson.update({ where: { id: lesson.id }, data: { content: JSON.stringify(generated) } });
  return generated;
}

function normalize(answer: string) {
  return answer.trim().toLowerCase();
}

export async function submitAnswer(userId: string, attemptId: string, questionId: string, answer: string) {
  const attempt = await db.quizAttempt.findUniqueOrThrow({ where: { id: attemptId } });
  if (attempt.userId !== userId) throw new Error("Forbidden");
  if (attempt.completedAt) throw new Error("Attempt already completed");

  const question = await db.question.findUniqueOrThrow({ where: { id: questionId } });
  const isCorrect = normalize(answer) === normalize(question.correctAnswer);
  const { explanation, misconceptionTag } = isCorrect
    ? { explanation: question.explanation, misconceptionTag: null as string | null }
    : lookupDistractorRationale(question.distractorRationaleJson, answer, question.explanation);

  await db.questionResponse.create({
    data: { attemptId, questionId, userAnswer: answer, isCorrect, misconceptionTag },
  });

  let hearts = await getResolvedHearts(userId);
  if (!isCorrect && !attempt.isPractice) {
    await loseHeartForWrongAnswer(userId);
    hearts = await getResolvedHearts(userId);
  }

  return {
    isCorrect,
    correctAnswer: question.correctAnswer,
    explanation,
    hearts: hearts.hearts,
    heartsDepleted: hearts.hearts <= 0,
  };
}

export async function completeAttempt(userId: string, attemptId: string) {
  const attempt = await db.quizAttempt.findUniqueOrThrow({
    where: { id: attemptId },
    include: { responses: true, lesson: true },
  });
  if (attempt.userId !== userId) throw new Error("Forbidden");

  const total = attempt.responses.length;
  const correct = attempt.responses.filter((r) => r.isCorrect).length;
  const scorePct = total > 0 ? Math.round((correct / total) * 100) : 0;

  if (attempt.isPractice) {
    const passed = total > 0 && correct / total >= PRACTICE_PASS_RATIO;
    await db.quizAttempt.update({ where: { id: attemptId }, data: { completedAt: new Date(), scorePct } });
    if (passed) await refillHeartsFromPractice(userId, 1);
    await incrementQuestProgress(userId, "PRACTICE_SESSION", 1);
    const hearts = await getResolvedHearts(userId);
    return { scorePct, practiceHeartRefilled: passed, heartsRemaining: hearts.hearts };
  }

  const xpEarned = Math.round(attempt.lesson.xpReward * (scorePct / 100));
  const heartsLost = attempt.responses.filter((r) => !r.isCorrect).length;

  await db.quizAttempt.update({
    where: { id: attemptId },
    data: { completedAt: new Date(), scorePct, xpEarned, heartsLost },
  });

  const xpResult = xpEarned > 0 ? await grantXp(userId, xpEarned, "QUIZ", attempt.lessonId) : null;

  const [, , justCompletedQuests] = await Promise.all([
    incrementQuestProgress(userId, "COMPLETE_LESSONS", 1),
    xpEarned > 0 ? incrementQuestProgress(userId, "EARN_XP", xpEarned) : Promise.resolve([]),
    scorePct === 100 ? incrementQuestProgress(userId, "PERFECT_QUIZ", 1) : Promise.resolve([]),
  ]);

  const skillResult = await recordSkillScore(userId, attempt.lesson.skillId, scorePct);
  const newBadges = await checkAndAwardBadges(userId);
  const hearts = await getResolvedHearts(userId);

  return {
    scorePct,
    xpEarned,
    heartsLost,
    heartsRemaining: hearts.hearts,
    leveledUp: xpResult?.leveledUp ?? false,
    newLevel: xpResult?.after.level,
    streak: xpResult?.streak,
    skillCompleted: skillResult.completedNow,
    unlockedSkillIds: skillResult.unlockedSkillIds,
    completedQuests: justCompletedQuests,
    newBadges,
  };
}
