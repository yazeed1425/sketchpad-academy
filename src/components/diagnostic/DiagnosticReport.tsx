"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { RoughButton } from "@/components/ui/RoughButton";
import { StarIcon, LockIcon, ThumbUpIcon } from "@/components/ui/icons";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import type { TranslationKey } from "@/lib/i18n/translations";

export interface DiagnosticSubSkillResult {
  domain: "QUANTITATIVE" | "VERBAL";
  subSkill: "ARITHMETIC" | "ALGEBRA" | "GEOMETRY" | "ANALOGIES" | "CONTEXTUAL_ERRORS" | "READING_COMPREHENSION";
  correct: number;
  total: number;
  accuracyPct: number;
  mastery: "GAP" | "DEVELOPING" | "MASTERED";
  rationale: string;
  xpAwarded: number;
  skillUnlockedIds: string[];
}

export interface DiagnosticReportData {
  attemptId: string;
  overallAccuracyPct: number;
  quantitativeAccuracyPct: number;
  verbalAccuracyPct: number;
  overallSummary: string;
  bonusXp: number;
  subSkills: DiagnosticSubSkillResult[];
}

const MASTERY_STYLE: Record<DiagnosticSubSkillResult["mastery"], { bg: string; fg: string; icon: (size: number) => React.ReactElement }> = {
  MASTERED: { bg: "var(--success-soft)", fg: "var(--success)", icon: (size) => <StarIcon size={size} /> },
  DEVELOPING: { bg: "var(--gold-soft)", fg: "var(--gold)", icon: (size) => <ThumbUpIcon size={size} /> },
  GAP: { bg: "var(--heart-soft)", fg: "var(--heart)", icon: (size) => <LockIcon size={size} /> },
};

export function DiagnosticReport({ report }: { report: DiagnosticReportData }) {
  const { t } = useTranslation();

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="text-center">
        <h1 className="font-display text-2xl mb-1">{t("diagnostic.report.title")}</h1>
        <p className="text-sm text-[var(--ink-soft)]">{t("diagnostic.report.subtitle")}</p>
      </div>

      <Card className="text-center animate-pop-in">
        <p className="text-xs text-[var(--ink-soft)] mb-1">{t("diagnostic.report.overall")}</p>
        <p className="font-display text-4xl mb-3">{report.overallAccuracyPct}%</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[var(--accent-soft)] rounded-xl p-2.5">
            <p className="text-xs text-[var(--accent)]">{t("diagnostic.report.quantitative")}</p>
            <p className="font-display text-lg text-[var(--accent)]">{report.quantitativeAccuracyPct}%</p>
          </div>
          <div className="bg-[var(--info-soft)] rounded-xl p-2.5">
            <p className="text-xs text-[var(--info)]">{t("diagnostic.report.verbal")}</p>
            <p className="font-display text-lg text-[var(--info)]">{report.verbalAccuracyPct}%</p>
          </div>
        </div>
        {report.bonusXp > 0 && (
          <p className="text-sm text-[var(--gold)] font-display mt-3">{t("diagnostic.report.bonusXp", { xp: report.bonusXp })}</p>
        )}
      </Card>

      {report.overallSummary && (
        <Card className="bg-[var(--info-soft)]">
          <p className="text-xs font-display text-[var(--info)] mb-1">{t("diagnostic.report.aiSummary")}</p>
          <p className="text-sm text-[var(--ink)]">{report.overallSummary}</p>
        </Card>
      )}

      <div className="space-y-2">
        {report.subSkills.map((s) => {
          const style = MASTERY_STYLE[s.mastery];
          const subSkillKey = `diagnostic.subSkill.${s.subSkill}` as TranslationKey;
          const masteryKey = `diagnostic.report.mastery.${s.mastery}` as TranslationKey;
          return (
            <Card key={s.subSkill} padding="p-4">
              <div className="flex items-center gap-3">
                <span className="shrink-0 rounded-full p-2" style={{ backgroundColor: style.bg, color: style.fg }}>
                  {style.icon(18)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h3 className="font-display text-base">{t(subSkillKey)}</h3>
                    <span className="text-xs font-display px-2 py-0.5 rounded-full" style={{ backgroundColor: style.bg, color: style.fg }}>
                      {t(masteryKey)}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--ink-soft)] mt-0.5">
                    {t("diagnostic.report.correctOf", { correct: s.correct, total: s.total })} · {s.accuracyPct}%
                  </p>
                  {s.rationale && <p className="text-xs text-[var(--ink-soft)] mt-1">{s.rationale}</p>}
                  {s.mastery === "MASTERED" && s.xpAwarded > 0 && (
                    <p className="text-xs text-[var(--success)] mt-0.5">{t("diagnostic.report.unlockedNote")}</p>
                  )}
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
        <Link href="/paths" className="flex-1">
          <RoughButton variant="secondary" fullWidth>
            {t("diagnostic.report.viewPaths")}
          </RoughButton>
        </Link>
      </div>
    </div>
  );
}
