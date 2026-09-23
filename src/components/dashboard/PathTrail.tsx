"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { RoughButton } from "@/components/ui/RoughButton";
import { BookIcon } from "@/components/ui/icons";
import { SkillBadge } from "@/components/ui/topicIcons";
import { useSkillTree, type TreeSkillNode } from "@/lib/hooks/useSkillTree";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import { pathColor } from "@/lib/pathColors";

const COLS = 6;
const MIN_COL_WIDTH_MOBILE = 40;
const MIN_COL_WIDTH_DESKTOP = 80;
const MAX_COL_WIDTH = 130;

/** Boustrophedon layout: row 0 goes right-to-left, row 1 left-to-right, row 2 right-to-left, ... */
function gridPosition(index: number) {
  const row = Math.floor(index / COLS);
  const posInRow = index % COLS;
  const col = row % 2 === 0 ? COLS - 1 - posInRow : posInRow;
  return { row, col };
}

export function PathTrail({ pathId, pathTitle }: { pathId: string; pathTitle: string }) {
  const { nodes, isLoading } = useSkillTree(pathId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { t } = useTranslation();

  // A callback ref (rather than useRef + an empty-deps effect) so this still measures
  // correctly even though the wrapper div doesn't mount until after the loading/empty
  // early-returns below resolve on a later render.
  const [wrapperEl, setWrapperEl] = useState<HTMLDivElement | null>(null);
  const wrapperRef = useCallback((el: HTMLDivElement | null) => setWrapperEl(el), []);
  const [containerWidth, setContainerWidth] = useState(COLS * MIN_COL_WIDTH_DESKTOP);

  useEffect(() => {
    if (!wrapperEl) return;
    // ResizeObserver reports the initial size asynchronously right after observe()
    // starts, so there's no need to also set it synchronously here.
    const observer = new ResizeObserver(() => setContainerWidth(wrapperEl.clientWidth));
    observer.observe(wrapperEl);
    return () => observer.disconnect();
  }, [wrapperEl]);

  // The 3-column grid grows to fill whatever width it's given (within sane limits)
  // instead of sitting at a fixed pixel size on wide screens. Only genuinely narrow
  // (phone-width) containers fall back to the smaller floor; anything else stays
  // comfortably large even in a moderate-width desktop window.
  const isNarrow = containerWidth > 0 && containerWidth < COLS * MIN_COL_WIDTH_DESKTOP;
  const minColWidth = isNarrow ? MIN_COL_WIDTH_MOBILE : MIN_COL_WIDTH_DESKTOP;
  const colWidth = Math.min(MAX_COL_WIDTH, Math.max(minColWidth, containerWidth / COLS));
  const nodeSize = Math.round(colWidth * 0.55);
  const rowHeight = Math.round(colWidth * 1.25);

  // One continuous tier-ordered trail (root skills first, deeper prerequisites later) instead
  // of splitting into a separate banner per milestone — a single flowing path reads as one
  // plan, and makes the prerequisite locking below it self-explanatory (you unlock the next
  // node by finishing the one(s) before it), rather than looking like several unrelated tracks.
  const ordered = useMemo(
    () => [...nodes].sort((a, b) => (a.tier - b.tier) || (a.col - b.col)),
    [nodes]
  );

  const selected: TreeSkillNode | undefined = ordered.find((s) => s.id === selectedId);

  if (isLoading) return <p>{t("tree.loading")}</p>;
  if (ordered.length === 0) return <p>{t("tree.empty")}</p>;

  const color = pathColor(pathId);
  const gridWidth = COLS * colWidth;
  const rowCount = Math.ceil(ordered.length / COLS);
  const gridHeight = rowCount * rowHeight;
  const points = ordered.map((skill, index) => {
    const { row, col } = gridPosition(index);
    return {
      skill,
      x: col * colWidth + colWidth / 2,
      y: row * rowHeight + nodeSize / 2,
    };
  });

  return (
    <div ref={wrapperRef} className="min-w-0 w-full space-y-10">
      <div>
        <div
          className="mx-auto mb-8 rounded-[var(--radius-4xl)] shadow-[var(--shadow-md)] flex items-center justify-between gap-3 px-4 py-3"
          style={{
            background: `linear-gradient(135deg, ${color.solid}, color-mix(in srgb, ${color.solid} 70%, black))`,
            maxWidth: gridWidth,
          }}
        >
          <p className="text-lg font-display text-white leading-tight">{pathTitle}</p>
          <Link
            href={`/paths/${pathId}`}
            className="shrink-0 flex items-center gap-1.5 text-sm font-display text-white border border-white/70 rounded-full px-2.5 py-1.5 hover:bg-white/10 transition-colors"
          >
            <BookIcon size={16} />
            {t("tree.guide")}
          </Link>
        </div>

        <div className="relative mx-auto" style={{ width: gridWidth, height: gridHeight + nodeSize / 2 }}>
          <TrailConnectors points={points} colWidth={colWidth} width={gridWidth} height={gridHeight + nodeSize} />

          {points.map(({ skill, x, y }) => (
            <div
              key={skill.id}
              className="absolute flex flex-col items-center gap-1"
              style={{ left: x - nodeSize / 2, top: y - nodeSize / 2, width: nodeSize }}
            >
              <button
                onClick={() => setSelectedId(skill.id)}
                aria-label={skill.title}
                className="cursor-pointer transition-transform hover:scale-105"
              >
                <SkillBadge icon={skill.icon} status={skill.status} size={nodeSize} />
              </button>
              <p className="text-[11px] text-center font-display leading-tight" style={{ maxWidth: colWidth - 6 }}>
                {skill.title}
              </p>
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <Card className="mt-6 mx-auto animate-pop-in" style={{ maxWidth: gridWidth }}>
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
  colWidth,
  width,
  height,
}: {
  points: { skill: TreeSkillNode; x: number; y: number }[];
  colWidth: number;
  width: number;
  height: number;
}) {
  if (points.length < 2) return null;

  return (
    <svg className="absolute inset-0 -z-10" width={width} height={height} aria-hidden>
      {points.slice(1).map((p, i) => {
        const prev = points[i];
        const unlocked = p.skill.status !== "LOCKED";
        return (
          <path
            key={p.skill.id}
            d={connectorPath(prev, p, width, colWidth)}
            fill="none"
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

/**
 * Row-to-row connectors in this boustrophedon layout always land back in the same
 * column (that's how a snake path wraps), which means a straight line would drop
 * right through the label sitting under the row's last node. Curve those specific
 * segments out to whichever side has room instead of using a straight line.
 */
function connectorPath(prev: { x: number; y: number }, curr: { x: number; y: number }, width: number, colWidth: number) {
  if (prev.y === curr.y) return `M ${prev.x} ${prev.y} L ${curr.x} ${curr.y}`;

  const bulge = prev.x < width / 2 ? 1 : -1;
  const offset = colWidth * 0.68 * bulge;
  const midY1 = prev.y + (curr.y - prev.y) * 0.35;
  const midY2 = prev.y + (curr.y - prev.y) * 0.65;
  return `M ${prev.x} ${prev.y} C ${prev.x + offset} ${midY1}, ${curr.x + offset} ${midY2}, ${curr.x} ${curr.y}`;
}
