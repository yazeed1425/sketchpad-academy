"use client";

export function Card({
  children,
  className = "",
  padding = "p-5",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  padding?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`rounded-[var(--radius-4xl)] border border-[var(--border-secondary)] bg-[var(--card-bg)] shadow-[var(--shadow-sm)] transition-shadow ${className}`}
      style={style}
    >
      <div className={padding}>{children}</div>
    </div>
  );
}
