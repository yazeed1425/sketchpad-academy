import { db } from "@/lib/db";
import {
  generateFlashcards,
  generateKnowledgeGraph,
  askTutor,
  type TutorLessonContext,
  type TutorFlashcard,
  type TutorKnowledgeGraph,
  type TutorChatMessage,
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
