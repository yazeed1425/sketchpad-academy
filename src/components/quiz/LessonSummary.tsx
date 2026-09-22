"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { RoughButton } from "@/components/ui/RoughButton";
import { StarIcon, FlameIcon, BadgeIcon } from "@/components/ui/icons";
import { useTranslation } from "@/lib/i18n/LocaleProvider";

export interface LessonCompleteResult {
  scorePct: number;
  xpEarned: number;
  heartsLost: number;
  heartsRemaining: number;
  leveledUp: boolean;
  newLevel?: number;
  streak?: { currentStreak: number; bestStreak: number };
  skillCompleted: boolean;
  unlockedSkillIds: string[];
  newBadges: { id: string; title: string; icon: string }[];
}

export function LessonSummary({ result, pathId }: { result: LessonCompleteResult; pathId: string }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      {result.leveledUp && (
        <motion.div
          initial={{ scale: 0.5, opacity: 0, rotate: -6 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 14 }}
        >
          <Card className="text-center bg-[var(--gold-soft)]">
            <p className="font-display text-lg text-[var(--ink-soft)]">{t("lesson.levelUp")}</p>
            <p className="font-display text-4xl">{t("lesson.levelN", { level: result.newLevel ?? "" })}</p>
          </Card>
        </motion.div>
      )}

      <Card className="text-center animate-pop-in">
        <p className="font-display text-3xl mb-1">{t("lesson.percentCorrect", { pct: result.scorePct })}</p>
        <p className="text-[var(--accent)] font-display text-xl mb-3">{t("lesson.xpEarned", { xp: result.xpEarned })}</p>

        {result.skillCompleted && (
          <p className="text-sm text-[var(--success)] flex items-center justify-center gap-1 mb-1">
            <StarIcon size={16} /> {t("lesson.skillCompleted")}
          </p>
        )}
        {result.unlockedSkillIds.length > 0 && (
          <p className="text-sm text-[var(--ink-soft)] mb-1">
            {t("lesson.skillsUnlocked", { count: result.unlockedSkillIds.length })}
          </p>
        )}
        {result.streak && (
          <p className="text-sm text-[var(--gold)] flex items-center justify-center gap-1 mb-1">
            <FlameIcon size={16} /> {t("lesson.dayStreak", { count: result.streak.currentStreak })}
          </p>
        )}
        {result.heartsLost > 0 && <p className="text-sm text-[var(--heart)]">{t("lesson.heartsLost", { count: result.heartsLost })}</p>}

        {result.newBadges.length > 0 && (
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {result.newBadges.map((b) => (
              <span
                key={b.id}
                className="flex items-center gap-1 text-xs border border-[var(--ink-soft)] rounded-full px-2 py-1 bg-[var(--gold-soft)] animate-pop-in"
              >
                <BadgeIcon size={14} /> {b.title}
              </span>
            ))}
          </div>
        )}
      </Card>

      <Link href={`/paths/${pathId}/tree`}>
        <RoughButton fullWidth>{t("tree.backToTree")}</RoughButton>
      </Link>
    </div>
  );
}
