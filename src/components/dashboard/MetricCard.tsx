"use client";

import type { IconProps } from "@/components/ui/icons";

export function MetricCard({
  label,
  value,
  icon: Icon,
  bg,
  color,
}: {
  label: string;
  value: string;
  icon: (props: IconProps) => React.ReactElement;
  bg: string;
  color: string;
}) {
  return (
    <div className="metric-card">
      <div className="mb-3 w-11 h-11 rounded-full flex items-center justify-center" style={{ background: bg, color }}>
        <Icon size={20} className="shrink-0" />
      </div>
      <p className="text-xs font-medium text-[var(--ink-soft)] mb-0.5">{label}</p>
      <p className="font-display text-lg text-[var(--ink)]">{value}</p>
    </div>
  );
}
