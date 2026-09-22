// Pure hearts/energy math. `nextRegenAt` is the timestamp the next heart regenerates at,
// or null when hearts are already full — that's the entire piece of state we persist.

export const HEARTS_MAX = 5;
export const HEART_REGEN_MS = 30 * 60 * 1000; // one heart every 30 minutes

export interface HeartsState {
  hearts: number;
  nextRegenAt: Date | null;
}

/** Fast-forwards regeneration up to `now`, without mutating anything. */
export function resolveHearts(hearts: number, nextRegenAt: Date | null, now: Date = new Date()): HeartsState {
  if (hearts >= HEARTS_MAX || !nextRegenAt) {
    return { hearts: Math.min(hearts, HEARTS_MAX), nextRegenAt: null };
  }
  const elapsedMs = now.getTime() - nextRegenAt.getTime();
  if (elapsedMs < 0) return { hearts, nextRegenAt };

  const regained = Math.floor(elapsedMs / HEART_REGEN_MS) + 1;
  const newHearts = Math.min(HEARTS_MAX, hearts + regained);
  const newNextRegenAt = newHearts >= HEARTS_MAX ? null : new Date(nextRegenAt.getTime() + regained * HEART_REGEN_MS);
  return { hearts: newHearts, nextRegenAt: newNextRegenAt };
}

export function loseHeart(hearts: number, nextRegenAt: Date | null, now: Date = new Date()): HeartsState {
  const resolved = resolveHearts(hearts, nextRegenAt, now);
  if (resolved.hearts <= 0) return resolved; // already at zero, nothing to lose
  const newHearts = resolved.hearts - 1;
  const newNextRegenAt = resolved.nextRegenAt ?? new Date(now.getTime() + HEART_REGEN_MS);
  return { hearts: newHearts, nextRegenAt: newNextRegenAt };
}

/** Used for "recover hearts by completing a practice/review session". */
export function refillHearts(amount: number, hearts: number, nextRegenAt: Date | null, now: Date = new Date()): HeartsState {
  const resolved = resolveHearts(hearts, nextRegenAt, now);
  const newHearts = Math.min(HEARTS_MAX, resolved.hearts + amount);
  return { hearts: newHearts, nextRegenAt: newHearts >= HEARTS_MAX ? null : resolved.nextRegenAt };
}
