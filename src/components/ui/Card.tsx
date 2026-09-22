"use client";

export function Card({
  children,
  className = "",
  padding = "p-5",
}: {
  children: React.ReactNode;
  className?: string;
  padding?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-[var(--ink-faint)]/30 bg-[var(--card-bg)] shadow-[var(--shadow-sm)] transition-shadow ${className}`}
    >
      <div className={padding}>{children}</div>
    </div>
  );
}
