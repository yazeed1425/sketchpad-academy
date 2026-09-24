"use client";

import { use, useMemo } from "react";
import { useSkillTree, type TreeSkillNode } from "@/lib/hooks/useSkillTree";
import { usePaths } from "@/lib/hooks/useGameData";
import { WeekBanner } from "@/components/roadmap/WeekBanner";
import { NodeCard } from "@/components/roadmap/NodeCard";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import { formatNumber } from "@/lib/i18n/translations";

export default function SkillTreePage({ params }: { params: Promise<{ pathId: string }> }) {
  const { pathId } = use(params);
  const { nodes, isLoading } = useSkillTree(pathId);
  const { paths } = usePaths();
  const { t, locale } = useTranslation();

  const path = paths.find((p) => p.id === pathId);

  const ordered = useMemo(() => [...nodes].sort((a, b) => a.tier - b.tier || a.col - b.col), [nodes]);

  // Groups skills by milestone (each one a week of the plan), in the order each milestone is
  // first encountered — `ordered` is already tier-sorted and every generator assigns each
  // milestone a contiguous tier range, so this reproduces the weeks' real order.
  const weekGroups = useMemo(() => {
    const groups: { milestone: TreeSkillNode["milestone"]; skills: TreeSkillNode[] }[] = [];
    const indexByKey = new Map<string, number>();
    for (const skill of ordered) {
      const key = skill.milestone?.id ?? "__none__";
      let i = indexByKey.get(key);
      if (i === undefined) {
        i = groups.length;
        indexByKey.set(key, i);
        groups.push({ milestone: skill.milestone, skills: [] });
      }
      groups[i].skills.push(skill);
    }
    return groups;
  }, [ordered]);

  if (isLoading) return <p className="text-[var(--ink-soft)]">{t("tree.loading")}</p>;
  if (ordered.length === 0) return <p className="text-[var(--ink-soft)]">{t("tree.empty")}</p>;

  const completedCount = ordered.filter((n) => n.status === "COMPLETED").length;
  const pct = ordered.length > 0 ? Math.round((completedCount / ordered.length) * 100) : 0;

  return (
    <div>
      <div className="rounded-[var(--radius-4xl)] border border-[var(--border-secondary)] px-5 py-4 sm:px-6 sm:py-5 mb-6">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="min-w-0">
            <h1 className="font-display text-lg sm:text-xl text-[var(--ink)] mb-1 truncate">{path?.title ?? ""}</h1>
            <p className="text-xs sm:text-sm text-[var(--ink-soft)]">
              {t("tree.subtitle", { weeks: formatNumber(weekGroups.length, locale), skills: formatNumber(ordered.length, locale) })}
            </p>
          </div>
          <div className="text-end shrink-0">
            <p className="font-display text-2xl text-[var(--ink)]">{formatNumber(pct, locale)}{locale === "ar" ? "٪" : "%"}</p>
            <p className="text-[11px] text-[var(--ink-faint)]">{t("tree.overallProgress")}</p>
          </div>
        </div>
        <div className="h-2.5 rounded-full bg-[var(--border-secondary)] overflow-hidden">
          <div
            className="h-full rounded-full transition-[width] duration-1000"
            style={{ width: `${pct}%`, background: "linear-gradient(90deg, var(--accent), var(--success))" }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-8">
        {weekGroups.map((group, groupIndex) => {
          const done = group.skills.filter((s) => s.status === "COMPLETED").length;
          const hasActive = group.skills.some((s) => s.status === "UNLOCKED" || s.status === "IN_PROGRESS");
          return (
            <div key={group.milestone?.id ?? groupIndex}>
              <WeekBanner title={group.milestone?.title ?? ""} done={done} total={group.skills.length} hasActive={hasActive} />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {group.skills.map((skill) => (
                  <NodeCard key={skill.id} skill={skill} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
