"use client";

export function XpBar({
  value,
  max,
  height = 22,
  className = "",
  fillColor = "var(--accent)",
}: {
  value: number;
  max: number;
  height?: number;
  className?: string;
  fillColor?: string;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;

  return (
    <div
      className={`relative w-full flex rounded-full border border-[var(--border-secondary)] overflow-hidden bg-transparent ${className}`}
      style={{ height }}
    >
      {pct > 0 && (
        <div
          className="h-full rounded-full transition-[width] duration-300 ease-out"
          style={{ width: `${pct * 100}%`, minWidth: 8, backgroundColor: fillColor }}
        />
      )}
    </div>
  );
}
