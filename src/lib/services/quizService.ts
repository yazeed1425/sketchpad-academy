import { db } from "@/lib/db";
import { getResolvedHearts, loseHeartForWrongAnswer, refillHeartsFromPractice } from "@/lib/services/heartsService";
import { grantXp } from "@/lib/services/xpService";
import { incrementQuestProgress } from "@/lib/services/questService";
import { recordSkillScore } from "@/lib/services/skillService";
import { checkAndAwardBadges } from "@/lib/services/badgeService";
import {
  generateLessonContent,
  generateEmbedding,
  generatePracticeQuestion,
  generateMutatedPracticeQuestion,
  generateCustomQuestion,
  type LessonContent,
  type LessonReference,
  type QuestionBankReference,
  type GeneratedQuestion,
} from "@/lib/llm/gemini";
import { getSupabase } from "@/lib/supabase";
import type { $Enums } from "@/generated/prisma/client";

const PRACTICE_QUESTION_COUNT = 5;
const PRACTICE_PASS_RATIO = 0.7;
const QUESTION_BANK_PRACTICE_COUNT = 5;
const CURRICULUM_QUESTION_COUNT = 5;

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
 * Generates `count` fresh multiple-choice questions for a topic. When `sourceExcerpt` is given
 * (a custom-content skill, see Skill.sourceExcerpt), every question is grounded in that excerpt
 * directly — the Qudurat RAG bank has no relevant content for arbitrary uploaded material, so it
 * is skipped entirely. Otherwise mutates as many real Supabase question-bank references as were
 * found, then fills any remainder with unreferenced generation (covers topics the bank doesn't
 * have, e.g. most verbal ones — never blocks on RAG). Shared by "تدرب من بنك الاسئلة" and by lazy
 * curriculum-question generation on a lesson's first open.
 */
async function generateQuestionSet(topic: string, count: number, sourceExcerpt?: string): Promise<GeneratedQuestion[]> {
  if (sourceExcerpt) {
    const generated: GeneratedQuestion[] = [];
    const avoidPrompts: string[] = [];
    for (let i = 0; i < count; i++) {
      const question = await generateCustomQuestion({ topic, excerpt: sourceExcerpt, difficulty: "MEDIUM", avoidPrompts });
      generated.push(question);
      avoidPrompts.push(question.prompt);
    }
    return generated;
  }

  const references = await findQuestionBankReferences(topic, count);

  const generated: GeneratedQuestion[] = [];
  const avoidPrompts: string[] = [];
  for (const reference of references) {
    const question = await generateMutatedPracticeQuestion({ topic, reference, avoidPrompts }).catch((err) => {
      console.error("Question mutation failed, falling back to unreferenced generation:", err);
      return generatePracticeQuestion({ topic, avoidPrompts });
    });
    generated.push(question);
    avoidPrompts.push(question.prompt);
  }
  while (generated.length < count) {
    const question = await generatePracticeQuestion({ topic, avoidPrompts });
    generated.push(question);
    avoidPrompts.push(question.prompt);
  }
  return generated;
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

/**
 * Starts a heart-free practice session for one lesson, sourced from the real Supabase GAT
 * question bank when a good topical match exists (mutated into fresh questions the same way
 * diagnostic questions are), falling back to unreferenced generation to fill out the rest.
 * Persisted as PRACTICE_BANK questions on the same lesson so grading works like any other
 * question, but excluded from the lesson's own curriculum quiz (see startAttempt above).
 */
export async function startQuestionBankPractice(userId: string, lessonId: string) {
  const lesson = await db.lesson.findUniqueOrThrow({
    where: { id: lessonId },
    include: { skill: { select: { pathId: true, title: true, description: true, sourceExcerpt: true, domainLabel: true } } },
  });
  const topic = `${lesson.skill.title}: ${lesson.title}`;
  const generated = await generateQuestionSet(topic, QUESTION_BANK_PRACTICE_COUNT, lesson.skill.sourceExcerpt ?? undefined);

  const questions = await Promise.all(
    generated.map((g, order) =>
      db.question.create({
        data: {
          lessonId,
          source: "PRACTICE_BANK",
          type: "MULTIPLE_CHOICE",
          prompt: g.prompt,
          optionsJson: JSON.stringify(g.options),
          correctAnswer: g.correctAnswer,
          explanation: g.explanation,
          order,
        },
      })
    )
  );

  const attempt = await db.quizAttempt.create({ data: { userId, lessonId, isPractice: true } });

  return {
    attemptId: attempt.id,
    lessonTitle: lesson.title,
    skillTitle: lesson.skill.title,
    pathId: lesson.skill.pathId,
    domainLabel: lesson.skill.domainLabel,
    questions: questions.map((q) => ({
      id: q.id,
      type: q.type,
      prompt: q.prompt,
      options: JSON.parse(q.optionsJson) as string[],
    })),
  };
}

export async function startAttempt(userId: string, lessonId: string) {
  const hearts = await getResolvedHearts(userId);
  if (hearts.hearts <= 0) throw new NoHeartsError();

  const lesson = await db.lesson.findUniqueOrThrow({
    where: { id: lessonId },
    include: {
      questions: { where: { source: "CURRICULUM" }, orderBy: { order: "asc" } },
      skill: { select: { pathId: true, title: true, description: true, sourceExcerpt: true, domainLabel: true } },
    },
  });

  const [attempt, content, questions] = await Promise.all([
    db.quizAttempt.create({ data: { userId, lessonId } }),
    getOrGenerateLessonContent(lesson),
    getOrGenerateCurriculumQuestions(lesson),
  ]);

  return {
    attemptId: attempt.id,
    lessonTitle: lesson.title,
    pathId: lesson.skill.pathId,
    domainLabel: lesson.skill.domainLabel,
    content,
    questions: questions.map((q) => ({
      id: q.id,
      type: q.type,
      prompt: q.prompt,
      options: JSON.parse(q.optionsJson) as string[],
    })),
  };
}

/**
 * Returns the lesson's curriculum quiz, generating and persisting it (RAG-grounded when
 * possible, via the same generateQuestionSet used for question-bank practice) the first time
 * the lesson is opened — roadmap creation no longer bundles every node's questions upfront, so
 * this is where they actually get created. Cached from then on (a lesson never regenerates its
 * curriculum quiz once it exists, same as lesson content).
 */
async function getOrGenerateCurriculumQuestions(lesson: {
  id: string;
  title: string;
  skill: { title: string; description: string; sourceExcerpt: string | null };
  questions: { id: string; type: $Enums.QuestionType; prompt: string; optionsJson: string }[];
}) {
  if (lesson.questions.length > 0) return lesson.questions;

  const topic = `${lesson.skill.title}: ${lesson.title}`;
  const generated = await generateQuestionSet(topic, CURRICULUM_QUESTION_COUNT, lesson.skill.sourceExcerpt ?? undefined);

  return Promise.all(
    generated.map((g, order) =>
      db.question.create({
        data: {
          lessonId: lesson.id,
          source: "CURRICULUM",
          type: "MULTIPLE_CHOICE",
          prompt: g.prompt,
          optionsJson: JSON.stringify(g.options),
          correctAnswer: g.correctAnswer,
          explanation: g.explanation,
          order,
        },
      })
    )
  );
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

  await db.questionResponse.create({
    data: { attemptId, questionId, userAnswer: answer, isCorrect },
  });

  let hearts = await getResolvedHearts(userId);
  if (!isCorrect && !attempt.isPractice) {
    await loseHeartForWrongAnswer(userId);
    hearts = await getResolvedHearts(userId);
  }

  return {
    isCorrect,
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
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
