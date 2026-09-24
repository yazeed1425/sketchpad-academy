"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { RoughButton } from "@/components/ui/RoughButton";
import { StarIcon, LockIcon, ThumbUpIcon } from "@/components/ui/icons";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import { formatNumber, type TranslationKey } from "@/lib/i18n/translations";

export interface CustomTopicResult {
  topic: string;
  correct: number;
  total: number;
  accuracyPct: number;
  mastery: "GAP" | "DEVELOPING" | "MASTERED";
  rationale: string;
}

export interface CustomDiagnosticReportData {
  attemptId: string;
  documentTitle: string;
  overallAccuracyPct: number;
  overallSummary: string;
  bonusXp: number;
  roadmapPathId: string;
  roadmapTitle: string;
  topics: CustomTopicResult[];
}

const MASTERY_STYLE: Record<CustomTopicResult["mastery"], { bg: string; fg: string; icon: (size: number) => React.ReactElement }> = {
  MASTERED: { bg: "var(--success-soft)", fg: "var(--success)", icon: (size) => <StarIcon size={size} /> },
  DEVELOPING: { bg: "var(--gold-soft)", fg: "var(--gold)", icon: (size) => <ThumbUpIcon size={size} /> },
  GAP: { bg: "var(--heart-soft)", fg: "var(--heart)", icon: (size) => <LockIcon size={size} /> },
};

export function CustomDiagnosticReport({ report }: { report: CustomDiagnosticReportData }) {
  const { t, locale } = useTranslation();

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="text-center">
        <h1 className="font-display text-2xl mb-1">{t("diagnostic.custom.report.title")}</h1>
        <p className="text-sm text-[var(--ink-soft)]">{t("diagnostic.custom.report.subtitle")}</p>
        <p className="text-xs text-[var(--ink-faint)] mt-1">{t("diagnostic.custom.report.documentLabel", { title: report.documentTitle })}</p>
      </div>

      <Card className="text-center animate-pop-in">
        <p className="text-xs text-[var(--ink-soft)] mb-1">{t("diagnostic.report.overall")}</p>
        <p className="font-display text-4xl mb-3">{formatNumber(report.overallAccuracyPct, locale)}%</p>
        <p className="text-sm text-[var(--ink-soft)]">{report.overallSummary}</p>
        {report.bonusXp > 0 && (
          <p className="text-sm text-[var(--gold)] font-display mt-3">{t("diagnostic.report.bonusXp", { xp: report.bonusXp })}</p>
        )}
      </Card>

      {report.roadmapTitle && (
        <Card className="bg-[var(--success-soft)] text-center">
          <p className="text-xs font-display text-[var(--success)] mb-1">{t("diagnostic.report.roadmapReady")}</p>
          <p className="font-display text-lg">{report.roadmapTitle}</p>
        </Card>
      )}

      <div className="space-y-2">
        {report.topics.map((s) => {
          const style = MASTERY_STYLE[s.mastery];
          const masteryKey = `diagnostic.report.mastery.${s.mastery}` as TranslationKey;
          return (
            <Card key={s.topic} padding="p-4">
              <div className="flex items-center gap-3">
                <span className="shrink-0 rounded-full p-2" style={{ backgroundColor: style.bg, color: style.fg }}>
                  {style.icon(18)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h3 className="font-display text-base">{s.topic}</h3>
                    <span className="text-xs font-display px-2 py-0.5 rounded-full" style={{ backgroundColor: style.bg, color: style.fg }}>
                      {t(masteryKey)}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--ink-soft)] mt-0.5">
                    {t("diagnostic.report.correctOf", { correct: s.correct, total: s.total })} · {formatNumber(s.accuracyPct, locale)}%
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="flex gap-2">
        <Link href="/dashboard" className="flex-1">
          <RoughButton fullWidth>{t("diagnostic.report.goDashboard")}</RoughButton>
        </Link>
        <Link href={`/paths/${report.roadmapPathId}/tree`} className="flex-1">
          <RoughButton variant="secondary" fullWidth>
            {t("diagnostic.report.viewPaths")}
          </RoughButton>
        </Link>
      </div>
    </div>
  );
}
