// Pure leveling math. No I/O, no rendering — callers persist the results.

/** XP required to advance FROM `level` TO `level + 1`. Grows linearly so late levels take longer. */
export function xpRequiredForLevel(level: number): number {
  return 80 + (level - 1) * 20;
}

export interface LevelState {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
}

export function levelFromTotalXp(totalXp: number): LevelState {
  let level = 1;
  let remaining = totalXp;
  while (remaining >= xpRequiredForLevel(level)) {
    remaining -= xpRequiredForLevel(level);
    level++;
  }
  return { level, xpIntoLevel: remaining, xpForNextLevel: xpRequiredForLevel(level) };
}

export interface XpAwardResult {
  totalXp: number;
  before: LevelState;
  after: LevelState;
  leveledUp: boolean;
  levelsGained: number;
}

export function awardXp(previousTotalXp: number, amount: number): XpAwardResult {
  const before = levelFromTotalXp(previousTotalXp);
  const totalXp = previousTotalXp + Math.max(0, amount);
  const after = levelFromTotalXp(totalXp);
  return {
    totalXp,
    before,
    after,
    leveledUp: after.level > before.level,
    levelsGained: after.level - before.level,
  };
}
