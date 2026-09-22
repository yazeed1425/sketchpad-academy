"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { XpBar } from "@/components/ui/XpBar";
import { PathTrail } from "@/components/dashboard/PathTrail";
import { StreakCalendar } from "@/components/dashboard/StreakCalendar";
import { useProfile } from "@/lib/hooks/useProfile";
import { useDailyQuests, usePaths } from "@/lib/hooks/useGameData";
import { CheckIcon, FlameIcon, StarIcon } from "@/components/ui/icons";
import { useTranslation } from "@/lib/i18n/LocaleProvider";

export default function DashboardPage() {
  const { profile, isLoading } = useProfile();
  const { quests } = useDailyQuests();
  const { paths, isLoading: pathsLoading } = usePaths();
  const { t } = useTranslation();

  if (isLoading || pathsLoading || !profile) return <p className="text-[var(--ink-soft)]">{t("dashboard.loading")}</p>;

  const activePath = paths.find((p) => p.enrolled);

  if (!activePath) {
    return (
      <Card className="max-w-md mx-auto text-center">
        <p className="text-sm text-[var(--ink-soft)] mb-3">{t("dashboard.noPathYet")}</p>
        <Link href="/paths" className="text-[var(--accent)] underline">
          {t("dashboard.pickOne")}
        </Link>
      </Card>
    );
  }

  return (
    <div className="grid lg:grid-cols-[1fr_300px] gap-6 items-start">
      <div>
        <h1 className="font-display text-2xl mb-4 text-center">{activePath.title}</h1>
        <PathTrail pathId={activePath.id} />
      </div>

      <div className="space-y-4">
        <Card>
          <p className="text-sm text-[var(--ink-soft)] flex items-center gap-1 mb-2">
            <FlameIcon size={16} /> {t("dashboard.streak")}
          </p>
          <p className="font-display text-2xl mb-2">
            {t(profile.currentStreak === 1 ? "dashboard.day" : "dashboard.days", { count: profile.currentStreak })}
          </p>
          <StreakCalendar days={profile.calendar} />
        </Card>

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

        {paths.filter((p) => p.enrolled && p.id !== activePath.id).length > 0 && (
          <Card>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-display text-lg">{t("dashboard.continueLearning")}</h2>
              <Link href="/paths" className="text-xs text-[var(--accent)] underline">
                {t("dashboard.browseAll")}
              </Link>
            </div>
            <div className="space-y-2">
              {paths
                .filter((p) => p.enrolled && p.id !== activePath.id)
                .map((p) => (
                  <Link key={p.id} href={`/paths/${p.id}`} className="block text-sm text-[var(--ink-soft)] hover:text-[var(--accent)]">
                    {p.title} — {t("dashboard.skillsComplete", { done: p.completedCount, total: p.skillCount })}
                  </Link>
                ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
