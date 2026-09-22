"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { RoughButton } from "@/components/ui/RoughButton";
import { SkillIcon, LockIcon, CheckIcon, BookIcon } from "@/components/ui/icons";
import { useSkillTree, type TreeSkillNode } from "@/lib/hooks/useSkillTree";
import { useTranslation } from "@/lib/i18n/LocaleProvider";

const NODE_SIZE = 68;
const COL_WIDTH = 110;
const ROW_HEIGHT = 130;

export function PathTrail({ pathId, pathTitle }: { pathId: string; pathTitle: string }) {
  const { nodes, isLoading } = useSkillTree(pathId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { t } = useTranslation();

  const ordered = useMemo(
    () => [...nodes].sort((a, b) => (a.tier - b.tier) || (a.col - b.col)),
    [nodes]
  );

  const nextUpId = useMemo(
    () => ordered.find((s) => s.status === "UNLOCKED" || s.status === "IN_PROGRESS")?.id ?? null,
    [ordered]
  );

  const selected: TreeSkillNode | undefined = ordered.find((s) => s.id === selectedId);

  if (isLoading) return <p>{t("tree.loading")}</p>;
  if (ordered.length === 0) return <p>{t("tree.empty")}</p>;

  const currentMilestone = (ordered.find((s) => s.id === nextUpId) ?? ordered[ordered.length - 1])?.milestone;

  const colCount = Math.max(...ordered.map((s) => s.col)) + 1;
  const tierCount = Math.max(...ordered.map((s) => s.tier)) + 1;
  const width = colCount * COL_WIDTH;
  const height = tierCount * ROW_HEIGHT;

  const points = ordered.map((skill) => ({
    skill,
    x: skill.col * COL_WIDTH + COL_WIDTH / 2,
    y: skill.tier * ROW_HEIGHT + NODE_SIZE / 2,
  }));
  const pointById = new Map(points.map((p) => [p.skill.id, p]));

  return (
    <div>
      <div className="max-w-md mx-auto mb-8 rounded-2xl bg-[var(--accent)] flex items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-xs text-white/80 font-display">{pathTitle}</p>
          {currentMilestone && <p className="text-lg font-display text-white leading-tight">{currentMilestone.title}</p>}
        </div>
        <Link
          href={`/paths/${pathId}`}
          className="shrink-0 flex items-center gap-1.5 text-sm font-display text-white border-2 border-white/70 rounded-lg px-2.5 py-1.5 hover:bg-white/10 transition-colors"
        >
          <BookIcon size={16} />
          {t("tree.guide")}
        </Link>
      </div>

      <div className="relative mx-auto" style={{ width, height: height + NODE_SIZE / 2 }}>
        <TrailConnectors points={points} pointById={pointById} width={width} height={height + NODE_SIZE} />

        {points.map(({ skill, x, y }) => {
          const locked = skill.status === "LOCKED";
          const completed = skill.status === "COMPLETED";
          const isNextUp = skill.id === nextUpId;

          return (
            <div
              key={skill.id}
              className="absolute flex flex-col items-center gap-1"
              style={{ left: x - NODE_SIZE / 2, top: y - NODE_SIZE / 2, width: NODE_SIZE }}
            >
              {isNextUp && (
                <div className="absolute -top-11 animate-pop-in">
                  <span className="block rounded-full bg-[var(--ink)] px-3 py-1 font-display text-sm text-[var(--paper)] whitespace-nowrap">
                    {t("tree.start")}
                  </span>
                </div>
              )}

              <button
                onClick={() => setSelectedId(skill.id)}
                aria-label={skill.title}
                className={`rounded-full border-2 flex items-center justify-center cursor-pointer transition-transform hover:scale-105 ${
                  completed
                    ? "bg-[var(--success-soft)] border-[var(--success)]"
                    : locked
                      ? "bg-[var(--card-bg)] border-[var(--ink-faint)] opacity-60"
                      : "bg-[var(--info-soft)] border-[var(--info)]"
                }`}
                style={{ width: NODE_SIZE, height: NODE_SIZE }}
              >
                <span className={completed ? "text-[var(--success)]" : locked ? "text-[var(--ink-faint)]" : "text-[var(--info)]"}>
                  {locked ? <LockIcon size={28} /> : completed ? <CheckIcon size={30} /> : <SkillIcon icon={skill.icon} size={30} />}
                </span>
              </button>
              <p className="text-xs text-center font-display leading-tight max-w-24">{skill.title}</p>
            </div>
          );
        })}
      </div>

      {selected && (
        <Card className="mt-6 max-w-md mx-auto animate-pop-in">
          {selected.milestone && (
            <p className="text-xs uppercase tracking-wide text-[var(--ink-faint)] mb-1">{selected.milestone.title}</p>
          )}
          <h2 className="font-display text-xl">{selected.title}</h2>
          <p className="text-sm text-[var(--ink-soft)] my-2">{selected.description}</p>

          {selected.status === "LOCKED" ? (
            <p className="text-sm text-[var(--ink-faint)]">{t("tree.locked")}</p>
          ) : (
            <>
              {selected.bestScore > 0 && (
                <p className="text-xs text-[var(--ink-faint)] mb-2">{t("tree.bestScore", { score: selected.bestScore })}</p>
              )}
              <div className="space-y-2">
                {selected.lessons.map((lesson) => (
                  <Link key={lesson.id} href={`/lesson/${lesson.id}`}>
                    <RoughButton variant="secondary" fullWidth className="text-start">
                      {lesson.title}
                    </RoughButton>
                  </Link>
                ))}
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}

function TrailConnectors({
  points,
  pointById,
  width,
  height,
}: {
  points: { skill: TreeSkillNode; x: number; y: number }[];
  pointById: Map<string, { skill: TreeSkillNode; x: number; y: number }>;
  width: number;
  height: number;
}) {
  return (
    <svg className="absolute inset-0 -z-10" width={width} height={height} aria-hidden>
      {points.flatMap((p) =>
        p.skill.prerequisiteIds.map((prereqId) => {
          const prev = pointById.get(prereqId);
          if (!prev) return null;
          const unlocked = p.skill.status !== "LOCKED";
          return (
            <line
              key={`${prereqId}-${p.skill.id}`}
              x1={prev.x}
              y1={prev.y}
              x2={p.x}
              y2={p.y}
              stroke={unlocked ? "var(--ink)" : "var(--ink-faint)"}
              strokeWidth={unlocked ? 3 : 2.5}
              strokeDasharray={unlocked ? undefined : "7 6"}
              strokeLinecap="round"
            />
          );
        })
      )}
    </svg>
  );
}
