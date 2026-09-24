"use client";

// MEDAD-style skill-tree node badge: a colored rounded-square icon chip (currentColor icon
// over a pastel tint, so it stays correct in both light/dark themes) plus a small corner
// status indicator for locked/completed nodes.

import { SkillIcon, CheckIcon } from "./icons";

export type TopicIconKey = "books" | "bulb" | "search" | "calculator" | "chart";

export const TOPIC_BADGE_KEYS: TopicIconKey[] = ["books", "bulb", "search", "calculator", "chart"];

// Every icon key the skill-tree generator can pick (see icons.tsx's SkillIcon dispatcher),
// mapped to a pastel background + matching foreground color.
const ICON_TINTS: Record<string, { bg: string; color: string }> = {
  heart: { bg: "var(--heart-soft)", color: "var(--heart)" },
  lightbulb: { bg: "var(--gold-soft)", color: "var(--gold)" },
  lock: { bg: "var(--paper)", color: "var(--gray-400)" },
  thumb: { bg: "var(--success-soft)", color: "var(--success)" },
  star: { bg: "var(--gold-soft)", color: "var(--gold)" },
  badge: { bg: "var(--accent-soft)", color: "var(--accent)" },
  flame: { bg: "var(--overdue-soft)", color: "var(--overdue)" },
  compass: { bg: "var(--accent-soft)", color: "var(--accent)" },
  book: { bg: "var(--badge-blue-bg)", color: "var(--badge-blue-text)" },
  gear: { bg: "var(--paper)", color: "var(--gray-600)" },
  notes: { bg: "var(--info-soft)", color: "var(--info)" },
  calculator: { bg: "var(--info-soft)", color: "var(--info)" },
  trophy: { bg: "var(--gold-soft)", color: "var(--gold)" },
  bulb: { bg: "var(--gold-soft)", color: "var(--gold)" },
  books: { bg: "var(--info-soft)", color: "var(--info)" },
  search: { bg: "var(--accent-soft)", color: "var(--accent)" },
  chart: { bg: "var(--overdue-soft)", color: "var(--overdue)" },
};

const DEFAULT_TINT = { bg: "var(--accent-soft)", color: "var(--accent)" };

export interface SkillBadgeProps {
  icon: string;
  status: "LOCKED" | "UNLOCKED" | "IN_PROGRESS" | "COMPLETED";
  size?: number;
  className?: string;
}

/** Renders the icon chip for a skill-tree node, with a corner indicator for locked/completed. */
export function SkillBadge({ icon, status, size = 48, className = "" }: SkillBadgeProps) {
  const isLocked = status === "LOCKED";
  const isCompleted = status === "COMPLETED";
  const tint = isLocked ? { bg: "var(--paper)", color: "var(--gray-400)" } : (ICON_TINTS[icon] ?? DEFAULT_TINT);

  return (
    <div className={`relative inline-flex shrink-0 ${className}`} style={{ width: size, height: size }}>
      <div
        className="w-full h-full flex items-center justify-center rounded-[var(--radius-xl)]"
        style={{ backgroundColor: tint.bg, color: tint.color }}
      >
        <SkillIcon icon={isLocked ? "lock" : icon} size={size * 0.46} />
      </div>
      {isCompleted && (
        <span
          className="absolute -bottom-1 -end-1 flex items-center justify-center rounded-full border-2 border-[var(--card-bg)]"
          style={{ width: size * 0.4, height: size * 0.4, backgroundColor: "var(--success)" }}
        >
          <CheckIcon size={size * 0.24} className="text-white" />
        </span>
      )}
    </div>
  );
}
