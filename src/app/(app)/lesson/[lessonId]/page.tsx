"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { RoughButton } from "@/components/ui/RoughButton";
import { HeartBrokenIcon } from "@/components/ui/icons";
import { QuizRunner, type QuizQuestion } from "@/components/quiz/QuizRunner";
import { LessonSummary, type LessonCompleteResult } from "@/components/quiz/LessonSummary";
import { LessonContentCards, type LessonContent } from "@/components/quiz/LessonContentCard";
import { apiPost, ApiError } from "@/lib/hooks/useApi";
import { useProfile } from "@/lib/hooks/useProfile";
import { useTranslation } from "@/lib/i18n/LocaleProvider";

interface StartResponse {
  attemptId: string;
  lessonTitle: string;
  pathId: string;
  content: LessonContent;
  questions: QuizQuestion[];
}

export default function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = use(params);
  const [state, setState] = useState<{ status: "loading" } | { status: "ready"; data: StartResponse } | { status: "no-hearts" } | { status: "error"; message: string }>(
    { status: "loading" }
  );
  const [result, setResult] = useState<LessonCompleteResult | null>(null);
  const { mutate: refreshProfile } = useProfile();
  const { t } = useTranslation();

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
    </div>
  );
}
