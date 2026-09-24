"use client";

import { GaugeChart } from "./GaugeChart";
import { MapIcon, ActivityIcon } from "@/components/ui/icons";
import type { TreeSkillNode } from "@/lib/hooks/useSkillTree";
import { useLocale } from "@/lib/i18n/LocaleProvider";

function weeklyFocus(nodes: TreeSkillNode[]): string | null {
  const incomplete = nodes.filter((n) => n.status !== "COMPLETED" && n.milestone);
  if (incomplete.length === 0) return null;
  const next = [...incomplete].sort((a, b) => a.tier - b.tier)[0];
  return next.milestone!.title;
}

export function PathBanner({
  pathTitle,
  completedCount,
  skillCount,
  nodes,
}: {
  pathTitle: string;
  completedCount: number;
  skillCount: number;
  nodes: TreeSkillNode[];
}) {
  const { t, locale } = useLocale();
  const focus = weeklyFocus(nodes);
  const pct = skillCount > 0 ? (completedCount / skillCount) * 100 : 0;

  return (
    <div
      className="rounded-[var(--radius-4xl)] p-5 sm:p-6 mb-5 flex flex-wrap items-center justify-between gap-4"
      style={{
        background: "linear-gradient(135deg, var(--accent-soft) 0%, var(--badge-blue-bg) 100%)",
        border: "1px solid var(--badge-blue-border)",
      }}
    >
      <div className="min-w-0">
        <h2 className="font-display text-xl sm:text-2xl mb-2 flex items-center gap-2 text-[var(--ink)]">
          <MapIcon size={20} className="text-[var(--accent)] shrink-0" />
          {pathTitle}
        </h2>
        {focus && (
          <div className="flex items-center gap-1.5 text-sm text-[var(--ink-soft)]">
            <ActivityIcon size={14} className="text-[var(--success)] shrink-0" />
            {t("dashboard.weeklyFocus", { topic: focus })}
          </div>
        )}
      </div>
      <div className="text-center shrink-0">
        <GaugeChart value={pct} locale={locale} />
        <p className="text-xs text-[var(--ink-soft)] mt-1">{t("dashboard.pathComplete")}</p>
      </div>
    </div>
  );
}
