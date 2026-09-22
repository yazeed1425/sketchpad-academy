"use client";

import { Card } from "@/components/ui/Card";
import { useLeague } from "@/lib/hooks/useGameData";
import { StarIcon } from "@/components/ui/icons";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import type { TranslationKey } from "@/lib/i18n/translations";

const TIER_COLOR: Record<string, string> = {
  BRONZE: "var(--tier-bronze)",
  SILVER: "var(--tier-silver)",
  GOLD: "var(--tier-gold)",
  DIAMOND: "var(--tier-diamond)",
};

export default function LeaguesPage() {
  const { league, isLoading } = useLeague();
  const { t } = useTranslation();

  if (isLoading || !league) return <p>{t("leagues.loading")}</p>;

  const n = league.members.length;
  const promoteCount = Math.max(1, Math.round(n * 0.2));
  const demoteCount = Math.max(1, Math.round(n * 0.2));
  const tierName = t(`leagues.tier.${league.tier}` as TranslationKey);

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-2 mb-1">
        <span style={{ color: TIER_COLOR[league.tier] }}>
          <StarIcon size={28} />
        </span>
        <h1 className="font-display text-3xl">{t("leagues.title", { tier: tierName })}</h1>
      </div>
      <p className="text-sm text-[var(--ink-soft)] mb-6">
        {t("leagues.weekInfo", { week: league.weekId, promote: promoteCount, demote: demoteCount })}
      </p>

      <Card padding="p-0">
        <ul>
          {league.members.map((m, i) => {
            const zone = i < promoteCount ? "promote" : i >= n - demoteCount ? "demote" : null;
            return (
              <li
                key={m.userId}
                className={`flex items-center gap-3 px-4 py-3 border-b border-[var(--ink-faint)]/30 last:border-b-0 ${
                  m.isMe ? "bg-[var(--accent-soft)]" : ""
                }`}
              >
                <span
                  className={`font-display w-7 h-7 rounded-full border border-[var(--ink-soft)] flex items-center justify-center text-sm shrink-0 ${
                    zone === "promote" ? "bg-[var(--success-soft)]" : zone === "demote" ? "bg-[var(--heart-soft)]" : ""
                  }`}
                >
                  {m.rank}
                </span>
                <span className={`flex-1 ${m.isMe ? "font-display" : ""}`}>{m.name}</span>
                <span className="text-sm text-[var(--ink-soft)]">{t("leagues.xp", { xp: m.weeklyXp })}</span>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
