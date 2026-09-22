import { getISOWeek, getISOWeekYear } from "date-fns";

export function weekId(date: Date = new Date()): string {
  const year = getISOWeekYear(date);
  const week = String(getISOWeek(date)).padStart(2, "0");
  return `${year}-W${week}`;
}

export const DIVISION_MAX_SIZE = 30;

/** Splits a list of user ids into divisions of at most DIVISION_MAX_SIZE, preserving input order. */
export function assignDivisions(userIds: string[], maxSize: number = DIVISION_MAX_SIZE): string[][] {
  const divisions: string[][] = [];
  for (let i = 0; i < userIds.length; i += maxSize) {
    divisions.push(userIds.slice(i, i + maxSize));
  }
  return divisions;
}

export type WeekResultValue = "PENDING" | "PROMOTED" | "HELD" | "DEMOTED";

const PROMOTE_FRACTION = 0.2;
const DEMOTE_FRACTION = 0.2;

export interface RankedMember {
  userId: string;
  weeklyXp: number;
}

export interface WeekOutcome extends RankedMember {
  rank: number;
  result: WeekResultValue;
}

/**
 * Ranks members by weekly XP (desc) and marks the top fraction PROMOTED and bottom
 * fraction DEMOTED, unless this division is in the top/bottom tier respectively.
 */
export function computeWeekOutcomes(
  members: RankedMember[],
  options: { isTopTier: boolean; isBottomTier: boolean }
): WeekOutcome[] {
  const ranked = [...members].sort((a, b) => b.weeklyXp - a.weeklyXp);
  const n = ranked.length;
  const promoteCount = options.isTopTier ? 0 : Math.max(1, Math.round(n * PROMOTE_FRACTION));
  const demoteCount = options.isBottomTier ? 0 : Math.max(1, Math.round(n * DEMOTE_FRACTION));

  return ranked.map((member, index) => {
    const rank = index + 1;
    let result: WeekResultValue = "HELD";
    if (index < promoteCount) result = "PROMOTED";
    else if (index >= n - demoteCount) result = "DEMOTED";
    return { ...member, rank, result };
  });
}
