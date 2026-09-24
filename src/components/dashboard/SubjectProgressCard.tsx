"use client";

import { Card } from "@/components/ui/Card";
import { TrendingUpIcon, HashIcon, BookIcon } from "@/components/ui/icons";
import { classifySkillDomain } from "@/lib/skillDomain";
import type { TreeSkillNode } from "@/lib/hooks/useSkillTree";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { formatNumber } from "@/lib/i18n/translations";

export function SubjectProgressCard({ nodes }: { nodes: TreeSkillNode[] }) {
  const { t, locale } = useLocale();

  const groups = [
    { key: "quantitative" as const, label: t("dashboard.quantitative"), Icon: HashIcon, color: "var(--accent)", bg: "var(--accent-soft)" },
    { key: "verbal" as const, label: t("dashboard.verbal"), Icon: BookIcon, color: "var(--info)", bg: "var(--info-soft)" },
  ].map((g) => {
    const inGroup = nodes.filter((n) => classifySkillDomain(n.title) === g.key);
    const done = inGroup.filter((n) => n.status === "COMPLETED").length;
    const pct = inGroup.length > 0 ? Math.round((done / inGroup.length) * 100) : 0;
    return { ...g, pct, done, total: inGroup.length };
  });

  return (
    <Card padding="p-5">
      <h3 className="font-display text-base mb-4 flex items-center gap-2 text-[var(--ink)]">
        <TrendingUpIcon size={16} className="text-[var(--accent)]" />
        {t("dashboard.subjectProgress")}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {groups.map((g) => (
          <div key={g.key} className="flex items-center gap-3 rounded-[var(--radius-xl)] border border-[var(--border-secondary)] p-3">
            <div className="w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center shrink-0" style={{ background: g.bg, color: g.color }}>
              <g.Icon size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-[var(--ink-soft)]">{g.label}</span>
                <span className="text-xs font-semibold text-[var(--ink)]">{formatNumber(g.pct, locale)}{locale === "ar" ? "٪" : "%"}</span>
              </div>
              <div className="h-1.5 rounded-full bg-[var(--border-secondary)] overflow-hidden">
                <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${g.pct}%`, background: g.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
