"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { ReactFlow, Background, Controls, type Node, type Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Card } from "@/components/ui/Card";
import { RoughButton } from "@/components/ui/RoughButton";
import { SkillNode } from "@/components/tree/SkillNode";
import { SketchEdge } from "@/components/tree/SketchEdge";
import { useSkillTree, type TreeSkillNode } from "@/lib/hooks/useSkillTree";
import { useTranslation } from "@/lib/i18n/LocaleProvider";

const nodeTypes = { skill: SkillNode };
const edgeTypes = { sketch: SketchEdge };
const COL_WIDTH = 130;
const ROW_HEIGHT = 150;

export default function SkillTreePage({ params }: { params: Promise<{ pathId: string }> }) {
  const { pathId } = use(params);
  const { nodes: skills, isLoading } = useSkillTree(pathId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { t } = useTranslation();

  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = skills.map((s) => ({
      id: s.id,
      type: "skill",
      position: { x: s.col * COL_WIDTH, y: s.tier * ROW_HEIGHT },
      data: s as unknown as Record<string, unknown>,
      draggable: false,
      selectable: true,
    }));
    const edges: Edge[] = skills.flatMap((s) =>
      s.prerequisiteIds.map((prereqId) => ({
        id: `${prereqId}-${s.id}`,
        source: prereqId,
        target: s.id,
        type: "sketch",
        data: { unlocked: s.status !== "LOCKED" },
      }))
    );
    return { nodes, edges };
  }, [skills]);

  const selected: TreeSkillNode | undefined = skills.find((s) => s.id === selectedId);

  if (isLoading) return <p>{t("tree.loading")}</p>;
  if (skills.length === 0) return <p>{t("tree.empty")}</p>;

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-4">
      <div className="h-[560px] border border-[var(--ink-faint)]/30 shadow-[var(--shadow-sm)] rounded-2xl overflow-hidden bg-[var(--card-bg)]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodeClick={(_, node) => setSelectedId(node.id)}
          fitView
          nodesConnectable={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={22} color="var(--ink-faint)" />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>

      <div>
        {selected ? (
          <Card key={selected.id} className="animate-pop-in">
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
        ) : (
          <Card>
            <p className="text-sm text-[var(--ink-soft)]">{t("tree.tapNode")}</p>
          </Card>
        )}
      </div>
    </div>
  );
}
