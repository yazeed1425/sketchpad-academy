/** Deterministic RNG seeded from a string (e.g. `${userId}:${date}`), so concurrent requests
 * for "today's quests" always compute the same picks instead of racing to different answers. */
export function seededRng(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

export interface QuestTemplateLike {
  id: string;
  type: string;
  targetMin: number;
  targetMax: number;
  xpReward: number;
}

/** Picks `count` distinct templates at random (favoring variety of `type`). */
export function pickDailyQuests<T extends QuestTemplateLike>(
  templates: T[],
  count = 3,
  rng: () => number = Math.random
): T[] {
  const byType = new Map<string, T[]>();
  for (const template of templates) {
    const bucket = byType.get(template.type) ?? [];
    bucket.push(template);
    byType.set(template.type, bucket);
  }

  const typePool = [...byType.keys()];
  const picked: T[] = [];

  while (picked.length < count && typePool.length > 0) {
    const typeIndex = Math.floor(rng() * typePool.length);
    const type = typePool[typeIndex];
    const options = byType.get(type)!;
    const option = options[Math.floor(rng() * options.length)];
    picked.push(option);
    typePool.splice(typeIndex, 1); // one quest per type per day
  }

  return picked;
}

export function rollTarget(min: number, max: number, rng: () => number = Math.random): number {
  if (max <= min) return min;
  return Math.round(min + rng() * (max - min));
}

export function applyQuestProgress(progress: number, target: number, increment: number): { progress: number; completed: boolean } {
  const newProgress = Math.min(target, progress + Math.max(0, increment));
  return { progress: newProgress, completed: newProgress >= target };
}
