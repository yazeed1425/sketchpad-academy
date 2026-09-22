"use client";

import { HeartIcon } from "./icons";

export function HeartsRow({ hearts, max, size = 24 }: { hearts: number; max: number; size?: number }) {
  return (
    <div className="flex gap-1" aria-label={`${hearts} of ${max} hearts remaining`}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={i < hearts ? "text-[var(--heart)]" : "text-[var(--ink-faint)]"}>
          <HeartIcon size={size} filled={i < hearts} />
        </span>
      ))}
    </div>
  );
}
