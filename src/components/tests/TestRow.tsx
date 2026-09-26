"use client";

import { useState } from "react";
import Link from "next/link";
import { RoughButton } from "@/components/ui/RoughButton";
import { SkillBadge } from "@/components/ui/topicIcons";
import { GaugeChart } from "@/components/dashboard/GaugeChart";
import { CheckIcon, LockIcon, CircleIcon, PlayCircleIcon } from "@/components/ui/icons";
import { classifySkillDomain } from "@/lib/skillDomain";
import type { TreeSkillNode } from "@/lib/hooks/useSkillTree";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { formatNumber, type TranslationKey } from "@/lib/i18n/translations";

export type TestDifficulty = "EASY" | "MEDIUM" | "HARD";

export function TestRow({ skill, difficulty }: { skill: TreeSkillNode; difficulty: TestDifficulty }) {
  const [expanded, setExpanded] = useState(false);
  const { t, locale } = useLocale();

  const isLocked = skill.status === "LOCKED";
  const isCompleted = skill.status === "COMPLETED";
  const isActive = skill.status === "UNLOCKED" || skill.status === "IN_PROGRESS";
  const domain = classifySkillDomain(skill.title);
  const domainLabel = skill.domainLabel ?? (domain === "verbal" ? t("dashboard.verbal") : t("dashboard.quantitative"));
  const singleLesson = skill.lessons.length === 1 ? skill.lessons[0] : null;
  const difficultyKey = `diagnostic.difficulty.${difficulty}` as TranslationKey;

  return (
    <div
      className="rounded-[var(--radius-2xl)] p-4 flex flex-wrap items-center gap-4"
      style={{
        border: isCompleted ? "1px solid var(--success)" : "1px solid var(--border-secondary)",
        background: isCompleted ? "var(--success-soft)" : "var(--card-bg)",
        opacity: isLocked ? 0.65 : 1,
      }}
    >
      <SkillBadge icon={skill.icon} status={skill.status} size={44} className="shrink-0" />

      <div className="flex-1 min-w-[160px]">
        <div className="flex items-center gap-1.5 flex-wrap mb-1">
          <span className="badge-gray">{t(difficultyKey)}</span>
          <span className="badge-brand">{domainLabel}</span>
          {isCompleted && (
            <span className="badge-success flex items-center gap-1"><CheckIcon size={10} />{t("tree.statusCompleted")}</span>
          )}
          {isActive && <span className="badge-blue flex items-center gap-1"><CircleIcon size={7} />{t("tree.statusActive")}</span>}
          {isLocked && <span className="badge-gray flex items-center gap-1"><LockIcon size={10} />{t("tree.statusLocked")}</span>}
        </div>
        <p className="text-sm font-medium text-[var(--ink)]">{skill.title}</p>
        <div className="text-xs text-[var(--ink-faint)] mt-0.5">
          <span className="text-[var(--accent)] font-medium">{t("tests.xpSuffix", { xp: formatNumber(skill.xpReward, locale) })}</span>
          {skill.bestScore > 0 && (
            <>
              <span className="mx-1">·</span>
              {t("tests.scoreLabel", { score: formatNumber(skill.bestScore, locale) })}
            </>
          )}
        </div>
      </div>

      {isCompleted && <GaugeChart value={skill.bestScore} size={64} locale={locale} />}

      <div className="shrink-0 w-full sm:w-auto">
        {isActive && singleLesson && (
          <Link href={`/tests/take/${singleLesson.id}`}>
            <RoughButton fullWidth className="justify-center text-sm flex items-center gap-1.5">
              <PlayCircleIcon size={14} />
              {t("tests.start")}
            </RoughButton>
          </Link>
        )}
        {isActive && !singleLesson && (
          <div className="flex flex-col gap-1.5">
            <RoughButton fullWidth className="justify-center text-sm flex items-center gap-1.5" onClick={() => setExpanded((v) => !v)}>
              <PlayCircleIcon size={14} />
              {t("tests.start")}
            </RoughButton>
            {expanded && (
              <div className="flex flex-col gap-1">
                {skill.lessons.map((lesson) => (
                  <Link key={lesson.id} href={`/tests/take/${lesson.id}`}>
                    <RoughButton variant="secondary" fullWidth className="justify-start text-xs">
                      {lesson.title}
                    </RoughButton>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
        {isCompleted && skill.lessons[0] && (
          <Link href={`/tests/take/${skill.lessons[0].id}`}>
            <RoughButton variant="secondary" fullWidth className="justify-center text-sm">
              {t("tests.retry")}
            </RoughButton>
          </Link>
        )}
      </div>
    </div>
  );
}
