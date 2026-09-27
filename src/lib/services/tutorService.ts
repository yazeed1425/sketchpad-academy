import { db } from "@/lib/db";
import {
  generateFlashcards,
  generateKnowledgeGraph,
  askTutor,
  askPlanTutor,
  type TutorLessonContext,
  type TutorFlashcard,
  type TutorKnowledgeGraph,
  type TutorChatMessage,
  type TutorPlanContext,
} from "@/lib/llm/gemini";

const MAX_HISTORY_TURNS = 12; // keep the chat prompt bounded — recent context matters far more than the full transcript

async function getLessonContext(lessonId: string): Promise<TutorLessonContext & { skillId: string }> {
  const lesson = await db.lesson.findUniqueOrThrow({
    where: { id: lessonId },
    include: { skill: { select: { id: true, title: true, description: true, sourceExcerpt: true } } },
  });
  return {
    skillId: lesson.skill.id,
    title: lesson.title,
    description: lesson.skill.description,
    sourceExcerpt: lesson.skill.sourceExcerpt ?? undefined,
  };
}

/** Verifies the lesson belongs to a path the student can actually access (enrolled, or the path is their own personal one). */
async function assertLessonAccessible(userId: string, lessonId: string): Promise<void> {
  const lesson = await db.lesson.findUniqueOrThrow({
    where: { id: lessonId },
    select: { skill: { select: { path: { select: { userId: true, enrollments: { where: { userId }, select: { id: true } } } } } } },
  });
  const { path } = lesson.skill;
  const accessible = path.userId === userId || path.enrollments.length > 0;
  if (!accessible) throw new Error("Forbidden");
}

/** Returns the lesson's cached flashcards, generating and persisting them via Gemini on first request. */
export async function getOrGenerateFlashcards(userId: string, lessonId: string): Promise<TutorFlashcard[]> {
  await assertLessonAccessible(userId, lessonId);
  const lesson = await db.lesson.findUniqueOrThrow({ where: { id: lessonId }, select: { flashcardsJson: true } });
  if (lesson.flashcardsJson) return JSON.parse(lesson.flashcardsJson) as TutorFlashcard[];

  const context = await getLessonContext(lessonId);
  const cards = await generateFlashcards(context);
  await db.lesson.update({ where: { id: lessonId }, data: { flashcardsJson: JSON.stringify(cards) } });
  return cards;
}

/** Returns the lesson's cached knowledge graph, generating and persisting it via Gemini on first request. */
export async function getOrGenerateKnowledgeGraph(userId: string, lessonId: string): Promise<TutorKnowledgeGraph> {
  await assertLessonAccessible(userId, lessonId);
  const lesson = await db.lesson.findUniqueOrThrow({ where: { id: lessonId }, select: { knowledgeGraphJson: true } });
  if (lesson.knowledgeGraphJson) return JSON.parse(lesson.knowledgeGraphJson) as TutorKnowledgeGraph;

  const context = await getLessonContext(lessonId);
  const graph = await generateKnowledgeGraph(context);
  await db.lesson.update({ where: { id: lessonId }, data: { knowledgeGraphJson: JSON.stringify(graph) } });
  return graph;
}

/**
 * Answers one chat turn, grounded in the lesson's content. The conversation itself isn't
 * persisted (no schema for it) — the client resends the running history each turn, same as any
 * stateless chat endpoint; only the last MAX_HISTORY_TURNS are forwarded to Gemini to keep the
 * prompt bounded on a long-running session.
 */
export async function askTutorQuestion(
  userId: string,
  lessonId: string,
  history: TutorChatMessage[],
  question: string
): Promise<string> {
  await assertLessonAccessible(userId, lessonId);
  if (!question.trim()) throw new Error("Question cannot be empty");

  const context = await getLessonContext(lessonId);
  return askTutor(context, history.slice(-MAX_HISTORY_TURNS), question.trim());
}

/** The learning path the AI Tutor discusses when opened outside any specific lesson: the
 * student's personal (diagnostic-generated) path if they have one, else their first enrolled
 * shared catalog path. Mirrors the "current path" a student would see on their dashboard. */
async function getPlanContext(userId: string): Promise<TutorPlanContext | null> {
  const personalPath = await db.learningPath.findFirst({
    where: { userId },
    include: { skills: { orderBy: [{ tier: "asc" }, { col: "asc" }] } },
  });
  const path =
    personalPath ??
    (
      await db.pathEnrollment.findFirst({
        where: { userId },
        orderBy: { startedAt: "asc" },
        include: { path: { include: { skills: { orderBy: [{ tier: "asc" }, { col: "asc" }] } } } },
      })
    )?.path;
  if (!path) return null;

  const [profile, progress] = await Promise.all([
    db.profile.findUniqueOrThrow({ where: { userId } }),
    db.userSkillProgress.findMany({ where: { userId, skill: { pathId: path.id } }, select: { skillId: true, status: true } }),
  ]);
  const statusBySkillId = new Map(progress.map((p) => [p.skillId, p.status as string]));

  return {
    pathTitle: path.title,
    pathDescription: path.description,
    level: profile.level,
    totalXp: profile.totalXp,
    currentStreak: profile.currentStreak,
    skills: path.skills.map((s) => ({
      title: s.title,
      status: statusBySkillId.get(s.id) ?? "LOCKED",
      mastery: s.diagnosedMastery ?? undefined,
    })),
  };
}

/** Same idea as askTutorQuestion, but for the AI Tutor panel opened outside any lesson (dashboard,
 * roadmap, profile, etc.) — grounded in the student's overall plan/progress instead of one
 * lesson's content. */
export async function askPlanTutorQuestion(userId: string, history: TutorChatMessage[], question: string): Promise<string> {
  if (!question.trim()) throw new Error("Question cannot be empty");

  const context = await getPlanContext(userId);
  if (!context) throw new Error("No learning path found for this student yet");
  return askPlanTutor(context, history.slice(-MAX_HISTORY_TURNS), question.trim());
}
