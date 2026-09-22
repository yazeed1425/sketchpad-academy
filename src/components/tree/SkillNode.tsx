"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { RoughPanel } from "@/components/ui/RoughSvg";
import { SkillIcon, LockIcon, CheckIcon } from "@/components/ui/icons";
import type { TreeSkillNode } from "@/lib/hooks/useSkillTree";

export function SkillNode({ data }: NodeProps) {
  const skill = data as unknown as TreeSkillNode;
  const locked = skill.status === "LOCKED";
  const completed = skill.status === "COMPLETED";

  return (
    <div className="flex flex-col items-center gap-1 w-24">
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <RoughPanel
        circle
        fill={completed ? "var(--success-soft)" : locked ? "var(--card-bg)" : "var(--info-soft)"}
        fillStyle="solid"
        strokeWidth={locked ? 1.4 : 2.4}
        className={`w-16 h-16 flex items-center justify-center cursor-pointer transition-transform hover:scale-105 ${
          locked ? "opacity-60" : ""
        }`}
      >
        <span
          className={completed ? "text-[var(--success)]" : locked ? "text-[var(--ink-faint)]" : "text-[var(--info)]"}
        >
          {locked ? <LockIcon size={26} /> : completed ? <CheckIcon size={28} /> : <SkillIcon icon={skill.icon} size={28} />}
        </span>
      </RoughPanel>
      <p className={`text-xs text-center font-display leading-tight ${locked ? "text-[var(--ink-faint)]" : "text-[var(--ink)]"}`}>
        {skill.title}
      </p>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}
