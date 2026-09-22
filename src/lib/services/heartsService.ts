import { db } from "@/lib/db";
import { loseHeart, refillHearts, resolveHearts } from "@/lib/gamification/hearts";

export async function loseHeartForWrongAnswer(userId: string) {
  const profile = await db.profile.findUniqueOrThrow({ where: { userId } });
  const resolved = loseHeart(profile.hearts, profile.nextRegenAt);
  return db.profile.update({
    where: { userId },
    data: { hearts: resolved.hearts, nextRegenAt: resolved.nextRegenAt },
  });
}

/** Awards hearts back for finishing a practice/review session. */
export async function refillHeartsFromPractice(userId: string, amount: number) {
  const profile = await db.profile.findUniqueOrThrow({ where: { userId } });
  const resolved = refillHearts(amount, profile.hearts, profile.nextRegenAt);
  return db.profile.update({
    where: { userId },
    data: { hearts: resolved.hearts, nextRegenAt: resolved.nextRegenAt },
  });
}

export async function getResolvedHearts(userId: string) {
  const profile = await db.profile.findUniqueOrThrow({ where: { userId } });
  return resolveHearts(profile.hearts, profile.nextRegenAt);
}
