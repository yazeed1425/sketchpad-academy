"use client";

import { CircleIcon, CheckIcon } from "@/components/ui/icons";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { formatNumber } from "@/lib/i18n/translations";

export function WeekBanner({
  title,
  done,
  total,
  hasActive,
}: {
  title: string;
  done: number;
  total: number;
  hasActive: boolean;
}) {
  const { t, locale } = useLocale();
  const complete = done === total;

  return (
    <div className="flex items-center gap-3 mb-4">
      <div
        className="flex items-center gap-1.5 px-4 py-1.5 rounded-full border shrink-0"
        style={{
          background: hasActive ? "var(--accent-soft)" : complete ? "var(--success-soft)" : "var(--paper)",
          borderColor: hasActive ? "var(--badge-blue-border)" : complete ? "var(--success)" : "var(--border-secondary)",
        }}
      >
        <span className="font-display text-sm font-semibold" style={{ color: hasActive ? "var(--accent)" : complete ? "var(--success)" : "var(--ink-soft)" }}>
          {title}
        </span>
        {hasActive && <CircleIcon size={7} className="text-[var(--accent)]" />}
        {complete && <CheckIcon size={12} className="text-[var(--success)]" />}
      </div>
      <div className="flex-1 h-px bg-[var(--border-secondary)]" />
      <span className="text-xs text-[var(--ink-faint)] shrink-0">{t("tree.weekOf", { done: formatNumber(done, locale), total: formatNumber(total, locale) })}</span>
    </div>
  );
}
