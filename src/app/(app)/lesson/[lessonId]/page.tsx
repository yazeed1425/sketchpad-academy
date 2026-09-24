"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { RoughButton } from "@/components/ui/RoughButton";
import { HeartBrokenIcon, BookIcon } from "@/components/ui/icons";
import { QuizRunner, type QuizQuestion } from "@/components/quiz/QuizRunner";
import { LessonSummary, type LessonCompleteResult } from "@/components/quiz/LessonSummary";
import { LessonContentCards, type LessonContent } from "@/components/quiz/LessonContentCard";
import { apiPost, ApiError } from "@/lib/hooks/useApi";
import { useProfile } from "@/lib/hooks/useProfile";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import { formatNumber } from "@/lib/i18n/translations";

interface StartResponse {
  attemptId: string;
  lessonTitle: string;
  pathId: string;
  content: LessonContent;
  questions: QuizQuestion[];
}

interface PracticeResult {
  scorePct: number;
  practiceHeartRefilled: boolean;
  heartsRemaining: number;
}

type BankPracticeState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "running"; attemptId: string; questions: QuizQuestion[] }
  | { status: "result"; result: PracticeResult };

export default function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = use(params);
  const [state, setState] = useState<{ status: "loading" } | { status: "ready"; data: StartResponse } | { status: "no-hearts" } | { status: "error"; message: string }>(
    { status: "loading" }
  );
  const [result, setResult] = useState<LessonCompleteResult | null>(null);
  const [bankPractice, setBankPractice] = useState<BankPracticeState>({ status: "idle" });
  const { mutate: refreshProfile } = useProfile();
  const { t, locale } = useTranslation();

  async function startBankPractice() {
    setBankPractice({ status: "loading" });
    try {
      const data = await apiPost<{ attemptId: string; questions: QuizQuestion[] }>(`/api/lessons/${lessonId}/practice`);
      setBankPractice({ status: "running", attemptId: data.attemptId, questions: data.questions });
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

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 px-6 md:px-12 lg:px-16">
      <div>
        <h1 className="font-display text-3xl mb-5">{state.data.lessonTitle}</h1>
        <LessonContentCards content={state.data.content} />
      </div>

      <div>
        <h2 className="font-display text-xl mb-4">{t("lesson.testYourUnderstanding")}</h2>
        <QuizRunner<LessonCompleteResult>
          attemptId={state.data.attemptId}
          questions={state.data.questions}
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
          <QuizRunner<PracticeResult>
            attemptId={bankPractice.attemptId}
            questions={bankPractice.questions}
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
  );
}
