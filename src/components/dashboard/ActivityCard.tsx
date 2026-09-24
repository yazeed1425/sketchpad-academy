"use client";

import { Card } from "@/components/ui/Card";
import { ActivityIcon, CheckIcon, TrophyIcon } from "@/components/ui/icons";
import type { TreeSkillNode } from "@/lib/hooks/useSkillTree";
import type { Badge } from "@/lib/hooks/useGameData";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface ActivityEntry {
  key: string;
  label: string;
  title: string;
  time: string;
  Icon: typeof CheckIcon;
  color: string;
}

export function ActivityCard({ nodes, badges }: { nodes: TreeSkillNode[]; badges: Badge[] }) {
  const { t, locale } = useLocale();

  const entries: ActivityEntry[] = [
    ...nodes
      .filter((n) => n.status === "COMPLETED" && n.completedAt)
      .map((n) => ({
        key: `skill-${n.id}`,
        label: t("dashboard.completedSkill"),
        title: n.title,
        time: n.completedAt!,
        Icon: CheckIcon,
        color: "var(--success)",
      })),
    ...badges
      .filter((b) => b.earned && b.earnedAt)
      .map((b) => ({
        key: `badge-${b.id}`,
        label: t("dashboard.earnedBadge"),
        title: b.title,
        time: b.earnedAt!,
        Icon: TrophyIcon,
        color: "var(--gold)",
      })),
  ]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 4);

  return (
    <Card padding="p-5">
      <h3 className="font-display text-sm mb-3 flex items-center gap-2 text-[var(--ink)]">
        <ActivityIcon size={14} className="text-[var(--accent)]" />
        {t("dashboard.recentActivity")}
      </h3>
      {entries.length === 0 ? (
        <p className="text-xs text-[var(--ink-soft)]">{t("dashboard.noActivityYet")}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {entries.map((e) => (
            <div key={e.key} className="flex items-start gap-2.5">
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "var(--accent-soft)", color: e.color }}
              >
                <e.Icon size={13} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[var(--ink-soft)]">
                  {e.label} <span className="text-[var(--ink)] font-medium">{e.title}</span>
                </p>
                <p className="text-[11px] text-[var(--ink-faint)]">
                  {new Date(e.time).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", { month: "short", day: "numeric" })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
