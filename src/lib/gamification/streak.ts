import { addDays, format, parseISO, subDays } from "date-fns";

export const DAY_KEY_FORMAT = "yyyy-MM-dd";

export function dayKey(date: Date = new Date()): string {
  return format(date, DAY_KEY_FORMAT);
}

export interface StreakState {
  currentStreak: number;
  bestStreak: number;
  lastActiveDate: string | null;
}

/** Call once per qualifying activity (lesson/quiz completed). Idempotent within the same day. */
export function recordActivity(state: StreakState, today: string = dayKey()): StreakState {
  if (state.lastActiveDate === today) return state; // already counted today

  const yesterday = dayKey(subDays(parseISO(today), 1));
  const continuesStreak = state.lastActiveDate === yesterday;
  const currentStreak = continuesStreak ? state.currentStreak + 1 : 1;

  return {
    currentStreak,
    bestStreak: Math.max(state.bestStreak, currentStreak),
    lastActiveDate: today,
  };
}

/** True once a day has passed with no activity — used to decide whether to reset currentStreak to 0 on read. */
export function isStreakBroken(lastActiveDate: string | null, today: string = dayKey()): boolean {
  if (!lastActiveDate) return false;
  const yesterday = dayKey(subDays(parseISO(today), 1));
  return lastActiveDate !== today && lastActiveDate !== yesterday;
}

export interface StreakCalendarDay {
  date: string;
  active: boolean;
  isToday: boolean;
}

export function buildStreakCalendar(activeDates: Set<string>, days: number, today: string = dayKey()): StreakCalendarDay[] {
  const end = parseISO(today);
  const start = subDays(end, days - 1);
  const calendar: StreakCalendarDay[] = [];
  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
    const key = dayKey(cursor);
    calendar.push({ date: key, active: activeDates.has(key), isToday: key === today });
  }
  return calendar;
}
