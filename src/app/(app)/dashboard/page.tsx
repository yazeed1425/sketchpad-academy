"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { XpBar } from "@/components/ui/XpBar";
import { HeartsRow } from "@/components/ui/HeartsRow";
import { RoughButton } from "@/components/ui/RoughButton";
import { StreakCalendar } from "@/components/dashboard/StreakCalendar";
import { HeartRegenTimer } from "@/components/dashboard/HeartRegenTimer";
import { useProfile } from "@/lib/hooks/useProfile";
import { useDailyQuests, usePaths } from "@/lib/hooks/useGameData";
import { CheckIcon, FlameIcon, StarIcon } from "@/components/ui/icons";
import { useTranslation } from "@/lib/i18n/LocaleProvider";

export default function DashboardPage() {
  const { profile, isLoading } = useProfile();
  const { quests } = useDailyQuests();
  const { paths } = usePaths();
  const { t } = useTranslation();

  if (isLoading || !profile) return <p className="text-[var(--ink-soft)]">{t("dashboard.loading")}</p>;

  const enrolledPaths = paths.filter((p) => p.enrolled);

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <p className="text-sm font-display text-[var(--info)]">{t("dashboard.level", { level: profile.level })}</p>
          <p className="font-display text-2xl mb-2">{t("dashboard.xpTotal", { xp: profile.totalXp })}</p>
          <XpBar value={profile.xpIntoLevel} max={profile.xpForNextLevel} />
          <p className="text-xs text-[var(--ink-faint)] mt-1">
            {t("dashboard.toNextLevel", { into: profile.xpIntoLevel, total: profile.xpForNextLevel, level: profile.level + 1 })}
          </p>
        </Card>

        <Card>
          <p className="text-sm text-[var(--ink-soft)] mb-2">{t("dashboard.hearts")}</p>
          <HeartsRow hearts={profile.hearts} max={profile.heartsMax} size={26} />
          <div className="mt-2">
            <HeartRegenTimer nextRegenAt={profile.nextRegenAt} hearts={profile.hearts} max={profile.heartsMax} />
          </div>
          {profile.hearts < profile.heartsMax && (
            <Link href="/practice" className="text-xs text-[var(--info)] underline">
              {t("dashboard.practiceToRecover")}
            </Link>
          )}
        </Card>

        <Card>
          <p className="text-sm text-[var(--ink-soft)] flex items-center gap-1">
            <FlameIcon size={16} /> {t("dashboard.streak")}
          </p>
          <p className="font-display text-2xl mb-2">
            {t(profile.currentStreak === 1 ? "dashboard.day" : "dashboard.days", { count: profile.currentStreak })}
          </p>
          <p className="text-xs text-[var(--ink-faint)] mb-2">{t("dashboard.best", { count: profile.bestStreak })}</p>
          <StreakCalendar days={profile.calendar} />
        </Card>
      </div>

      <Card>
        <h2 className="font-display text-xl mb-3 flex items-center gap-2">
          <StarIcon size={20} /> {t("dashboard.todaysQuests")}
        </h2>
        {quests.length === 0 ? (
          <p className="text-sm text-[var(--ink-soft)]">{t("dashboard.loadingQuests")}</p>
        ) : (
          <ul className="space-y-3">
            {quests.map((q) => (
              <li key={q.id} className="flex items-center gap-3">
                <span
                  className={`ink-wobble-sm w-7 h-7 rounded-full border-2 border-[var(--ink)] flex items-center justify-center shrink-0 ${
                    q.completed ? "bg-[var(--success-soft)] text-[var(--success)]" : "bg-transparent"
                  }`}
                >
                  {q.completed && <CheckIcon size={16} />}
                </span>
                <div className="flex-1">
                  <p className="text-sm">{q.description}</p>
                  <XpBar value={q.progress} max={q.target} height={10} fillColor="var(--gold)" />
                </div>
                <span className="text-xs text-[var(--ink-faint)] shrink-0">{t("quest.xpSuffix", { xp: q.xpReward })}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-xl">{t("dashboard.continueLearning")}</h2>
          <Link href="/paths" className="text-sm text-[var(--accent)] underline">
            {t("dashboard.browseAll")}
          </Link>
        </div>
        {enrolledPaths.length === 0 ? (
          <p className="text-sm text-[var(--ink-soft)]">
            {t("dashboard.noPathYet")}{" "}
            <Link href="/paths" className="text-[var(--accent)] underline">
              {t("dashboard.pickOne")}
            </Link>
            .
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {enrolledPaths.map((p) => (
              <div key={p.id} className="flex items-center justify-between border-2 border-[var(--ink)] rounded-xl p-3">
                <div>
                  <p className="font-display text-lg">{p.title}</p>
                  <p className="text-xs text-[var(--ink-faint)]">
                    {t("dashboard.skillsComplete", { done: p.completedCount, total: p.skillCount })}
                  </p>
                </div>
                <Link href={`/paths/${p.id}/tree`}>
                  <RoughButton variant="secondary">{t("dashboard.open")}</RoughButton>
                </Link>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
