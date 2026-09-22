"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { RoughPanel } from "@/components/ui/RoughSvg";
import { Card } from "@/components/ui/Card";
import { RoughButton } from "@/components/ui/RoughButton";
import { SkillIcon, LockIcon, CheckIcon, BookIcon } from "@/components/ui/icons";
import { useSkillTree, type TreeSkillNode } from "@/lib/hooks/useSkillTree";
import { useTranslation } from "@/lib/i18n/LocaleProvider";

const NODE_SIZE = 68;
const ROW_HEIGHT = 104;
// A repeating left/right offset so the trail winds down the page like a snake, Duolingo-style.
const OFFSET_CYCLE = [0, 64, 96, 64, 0, -64, -96, -64];

function offsetFor(index: number) {
  return OFFSET_CYCLE[index % OFFSET_CYCLE.length];
}

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

  const width = Math.max(...OFFSET_CYCLE.map(Math.abs)) * 2 + NODE_SIZE;
  const height = ordered.length * ROW_HEIGHT;
  const centerX = width / 2;

  const points = ordered.map((skill, i) => ({
    skill,
    x: centerX + offsetFor(i),
    y: i * ROW_HEIGHT + NODE_SIZE / 2,
  }));

  return (
    <div>
      <RoughPanel fill="var(--accent)" fillStyle="solid" rounded={18} strokeWidth={2} className="max-w-md mx-auto mb-8">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
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
      </RoughPanel>

      <div className="relative mx-auto" style={{ width, height: height + NODE_SIZE / 2 }}>
        <TrailConnectors points={points} />

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
                  <RoughPanel fill="var(--ink)" fillStyle="solid" rounded={999} strokeWidth={2}>
                    <span className="block px-3 py-1 font-display text-sm text-[var(--paper)] whitespace-nowrap">
                      {t("tree.start")}
                    </span>
                  </RoughPanel>
                </div>
              )}

              <button onClick={() => setSelectedId(skill.id)} aria-label={skill.title}>
                <RoughPanel
                  circle
                  fill={completed ? "var(--success-soft)" : locked ? "var(--card-bg)" : "var(--info-soft)"}
                  fillStyle="solid"
                  strokeWidth={locked ? 1.4 : 2.4}
                  className={`flex items-center justify-center cursor-pointer transition-transform hover:scale-105 ${locked ? "opacity-60" : ""}`}
                  style={{ width: NODE_SIZE, height: NODE_SIZE }}
                >
                  <span className={completed ? "text-[var(--success)]" : locked ? "text-[var(--ink-faint)]" : "text-[var(--info)]"}>
                    {locked ? <LockIcon size={28} /> : completed ? <CheckIcon size={30} /> : <SkillIcon icon={skill.icon} size={30} />}
                  </span>
                </RoughPanel>
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

function TrailConnectors({ points }: { points: { skill: TreeSkillNode; x: number; y: number }[] }) {
  if (points.length < 2) return null;
  const width = Math.max(...points.map((p) => p.x)) + NODE_SIZE;
  const height = points[points.length - 1].y + NODE_SIZE;

  return (
    <svg className="absolute inset-0 -z-10 ink-wobble" width={width} height={height} aria-hidden>
      {points.slice(1).map((p, i) => {
        const prev = points[i];
        const unlocked = p.skill.status !== "LOCKED";
        return (
          <line
            key={p.skill.id}
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
      })}
    </svg>
  );
}
