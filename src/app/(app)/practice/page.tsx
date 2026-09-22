"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { RoughButton } from "@/components/ui/RoughButton";
import { HeartsRow } from "@/components/ui/HeartsRow";
import { QuizRunner, type QuizQuestion } from "@/components/quiz/QuizRunner";
import { apiPost, ApiError } from "@/lib/hooks/useApi";
import { useProfile } from "@/lib/hooks/useProfile";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import { LightbulbIcon } from "@/components/ui/icons";

interface StartResponse {
  attemptId: string;
  questions: QuizQuestion[];
}

interface PracticeResult {
  scorePct: number;
  practiceHeartRefilled: boolean;
  heartsRemaining: number;
}

export default function PracticePage() {
  const [state, setState] = useState<{ status: "loading" } | { status: "ready"; data: StartResponse } | { status: "error"; message: string }>(
    { status: "loading" }
  );
  const [result, setResult] = useState<PracticeResult | null>(null);
  const { mutate: refreshProfile } = useProfile();
  const { t } = useTranslation();

  useEffect(() => {
    let cancelled = false;
    apiPost<StartResponse>("/api/practice/start")
      .then((data) => !cancelled && setState({ status: "ready", data }))
      .catch((err) => {
        if (!cancelled) setState({ status: "error", message: err instanceof ApiError ? err.message : "Something went wrong" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function startSession() {
    setResult(null);
    setState({ status: "loading" });
    apiPost<StartResponse>("/api/practice/start")
      .then((data) => setState({ status: "ready", data }))
      .catch((err) => {
        setState({ status: "error", message: err instanceof ApiError ? err.message : "Something went wrong" });
      });
  }

  function handleFinished(res: PracticeResult) {
    setResult(res);
    refreshProfile();
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="font-display text-2xl mb-1 flex items-center gap-2">
        <span className="text-[var(--info)]">
          <LightbulbIcon size={22} />
        </span>
        {t("practice.title")}
      </h1>
      <p className="text-sm text-[var(--ink-soft)] mb-4">{t("practice.subtitle", { pct: 70 })}</p>

      {state.status === "loading" && <p>{t("practice.loading")}</p>}

      {state.status === "error" && (
        <Card className="text-center">
          <p className="text-sm text-[var(--ink-soft)]">{state.message}</p>
          <Link href="/paths" className="text-[var(--accent)] underline text-sm">
            {t("practice.completeSkillFirst")}
          </Link>
        </Card>
      )}

      {state.status === "ready" && !result && (
        <QuizRunner<PracticeResult> attemptId={state.data.attemptId} questions={state.data.questions} onFinished={handleFinished} />
      )}

      {result && (
        <Card className="text-center animate-pop-in">
          <p className="font-display text-3xl mb-2">{result.scorePct}%</p>
          {result.practiceHeartRefilled ? (
            <>
              <p className="text-sm text-[var(--success)] mb-2">{t("practice.greatReview")}</p>
              <HeartsRow hearts={result.heartsRemaining} max={5} />
            </>
          ) : (
            <p className="text-sm text-[var(--ink-soft)] mb-2">{t("practice.scoreMore")}</p>
          )}
          <div className="mt-4 flex gap-2 justify-center">
            <Link href="/dashboard">
              <RoughButton variant="secondary">{t("practice.dashboard")}</RoughButton>
            </Link>
            <RoughButton onClick={startSession}>{t("practice.again")}</RoughButton>
          </div>
        </Card>
      )}
    </div>
  );
}
