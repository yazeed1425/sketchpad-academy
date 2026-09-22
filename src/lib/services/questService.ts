import { db } from "@/lib/db";
import { applyQuestProgress, pickDailyQuests, rollTarget, seededRng } from "@/lib/gamification/quests";
import { dayKey } from "@/lib/gamification/streak";
import type { $Enums } from "@/generated/prisma/client";

/**
 * Rolls today's 3 quests the first time they're requested; returns the same set on later calls.
 * The picks and targets are derived from a per-user-per-day seeded RNG (not Math.random()) so that
 * two concurrent requests — e.g. the dashboard and the header both loading at once — always agree
 * on the same 3 quests instead of racing to create different ones. The unique constraint on
 * (userId, templateId, date) plus `upsert` makes the writes idempotent even if they still overlap.
 */
export async function ensureDailyQuests(userId: string, date: string = dayKey()) {
  const existing = await db.dailyQuest.findMany({ where: { userId, date }, include: { template: true } });
  if (existing.length > 0) return existing;

  const templates = await db.dailyQuestTemplate.findMany({ orderBy: { id: "asc" } });
  const rng = seededRng(`${userId}:${date}`);
  const chosen = pickDailyQuests(templates, 3, rng);

  await db.$transaction(
    chosen.map((template) =>
      db.dailyQuest.upsert({
        where: { userId_templateId_date: { userId, templateId: template.id, date } },
        create: {
          userId,
          templateId: template.id,
          date,
          target: rollTarget(template.targetMin, template.targetMax, rng),
          xpReward: template.xpReward,
        },
        update: {},
      })
    )
  );

  return db.dailyQuest.findMany({ where: { userId, date }, include: { template: true } });
}

/** Advances every incomplete quest of `type` due today by `increment`. Returns quests that just completed. */
export async function incrementQuestProgress(userId: string, type: $Enums.QuestType, increment: number, date: string = dayKey()) {
  const quests = await ensureDailyQuests(userId, date);
  const relevant = quests.filter((q) => q.template.type === type && !q.completed);
  const justCompleted: typeof quests = [];

  for (const quest of relevant) {
    const { progress, completed } = applyQuestProgress(quest.progress, quest.target, increment);
    const updated = await db.dailyQuest.update({
      where: { id: quest.id },
      data: { progress, completed },
      include: { template: true },
    });
    if (completed) justCompleted.push(updated);
  }

  return justCompleted;
}
