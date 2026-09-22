"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { SkillBadge } from "@/components/ui/topicIcons";
import type { TreeSkillNode } from "@/lib/hooks/useSkillTree";

export function SkillNode({ data }: NodeProps) {
  const skill = data as unknown as TreeSkillNode;
  const locked = skill.status === "LOCKED";

  return (
    <div className="flex flex-col items-center gap-1 w-24">
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div className="cursor-pointer transition-transform hover:scale-105">
        <SkillBadge icon={skill.icon} status={skill.status} size={64} />
      </div>
      <p className={`text-xs text-center font-display leading-tight ${locked ? "text-[var(--ink-faint)]" : "text-[var(--ink)]"}`}>
        {skill.title}
      </p>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}
