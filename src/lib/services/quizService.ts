import { db } from "@/lib/db";
import { getResolvedHearts, loseHeartForWrongAnswer, refillHeartsFromPractice } from "@/lib/services/heartsService";
import { grantXp } from "@/lib/services/xpService";
import { incrementQuestProgress } from "@/lib/services/questService";
import { recordSkillScore } from "@/lib/services/skillService";
import { checkAndAwardBadges } from "@/lib/services/badgeService";

const PRACTICE_QUESTION_COUNT = 5;
const PRACTICE_PASS_RATIO = 0.7;

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
    include: { questions: { orderBy: { order: "asc" } }, skill: { select: { pathId: true } } },
  });

  const attempt = await db.quizAttempt.create({ data: { userId, lessonId } });

  return {
    attemptId: attempt.id,
    lessonTitle: lesson.title,
    pathId: lesson.skill.pathId,
    questions: lesson.questions.map((q) => ({
      id: q.id,
      type: q.type,
      prompt: q.prompt,
      options: JSON.parse(q.optionsJson) as string[],
    })),
  };
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
