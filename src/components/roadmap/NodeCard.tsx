"use client";

import { useState } from "react";
import Link from "next/link";
import { RoughButton } from "@/components/ui/RoughButton";
import { SkillBadge } from "@/components/ui/topicIcons";
import { CheckIcon, LockIcon, CircleIcon, PlayCircleIcon } from "@/components/ui/icons";
import { classifySkillDomain } from "@/lib/skillDomain";
import type { TreeSkillNode } from "@/lib/hooks/useSkillTree";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { formatNumber } from "@/lib/i18n/translations";

export function NodeCard({ skill }: { skill: TreeSkillNode }) {
  const [expanded, setExpanded] = useState(false);
  const { t, locale } = useLocale();

  const isLocked = skill.status === "LOCKED";
  const isCompleted = skill.status === "COMPLETED";
  const isActive = skill.status === "UNLOCKED" || skill.status === "IN_PROGRESS";
  const domain = classifySkillDomain(skill.title);
  const domainLabel = domain === "verbal" ? t("dashboard.verbal") : t("dashboard.quantitative");
  const singleLesson = skill.lessons.length === 1 ? skill.lessons[0] : null;

  return (
    <div
      className={`rounded-[var(--radius-2xl)] p-4 flex flex-col gap-2.5 transition-all ${isActive ? "node-active-pulse" : ""} ${isLocked ? "opacity-60" : ""}`}
      style={{
        border: isCompleted ? "1px solid var(--success)" : isActive ? "2px solid var(--accent)" : "1px solid var(--border-secondary)",
        background: isCompleted ? "var(--success-soft)" : isActive ? "var(--accent-soft)" : "var(--paper)",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <SkillBadge icon={skill.icon} status={skill.status} size={40} />
        {isCompleted && (
          <span className="badge-success shrink-0 flex items-center gap-1"><CheckIcon size={10} />{t("tree.statusCompleted")}</span>
        )}
        {isActive && (
          <span className="badge-blue shrink-0 flex items-center gap-1"><CircleIcon size={7} />{t("tree.statusActive")}</span>
        )}
        {isLocked && (
          <span className="badge-gray shrink-0 flex items-center gap-1"><LockIcon size={10} />{t("tree.statusLocked")}</span>
        )}
      </div>

      <div>
        <span className="badge-brand text-[10px] mb-1 inline-block">{domainLabel}</span>
        <p className="text-sm font-medium text-[var(--ink)] leading-snug line-clamp-2">{skill.title}</p>
      </div>

      <div className="text-xs text-[var(--ink-faint)]">
        <span className="text-[var(--accent)] font-medium">+{formatNumber(skill.xpReward, locale)} XP</span>
        <span className="mx-1">·</span>
        {t("tree.lessonCount", { count: formatNumber(skill.lessons.length, locale) })}
      </div>

      {isActive && singleLesson && (
        <Link href={`/lesson/${singleLesson.id}`}>
          <RoughButton fullWidth className="justify-center text-sm flex items-center gap-1.5">
            <PlayCircleIcon size={14} />
            {t("tree.startLesson")}
          </RoughButton>
        </Link>
      )}

      {isActive && !singleLesson && (
        <div className="flex flex-col gap-1.5">
          <RoughButton fullWidth className="justify-center text-sm flex items-center gap-1.5" onClick={() => setExpanded((v) => !v)}>
            <PlayCircleIcon size={14} />
            {t("tree.startLesson")}
          </RoughButton>
          {expanded && (
            <div className="flex flex-col gap-1">
              {skill.lessons.map((lesson) => (
                <Link key={lesson.id} href={`/lesson/${lesson.id}`}>
                  <RoughButton variant="secondary" fullWidth className="justify-start text-xs">
                    {lesson.title}
                  </RoughButton>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
