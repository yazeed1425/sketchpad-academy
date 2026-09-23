import { db } from "@/lib/db";
import { getResolvedHearts, loseHeartForWrongAnswer, refillHeartsFromPractice } from "@/lib/services/heartsService";
import { grantXp } from "@/lib/services/xpService";
import { incrementQuestProgress } from "@/lib/services/questService";
import { recordSkillScore } from "@/lib/services/skillService";
import { checkAndAwardBadges } from "@/lib/services/badgeService";
import { generateLessonContent, generateEmbedding, type LessonContent, type LessonReference } from "@/lib/llm/gemini";
import { getSupabase } from "@/lib/supabase";

const PRACTICE_QUESTION_COUNT = 5;
const PRACTICE_PASS_RATIO = 0.7;

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

export async function startAttempt(userId: string, lessonId: string) {
  const hearts = await getResolvedHearts(userId);
  if (hearts.hearts <= 0) throw new NoHeartsError();

  const lesson = await db.lesson.findUniqueOrThrow({
    where: { id: lessonId },
    include: { questions: { orderBy: { order: "asc" } }, skill: { select: { pathId: true, title: true, description: true } } },
  });

  const [attempt, content] = await Promise.all([
    db.quizAttempt.create({ data: { userId, lessonId } }),
    getOrGenerateLessonContent(lesson),
  ]);

  return {
    attemptId: attempt.id,
    lessonTitle: lesson.title,
    pathId: lesson.skill.pathId,
    content,
    questions: lesson.questions.map((q) => ({
      id: q.id,
      type: q.type,
      prompt: q.prompt,
      options: JSON.parse(q.optionsJson) as string[],
    })),
  };
}

/** Returns the lesson's cached explanatory content, generating and persisting it via Gemini (RAG-grounded when possible) on first view. */
async function getOrGenerateLessonContent(lesson: {
  id: string;
  content: string | null;
  title: string;
  skill: { title: string; description: string };
}): Promise<LessonContent> {
  if (lesson.content) return JSON.parse(lesson.content) as LessonContent;

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
