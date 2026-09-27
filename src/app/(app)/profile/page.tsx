"use client";

import { Card } from "@/components/ui/Card";
import { XpBar } from "@/components/ui/XpBar";
import { StreakCalendar } from "@/components/dashboard/StreakCalendar";
import { SubjectProgressCard } from "@/components/dashboard/SubjectProgressCard";
import { SkillIcon, GearIcon, StarIcon } from "@/components/ui/icons";
import { useProfile } from "@/lib/hooks/useProfile";
import { useBadges, usePaths } from "@/lib/hooks/useGameData";
import { useSkillTree } from "@/lib/hooks/useSkillTree";
import { apiPatch } from "@/lib/hooks/useApi";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import { formatNumber } from "@/lib/i18n/translations";

export default function ProfilePage() {
  const { profile, isLoading, mutate: refreshProfile } = useProfile();
  const { badges } = useBadges();
  const { paths } = usePaths();
  const activePath = paths.find((p) => p.enrolled);
  const { nodes } = useSkillTree(activePath?.id ?? "");
  const { t, locale } = useTranslation();

  if (isLoading || !profile) return <p>{t("profile.loading")}</p>;

  const earned = badges.filter((b) => b.earned);
  const locked = badges.filter((b) => !b.earned);

  async function toggleLeaderboardAnonymous() {
    if (!profile) return;
    const next = !profile.leaderboardAnonymous;
    await refreshProfile(async () => {
      await apiPatch("/api/profile", { leaderboardAnonymous: next });
      return { ...profile, leaderboardAnonymous: next };
    }, { optimisticData: { ...profile, leaderboardAnonymous: next }, revalidate: false });
  }

  return (
    <div className="space-y-6">
      <Card>
        <h1 className="font-display text-3xl">{profile.name}</h1>
        <p className="text-[var(--ink-soft)] mb-3">{t("profile.levelXp", { level: profile.level, xp: profile.totalXp })}</p>
        <XpBar value={profile.xpIntoLevel} max={profile.xpForNextLevel} />
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <p className="text-xs text-[var(--ink-faint)]">{t("profile.currentStreak")}</p>
            <p className="font-display text-2xl">{t("dashboard.days", { count: profile.currentStreak })}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--ink-faint)]">{t("profile.bestStreak")}</p>
            <p className="font-display text-2xl">{t("dashboard.days", { count: profile.bestStreak })}</p>
          </div>
        </div>
        <div className="mt-4">
          <StreakCalendar days={profile.calendar} />
        </div>
      </Card>

      {activePath && nodes.length > 0 && (
        <div>
          <h2 className="font-display text-xl mb-3">{t("profile.masteryTracker")}</h2>
          <p className="text-sm text-[var(--ink-soft)] mb-3">{t("profile.masteryTrackerHint")}</p>
          <SubjectProgressCard nodes={nodes} />
          {profile.weakTopicsMastered > 0 && (
            <div className="mt-3 flex items-center gap-2 rounded-xl p-3 bg-[var(--success-soft)] text-[var(--success)]">
              <StarIcon size={18} />
              <p className="text-sm font-display">{t("profile.weakTopicsMastered", { count: profile.weakTopicsMastered })}</p>
            </div>
          )}
        </div>
      )}

      <Card>
        <h2 className="font-display text-xl mb-3 flex items-center gap-2">
          <GearIcon size={18} className="text-[var(--ink-soft)]" />
          {t("profile.privacy")}
        </h2>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-display text-[var(--ink)]">{t("profile.leaderboardAnonymous")}</p>
            <p className="text-xs text-[var(--ink-faint)]">{t("profile.leaderboardAnonymousHint")}</p>
          </div>
          <button
            role="switch"
            aria-checked={profile.leaderboardAnonymous}
            onClick={toggleLeaderboardAnonymous}
            className={`shrink-0 w-11 h-6 rounded-full relative transition-colors cursor-pointer ${
              profile.leaderboardAnonymous ? "bg-[var(--accent)]" : "bg-[var(--border-primary)]"
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                profile.leaderboardAnonymous ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      </Card>

      <Card>
        <h2 className="font-display text-xl mb-3">
          {t("profile.badges")}{" "}
          <span className="text-sm text-[var(--ink-faint)] font-body">
            ({formatNumber(earned.length, locale)}/{formatNumber(badges.length, locale)})
          </span>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {earned.map((b) => (
            <div
              key={b.id}
              className="border border-[var(--gold)]/30 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 transition-all rounded-xl p-3 text-center bg-[var(--gold-soft)] animate-pop-in"
            >
              <span className="text-[var(--gold)] inline-block mb-1">
                <SkillIcon icon={b.icon} size={28} />
              </span>
              <p className="font-display text-sm leading-tight">{b.title}</p>
            </div>
          ))}
          {locked.map((b) => (
            <div key={b.id} className="border border-dashed border-[var(--border-primary)] rounded-xl p-3 text-center opacity-60">
              <span className="text-[var(--ink-faint)] inline-block mb-1">
                <SkillIcon icon={b.icon} size={28} />
              </span>
              <p className="font-display text-sm leading-tight text-[var(--ink-faint)]">{b.title}</p>
              <p className="text-[10px] text-[var(--ink-faint)] mt-1">{b.description}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
