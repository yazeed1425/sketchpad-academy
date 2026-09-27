"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { RoughButton } from "@/components/ui/RoughButton";
import { HeartBrokenIcon, BookIcon, ChevronLeftIcon, FileTextIcon } from "@/components/ui/icons";
import { AdaptiveQuizRunner, type AdaptiveQuizQuestion, type AdaptiveProgress } from "@/components/quiz/AdaptiveQuizRunner";
import { LessonSummary, type LessonCompleteResult } from "@/components/quiz/LessonSummary";
import { LessonContentCards, type LessonContent } from "@/components/quiz/LessonContentCard";
import { apiPost, ApiError } from "@/lib/hooks/useApi";
import { useProfile } from "@/lib/hooks/useProfile";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import { formatNumber } from "@/lib/i18n/translations";
import { classifySkillDomain } from "@/lib/skillDomain";

interface StartResponse {
  attemptId: string;
  lessonTitle: string;
  pathId: string;
  domainLabel: string | null;
  content: LessonContent;
  progress: AdaptiveProgress;
  question: AdaptiveQuizQuestion;
}

interface PracticeResult {
  scorePct: number;
  practiceHeartRefilled: boolean;
  heartsRemaining: number;
}

interface BankPracticeStart {
  attemptId: string;
  progress: AdaptiveProgress;
  question: AdaptiveQuizQuestion;
}

type BankPracticeState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "running"; data: BankPracticeStart }
  | { status: "result"; result: PracticeResult };

export default function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = use(params);
  const [state, setState] = useState<{ status: "loading" } | { status: "ready"; data: StartResponse } | { status: "no-hearts" } | { status: "error"; message: string }>(
    { status: "loading" }
  );
  const [result, setResult] = useState<LessonCompleteResult | null>(null);
  const [bankPractice, setBankPractice] = useState<BankPracticeState>({ status: "idle" });
  const [activeTab, setActiveTab] = useState<"lesson" | "notes">("lesson");
  const { mutate: refreshProfile } = useProfile();
  const { t, locale } = useTranslation();

  async function startBankPractice() {
    setBankPractice({ status: "loading" });
    try {
      const data = await apiPost<BankPracticeStart>(`/api/lessons/${lessonId}/practice`);
      setBankPractice({ status: "running", data });
    } catch {
      setBankPractice({ status: "idle" });
    }
  }

  useEffect(() => {
    let cancelled = false;
    apiPost<StartResponse>(`/api/lessons/${lessonId}/start`)
      .then((data) => !cancelled && setState({ status: "ready", data }))
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 409) setState({ status: "no-hearts" });
        else setState({ status: "error", message: err instanceof Error ? err.message : "Something went wrong" });
      });
    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  function handleFinished(res: LessonCompleteResult) {
    setResult(res);
    refreshProfile();
  }

  if (state.status === "loading") return <p>{t("lesson.loadingLesson")}</p>;

  if (state.status === "no-hearts") {
    return (
      <Card className="max-w-md mx-auto text-center">
        <p className="text-[var(--heart)] flex justify-center mb-2">
          <HeartBrokenIcon size={32} />
        </p>
        <h2 className="font-display text-2xl mb-2">{t("lesson.outOfHearts")}</h2>
        <p className="text-sm text-[var(--ink-soft)] mb-4">{t("lesson.outOfHeartsBody")}</p>
        <Link href="/practice">
          <RoughButton fullWidth>{t("lesson.goPractice")}</RoughButton>
        </Link>
      </Card>
    );
  }

  if (state.status === "error") {
    return <p className="text-[var(--heart)]">{state.message}</p>;
  }

  if (result) return <LessonSummary result={result} pathId={state.data.pathId} />;

  const domain = classifySkillDomain(state.data.lessonTitle);
  const domainLabel = state.data.domainLabel ?? (domain === "verbal" ? t("dashboard.verbal") : t("dashboard.quantitative"));

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <Link href={`/paths/${state.data.pathId}/tree`} className="btn-secondary-gray flex items-center gap-1 text-sm">
          <ChevronLeftIcon size={14} />
          {t("lesson.backToRoadmap")}
        </Link>
        <span className="badge-blue">{domainLabel}</span>
        <h1 className="font-display text-xl text-[var(--ink)]">{state.data.lessonTitle}</h1>
      </div>

      <div className="flex border-b border-[var(--border-secondary)] mb-6">
        <button
          onClick={() => setActiveTab("lesson")}
          className={activeTab === "lesson" ? "tab-underline-active flex items-center gap-2" : "tab-underline-inactive flex items-center gap-2"}
        >
          <BookIcon size={15} />
          {t("lesson.lessonTab")}
        </button>
        <button
          onClick={() => setActiveTab("notes")}
          className={activeTab === "notes" ? "tab-underline-active flex items-center gap-2" : "tab-underline-inactive flex items-center gap-2"}
        >
          <FileTextIcon size={15} />
          {t("lesson.notesTab")}
        </button>
      </div>

      {activeTab === "notes" ? (
        <Card className="text-center">
          <p className="text-sm text-[var(--ink-soft)]">{t("lesson.notesComingSoon")}</p>
        </Card>
      ) : (
        <div className="space-y-8">
          <div>
            <LessonContentCards content={state.data.content} />
          </div>

          <div>
            <h2 className="font-display text-xl mb-4">{t("lesson.testYourUnderstanding")}</h2>
            <AdaptiveQuizRunner<LessonCompleteResult>
              attemptId={state.data.attemptId}
              initialQuestion={state.data.question}
              initialProgress={state.data.progress}
              content={state.data.content}
              heartsGated
              onFinished={handleFinished}
            />
          </div>

          <div>
            <h2 className="font-display text-xl mb-4 flex items-center gap-2">
              <BookIcon size={20} className="text-[var(--info)]" />
              {t("lesson.questionBankPractice")}
            </h2>

            {bankPractice.status === "idle" && (
              <Card className="text-center">
                <p className="text-sm text-[var(--ink-soft)] mb-4">{t("lesson.questionBankPracticeBody")}</p>
                <RoughButton variant="secondary" onClick={startBankPractice} fullWidth>
                  {t("lesson.startBankPractice")}
                </RoughButton>
              </Card>
            )}

            {bankPractice.status === "loading" && (
              <Card className="text-center">
                <p className="text-sm text-[var(--ink-soft)]">{t("lesson.loadingBankPractice")}</p>
              </Card>
            )}

            {bankPractice.status === "running" && (
              <AdaptiveQuizRunner<PracticeResult>
                attemptId={bankPractice.data.attemptId}
                initialQuestion={bankPractice.data.question}
                initialProgress={bankPractice.data.progress}
                onFinished={(res) => setBankPractice({ status: "result", result: res })}
              />
            )}

            {bankPractice.status === "result" && (
              <Card className="text-center animate-pop-in">
                <p className="font-display text-3xl mb-2">{formatNumber(bankPractice.result.scorePct, locale)}%</p>
                <p className="text-sm text-[var(--ink-soft)] mb-4">
                  {bankPractice.result.practiceHeartRefilled ? t("practice.greatReview") : t("practice.scoreMore")}
                </p>
                <RoughButton variant="secondary" onClick={() => setBankPractice({ status: "idle" })}>
                  {t("practice.again")}
                </RoughButton>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
