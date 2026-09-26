"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { TestRow, type TestDifficulty } from "@/components/tests/TestRow";
import { usePaths } from "@/lib/hooks/useGameData";
import { useSkillTree, type TreeSkillNode } from "@/lib/hooks/useSkillTree";
import { classifySkillDomain } from "@/lib/skillDomain";
import { LockIcon, CheckIcon, TargetIcon, ZapIcon } from "@/components/ui/icons";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import { formatNumber } from "@/lib/i18n/translations";

function domainOf(node: TreeSkillNode, quantitativeLabel: string, verbalLabel: string): string {
  if (node.domainLabel) return node.domainLabel;
  return classifySkillDomain(node.title) === "verbal" ? verbalLabel : quantitativeLabel;
}

function difficultyOf(node: TreeSkillNode, maxTier: number): TestDifficulty {
  if (maxTier <= 0) return "MEDIUM";
  const ratio = node.tier / maxTier;
  if (ratio < 1 / 3) return "EASY";
  if (ratio < 2 / 3) return "MEDIUM";
  return "HARD";
}

export default function TestsPage() {
  const { paths, isLoading: pathsLoading } = usePaths();
  const { t, locale } = useTranslation();
  const [filter, setFilter] = useState<string | null>(null);

  const activePath = paths.find((p) => p.enrolled);
  const { nodes, isLoading: nodesLoading } = useSkillTree(activePath?.id ?? "");

  if (pathsLoading) return <p className="text-[var(--ink-soft)]">{t("dashboard.loading")}</p>;

  if (!activePath) {
    return (
      <div className="max-w-md mx-auto space-y-4">
        <Card className="text-center">
          <p className="text-sm text-[var(--ink-soft)] mb-3">{t("dashboard.noPathYet")}</p>
          <Link href="/paths" className="text-[var(--accent)] underline">
            {t("dashboard.pickOne")}
          </Link>
        </Card>
        <Link href="/diagnostic">
          <Card className="text-center bg-[var(--accent-soft)] hover:-translate-y-0.5 transition-transform">
            <h2 className="font-display text-lg mb-1">{t("dashboard.takePlacementTitle")}</h2>
            <p className="text-sm text-[var(--ink-soft)] mb-3">{t("dashboard.takePlacementBody")}</p>
            <span className="text-[var(--accent)] font-display underline">{t("dashboard.takePlacement")}</span>
          </Card>
        </Link>
      </div>
    );
  }

  if (nodesLoading) return <p className="text-[var(--ink-soft)]">{t("dashboard.loading")}</p>;

  const quantitativeLabel = t("dashboard.quantitative");
  const verbalLabel = t("dashboard.verbal");
  const maxTier = Math.max(0, ...nodes.map((n) => n.tier));

  const locked = nodes.filter((n) => n.status === "LOCKED").length;
  const completedCount = nodes.filter((n) => n.status === "COMPLETED").length;
  const availableCount = nodes.filter((n) => n.status === "UNLOCKED" || n.status === "IN_PROGRESS").length;
  const attempted = nodes.filter((n) => n.bestScore > 0);
  const avgScore = attempted.length > 0 ? Math.round(attempted.reduce((sum, n) => sum + n.bestScore, 0) / attempted.length) : 0;

  const domains = [...new Set(nodes.map((n) => domainOf(n, quantitativeLabel, verbalLabel)))];
  const filtered = filter ? nodes.filter((n) => domainOf(n, quantitativeLabel, verbalLabel) === filter) : nodes;

  const sortByTier = (a: TreeSkillNode, b: TreeSkillNode) => a.tier - b.tier || a.col - b.col;
  const availableNodes = filtered.filter((n) => n.status !== "COMPLETED").sort(sortByTier);
  const completedNodes = filtered.filter((n) => n.status === "COMPLETED").sort(sortByTier);

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display text-xl text-[var(--ink)] mb-1">{t("tests.title")}</h1>
        <p className="text-sm text-[var(--ink-soft)]">{t("tests.subtitle")}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <MetricCard label={t("tests.statLocked")} value={formatNumber(locked, locale)} icon={LockIcon} bg="var(--gray-50)" color="var(--gray-600)" />
        <MetricCard
          label={t("tests.statAvgScore")}
          value={`${formatNumber(avgScore, locale)}${locale === "ar" ? "٪" : "%"}`}
          icon={TargetIcon}
          bg="var(--accent-soft)"
          color="var(--accent)"
        />
        <MetricCard label={t("tests.statCompleted")} value={formatNumber(completedCount, locale)} icon={CheckIcon} bg="var(--success-soft)" color="var(--success)" />
        <MetricCard label={t("tests.statAvailable")} value={formatNumber(availableCount, locale)} icon={ZapIcon} bg="var(--info-soft)" color="var(--info)" />
      </div>

      <div className="flex items-center gap-1 flex-wrap mb-5 border-b border-[var(--border-secondary)] pb-1">
        <button onClick={() => setFilter(null)} className={filter === null ? "tab-underline-active" : "tab-underline-inactive"}>
          {t("tests.filterAll")}
        </button>
        {domains.map((d) => (
          <button key={d} onClick={() => setFilter(d)} className={filter === d ? "tab-underline-active" : "tab-underline-inactive"}>
            {d}
          </button>
        ))}
      </div>

      <div className="mb-8">
        <h2 className="font-display text-base text-[var(--ink)] mb-3">{t("tests.sectionAvailable")}</h2>
        {availableNodes.length === 0 ? (
          <p className="text-sm text-[var(--ink-faint)]">{t("tests.noneAvailable")}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {availableNodes.map((n) => (
              <TestRow key={n.id} skill={n} difficulty={difficultyOf(n, maxTier)} />
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="font-display text-base text-[var(--ink)] mb-3 flex items-center gap-2">
          {t("tests.sectionCompleted")}
          <CheckIcon size={16} className="text-[var(--success)]" />
        </h2>
        {completedNodes.length === 0 ? (
          <p className="text-sm text-[var(--ink-faint)]">{t("tests.noneCompleted")}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {completedNodes.map((n) => (
              <TestRow key={n.id} skill={n} difficulty={difficultyOf(n, maxTier)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
