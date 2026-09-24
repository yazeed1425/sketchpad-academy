"use client";

import { formatNumber, type Locale } from "@/lib/i18n/translations";

export function GaugeChart({ value, size = 112, locale = "en" }: { value: number; size?: number; locale?: Locale }) {
  const r = size * 0.375;
  const cx = size / 2;
  const cy = size / 2;
  const half = Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const filled = (pct / 100) * half;
  const pathD = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;

  return (
    <svg width={size} height={size * 0.64} viewBox={`0 0 ${size} ${size * 0.64}`}>
      <path d={pathD} fill="none" stroke="var(--border-secondary)" strokeWidth={size * 0.09} strokeLinecap="round" />
      <path
        d={pathD}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={size * 0.09}
        strokeLinecap="round"
        strokeDasharray={`${filled} ${half}`}
        style={{ transition: "stroke-dasharray 0.8s ease" }}
      />
      <text x={cx} y={cy * 0.95} textAnchor="middle" fontSize={size * 0.18} fontWeight={600} fill="var(--ink)" className="font-display">
        {formatNumber(Math.round(pct), locale)}%
      </text>
    </svg>
  );
}
