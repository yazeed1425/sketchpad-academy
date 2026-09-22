"use client";

import type { StreakCalendarDay } from "@/lib/gamification/streak";

export function StreakCalendar({ days }: { days: StreakCalendarDay[] }) {
  const weeks: StreakCalendarDay[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  return (
    <div className="flex gap-1 overflow-x-auto pb-1">
      {weeks.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-1">
          {week.map((day) => (
            <div
              key={day.date}
              title={day.date}
              className={`w-3.5 h-3.5 rounded-sm border ${
                day.active
                  ? "bg-[var(--accent)] border-[var(--ink-soft)]"
                  : "bg-transparent border-[var(--ink-faint)]"
              } ${day.isToday ? "ring-2 ring-[var(--gold)]" : ""}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
