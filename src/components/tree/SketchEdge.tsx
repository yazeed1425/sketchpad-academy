"use client";

import { BaseEdge, getSmoothStepPath, type EdgeProps } from "@xyflow/react";

export function SketchEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, markerStart, data }: EdgeProps) {
  const [path] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, borderRadius: 18 });
  const unlocked = Boolean((data as { unlocked?: boolean } | undefined)?.unlocked);

  return (
    <BaseEdge
      id={id}
      markerEnd={markerEnd}
      markerStart={markerStart}
      path={path}
      style={{
        stroke: unlocked ? "var(--ink)" : "var(--ink-faint)",
        strokeWidth: unlocked ? 2.4 : 2,
        strokeDasharray: unlocked ? undefined : "6 5",
      }}
    />
  );
}
