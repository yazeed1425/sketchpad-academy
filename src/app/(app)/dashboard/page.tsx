"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { RoughButton } from "@/components/ui/RoughButton";
import { XpBar } from "@/components/ui/XpBar";
import { PathBanner } from "@/components/dashboard/PathBanner";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { SubjectProgressCard } from "@/components/dashboard/SubjectProgressCard";
import { TodayTasksCard } from "@/components/dashboard/TodayTasksCard";
import { StreakCalendar } from "@/components/dashboard/StreakCalendar";
import { ActivityCard } from "@/components/dashboard/ActivityCard";
import { useProfile } from "@/lib/hooks/useProfile";
import { useDailyQuests, usePaths, useBadges } from "@/lib/hooks/useGameData";
import { useSkillTree } from "@/lib/hooks/useSkillTree";
import { CheckIcon, ClockIcon, FlameIcon, ZapIcon, MapIcon } from "@/components/ui/icons";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import { formatNumber } from "@/lib/i18n/translations";

export default function DashboardPage() {
  const { profile, isLoading } = useProfile();
  const { quests } = useDailyQuests();
  const { paths, isLoading: pathsLoading } = usePaths();
  const { t, locale } = useTranslation();

  const activePath = paths.find((p) => p.enrolled);
  const { nodes } = useSkillTree(activePath?.id ?? "");
  const { badges } = useBadges();

  if (isLoading || pathsLoading || !profile) return <p className="text-[var(--ink-soft)]">{t("dashboard.loading")}</p>;

  if (!activePath) {
    return (
      <div className="max-w-md mx-auto space-y-4">
        <Card className="text-center">
          <p className="text-sm text-[var(--ink-soft)] mb-3">{t("dashboard.noPathYet")}</p>
          <Link href="/paths" className="text-[var(--accent)] underline">
            {t("dashboard.pickOne")}
          </Link>
        </Card>
        <Link href="/diagnostic">
          <Card className="text-center bg-[var(--accent-soft)] hover:-translate-y-0.5 transition-transform">
            <h2 className="font-display text-lg mb-1">{t("dashboard.takePlacementTitle")}</h2>
            <p className="text-sm text-[var(--ink-soft)] mb-3">{t("dashboard.takePlacementBody")}</p>
            <span className="text-[var(--accent)] font-display underline">{t("dashboard.takePlacement")}</span>
          </Card>
        </Link>
      </div>
    );
  }

  const nextNode = [...nodes]
    .filter((n) => (n.status === "UNLOCKED" || n.status === "IN_PROGRESS") && n.lessons.length > 0)
    .sort((a, b) => a.tier - b.tier || a.col - b.col)[0];
  const nextLessonHref = nextNode ? `/lesson/${nextNode.lessons[0].id}` : null;

  const questsToday = `${formatNumber(quests.filter((q) => q.completed).length, locale)}/${formatNumber(quests.length, locale)}`;
  const roadmapHref = `/paths/${activePath.id}/tree`;

  return (
    <div>
      <PathBanner pathTitle={activePath.title} completedCount={activePath.completedCount} skillCount={activePath.skillCount} nodes={nodes} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <MetricCard
          label={t("dashboard.metricSkills")}
          value={`${formatNumber(activePath.completedCount, locale)}/${formatNumber(activePath.skillCount, locale)}`}
          icon={CheckIcon}
          bg="var(--success-soft)"
          color="var(--success)"
        />
        <MetricCard
          label={t("dashboard.metricStreak")}
          value={t(profile.currentStreak === 1 ? "dashboard.day" : "dashboard.days", { count: profile.currentStreak })}
          icon={FlameIcon}
          bg="var(--overdue-soft)"
          color="var(--overdue)"
        />
        <MetricCard label={t("dashboard.metricXp")} value={formatNumber(profile.totalXp, locale)} icon={ZapIcon} bg="var(--accent-soft)" color="var(--accent)" />
        <MetricCard label={t("dashboard.metricQuests")} value={questsToday} icon={ClockIcon} bg="var(--info-soft)" color="var(--info)" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">
        <div className="flex flex-col gap-5 min-w-0">
          <SubjectProgressCard nodes={nodes} />
          <TodayTasksCard quests={quests} nextLessonHref={nextLessonHref} />
        </div>

        <div className="flex flex-col gap-4">
          <Card padding="p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-[var(--ink-soft)] mb-0.5">{t("dashboard.level", { level: profile.level })}</p>
                <p className="text-xs text-[var(--ink-faint)]">{t("dashboard.xpTotal", { xp: formatNumber(profile.totalXp, locale) })}</p>
              </div>
              <span className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "var(--gold-soft)", color: "var(--gold)" }}>
                <FlameIcon size={20} />
              </span>
            </div>
            <XpBar value={profile.xpIntoLevel} max={profile.xpForNextLevel} height={8} fillColor="var(--gold)" />
          </Card>

          <Card padding="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="font-display text-sm text-[var(--ink)]">{t("dashboard.streak")}</span>
              <div className="flex items-center gap-1">
                <FlameIcon size={16} className="text-[var(--overdue)]" />
                <span className="font-display text-sm font-bold text-[var(--overdue)]">
                  {t(profile.currentStreak === 1 ? "dashboard.day" : "dashboard.days", { count: profile.currentStreak })}
                </span>
              </div>
            </div>
            <StreakCalendar days={profile.calendar} />
          </Card>

          <ActivityCard nodes={nodes} badges={badges} />

          <Link href={roadmapHref}>
            <RoughButton fullWidth className="flex items-center justify-center gap-2">
              <MapIcon size={16} />
              {t("dashboard.viewRoadmap")}
            </RoughButton>
          </Link>
        </div>
      </div>
    </div>
  );
}
