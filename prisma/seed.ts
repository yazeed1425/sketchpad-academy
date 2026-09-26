import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" });
const db = new PrismaClient({ adapter });

// The dashboard's real learning path is the personalized, diagnostic-generated roadmap (see
// roadmapService.ts / generateAndAssignComprehensivePath) — created per-user once they complete
// the placement test, not seeded here. This file only seeds account-independent gamification data.

const questTemplates = [
  { type: "COMPLETE_LESSONS" as const, description: "Complete {target} lessons today", targetMin: 1, targetMax: 3, xpReward: 30 },
  { type: "EARN_XP" as const, description: "Earn {target} XP today", targetMin: 80, targetMax: 200, xpReward: 40 },
  { type: "PERFECT_QUIZ" as const, description: "Get a perfect score on {target} quiz", targetMin: 1, targetMax: 1, xpReward: 50 },
  { type: "PRACTICE_SESSION" as const, description: "Finish {target} practice session", targetMin: 1, targetMax: 1, xpReward: 20 },
];

const badges = [
  { key: "first-steps", title: "First Steps", description: "Complete your first skill.", icon: "star", criteria: "SKILLS_COMPLETED" as const, criteriaValue: 1 },
  { key: "streak-3", title: "Three-Day Spark", description: "Reach a 3-day streak.", icon: "flame", criteria: "STREAK_DAYS" as const, criteriaValue: 3 },
  { key: "streak-7", title: "Week-Long Streak", description: "Reach a 7-day streak.", icon: "flame", criteria: "STREAK_DAYS" as const, criteriaValue: 7 },
  { key: "streak-30", title: "Streak Champion", description: "Reach a 30-day streak.", icon: "flame", criteria: "STREAK_DAYS" as const, criteriaValue: 30 },
  { key: "level-5", title: "Rising Star", description: "Reach level 5.", icon: "badge", criteria: "LEVEL_REACHED" as const, criteriaValue: 5 },
  { key: "level-10", title: "Dedicated Learner", description: "Reach level 10.", icon: "badge", criteria: "LEVEL_REACHED" as const, criteriaValue: 10 },
  { key: "skills-10", title: "Skill Collector", description: "Complete 10 skills.", icon: "lightbulb", criteria: "SKILLS_COMPLETED" as const, criteriaValue: 10 },
  { key: "perfect-5", title: "Sharp Shooter", description: "Score 100% on 5 quizzes.", icon: "thumb", criteria: "PERFECT_QUIZZES" as const, criteriaValue: 5 },
  { key: "promoted-1", title: "Climbing the Ranks", description: "Get promoted out of a league division.", icon: "star", criteria: "LEAGUE_PROMOTIONS" as const, criteriaValue: 1 },
  { key: "path-complete", title: "Path Master", description: "Complete every skill in a learning path.", icon: "badge", criteria: "PATH_COMPLETED" as const, criteriaValue: 1 },
  { key: "weak-topic-mastered", title: "Turned It Around", description: "Master a skill that started out as a weak spot.", icon: "star", criteria: "WEAK_TOPIC_MASTERED" as const, criteriaValue: 1 },
  { key: "comeback-1", title: "Comeback Kid", description: "Pass a skill after needing more than one try.", icon: "flame", criteria: "COMEBACK" as const, criteriaValue: 1 },
];

async function main() {
  for (const t of questTemplates) {
    const existing = await db.dailyQuestTemplate.findFirst({ where: { type: t.type, description: t.description } });
    if (!existing) await db.dailyQuestTemplate.create({ data: t });
  }

  for (const b of badges) {
    await db.badge.upsert({ where: { key: b.key }, create: b, update: b });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
