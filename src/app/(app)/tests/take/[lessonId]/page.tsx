"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { RoughButton } from "@/components/ui/RoughButton";
import { ChevronLeftIcon, TargetIcon } from "@/components/ui/icons";
import { QuizRunner, type QuizQuestion } from "@/components/quiz/QuizRunner";
import { HeartsRow } from "@/components/ui/HeartsRow";
import { apiPost } from "@/lib/hooks/useApi";
import { useProfile } from "@/lib/hooks/useProfile";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import { formatNumber } from "@/lib/i18n/translations";

interface StartResponse {
  attemptId: string;
  lessonTitle: string;
  skillTitle: string;
  pathId: string;
  domainLabel: string | null;
  questions: QuizQuestion[];
}

interface PracticeResult {
  scorePct: number;
  practiceHeartRefilled: boolean;
  heartsRemaining: number;
}

type State =
  | { status: "loading" }
  | { status: "running"; data: StartResponse }
  | { status: "result"; data: StartResponse; result: PracticeResult }
  | { status: "error"; message: string };

export default function TakeTestPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = use(params);
  const [state, setState] = useState<State>({ status: "loading" });
  const { mutate: refreshProfile } = useProfile();
  const { t, locale } = useTranslation();

  function start() {
    setState({ status: "loading" });
    apiPost<StartResponse>(`/api/lessons/${lessonId}/practice`)
      .then((data) => setState({ status: "running", data }))
      .catch((err) => setState({ status: "error", message: err instanceof Error ? err.message : t("tests.error.generic") }));
  }

  useEffect(() => {
    let cancelled = false;
    apiPost<StartResponse>(`/api/lessons/${lessonId}/practice`)
      .then((data) => !cancelled && setState({ status: "running", data }))
      .catch((err) => {
        if (cancelled) return;
        setState({ status: "error", message: err instanceof Error ? err.message : t("tests.error.generic") });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  function handleFinished(result: PracticeResult) {
    if (state.status !== "running") return;
    refreshProfile();
    setState({ status: "result", data: state.data, result });
  }

  if (state.status === "loading") {
    return (
      <Card className="max-w-lg mx-auto text-center">
        <span className="inline-flex bg-[var(--accent-soft)] text-[var(--accent)] rounded-2xl p-3 mb-3">
          <TargetIcon size={30} />
        </span>
        <p className="text-sm text-[var(--ink-soft)]">{t("tests.preparing")}</p>
      </Card>
    );
  }

  if (state.status === "error") {
    return (
      <Card className="max-w-lg mx-auto text-center">
        <p className="text-[var(--heart)] mb-4">{state.message}</p>
        <div className="flex gap-2 justify-center">
          <RoughButton onClick={start}>{t("diagnostic.custom.error.retry")}</RoughButton>
          <Link href="/tests">
            <RoughButton variant="secondary">{t("tests.backToTests")}</RoughButton>
          </Link>
        </div>
      </Card>
    );
  }

  const { data } = state;

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <Link href="/tests" className="btn-secondary-gray flex items-center gap-1 text-sm">
          <ChevronLeftIcon size={14} />
          {t("tests.backToTests")}
        </Link>
        {data.domainLabel && <span className="badge-brand">{data.domainLabel}</span>}
        <h1 className="font-display text-xl text-[var(--ink)]">{data.skillTitle}</h1>
      </div>

      {state.status === "running" && (
        <QuizRunner<PracticeResult> attemptId={data.attemptId} questions={data.questions} onFinished={handleFinished} />
      )}

      {state.status === "result" && (
        <Card className="text-center animate-pop-in">
          <p className="font-display text-3xl mb-2">{formatNumber(state.result.scorePct, locale)}%</p>
          {state.result.practiceHeartRefilled ? (
            <div className="mb-4">
              <p className="text-sm text-[var(--success)] mb-2">{t("practice.greatReview")}</p>
              <div className="flex justify-center">
                <HeartsRow hearts={state.result.heartsRemaining} max={5} size={18} />
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--ink-soft)] mb-4">{t("practice.scoreMore")}</p>
          )}
          <div className="flex gap-2 justify-center">
            <RoughButton onClick={start}>{t("tests.retry")}</RoughButton>
            <Link href="/tests">
              <RoughButton variant="secondary">{t("tests.backToTests")}</RoughButton>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
