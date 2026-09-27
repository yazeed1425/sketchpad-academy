"use client";

import { Card } from "@/components/ui/Card";
import { RoughButton } from "@/components/ui/RoughButton";
import { XpBar } from "@/components/ui/XpBar";
import { CheckIcon } from "@/components/ui/icons";
import type { DailyQuest } from "@/lib/hooks/useGameData";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { formatNumber, type TranslationKey } from "@/lib/i18n/translations";
import { useRouter } from "next/navigation";

export function TodayTasksCard({ quests, nextLessonHref }: { quests: DailyQuest[]; nextLessonHref: string | null }) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const allDone = quests.length > 0 && quests.every((q) => q.completed);

  return (
    <Card padding="p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-base flex items-center gap-2 text-[var(--ink)]">
          <CheckIcon size={16} className="text-[var(--accent)]" />
          {t("dashboard.todaysQuests")}
        </h3>
        {quests.length > 0 && (
          <span className="badge-gray">
            {formatNumber(quests.filter((q) => q.completed).length, locale)}/{formatNumber(quests.length, locale)}
          </span>
        )}
      </div>

      {quests.length === 0 ? (
        <p className="text-sm text-[var(--ink-soft)]">{t("dashboard.loadingQuests")}</p>
      ) : (
        <div className="flex flex-col gap-2 mb-3">
          {quests.map((q) => (
            <div
              key={q.id}
              className="flex items-center gap-3 rounded-[var(--radius-xl)] p-3 border"
              style={{
                borderColor: q.completed ? "var(--success)" : "var(--border-secondary)",
                background: q.completed ? "var(--success-soft)" : "var(--card-bg)",
              }}
            >
              <span
                className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                style={{
                  borderColor: q.completed ? "var(--success)" : "var(--border-primary)",
                  background: q.completed ? "var(--success)" : "transparent",
                }}
              >
                {q.completed && <CheckIcon size={12} className="text-white" />}
              </span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${q.completed ? "text-[var(--ink-soft)] line-through" : "text-[var(--ink)]"}`}>
                  {t(`quest.type.${q.type}` as TranslationKey, { target: formatNumber(q.target, locale) })}
                </p>
                {!q.completed && <XpBar value={q.progress} max={q.target} height={6} fillColor="var(--gold)" className="mt-1.5" />}
              </div>
              <span className="badge-overdue shrink-0">{t("quest.xpSuffix", { xp: q.xpReward })}</span>
            </div>
          ))}
        </div>
      )}

      {allDone ? (
        <p className="text-sm text-[var(--success)] font-medium text-center">{t("dashboard.allCaughtUp")}</p>
      ) : (
        nextLessonHref && (
          <RoughButton fullWidth onClick={() => router.push(nextLessonHref)}>
            {t("dashboard.startNext")}
          </RoughButton>
        )
      )}
    </Card>
  );
}
