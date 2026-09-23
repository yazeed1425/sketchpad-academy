"use client";

import { Card } from "@/components/ui/Card";
import { XpBar } from "@/components/ui/XpBar";
import { StreakCalendar } from "@/components/dashboard/StreakCalendar";
import { SkillIcon } from "@/components/ui/icons";
import { useProfile } from "@/lib/hooks/useProfile";
import { useBadges } from "@/lib/hooks/useGameData";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import { formatNumber } from "@/lib/i18n/translations";

export default function ProfilePage() {
  const { profile, isLoading } = useProfile();
  const { badges } = useBadges();
  const { t, locale } = useTranslation();

  if (isLoading || !profile) return <p>{t("profile.loading")}</p>;

  const earned = badges.filter((b) => b.earned);
  const locked = badges.filter((b) => !b.earned);

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
