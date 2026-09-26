"use client";

import { useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { RoughButton } from "@/components/ui/RoughButton";
import { HeartsRow } from "@/components/ui/HeartsRow";
import { MathText } from "@/components/ui/MathText";
import { CheckIcon, CrossIcon } from "@/components/ui/icons";
import { LessonContentCards, type LessonContent } from "@/components/quiz/LessonContentCard";
import { apiFetcher, apiPost } from "@/lib/hooks/useApi";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import type { TranslationKey } from "@/lib/i18n/translations";

export interface AdaptiveQuizQuestion {
  id: string;
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "FILL_BLANK";
  difficulty: "EASY" | "MEDIUM" | "HARD";
  prompt: string;
  options: string[];
}

export interface AdaptiveProgress {
  questionNumber: number;
  minQuestions: number;
  maxQuestions: number;
}

interface AnswerFeedback {
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string;
  hearts?: number;
  heartsDepleted?: boolean;
}

type NextState =
  | { status: "in-progress"; attemptId: string; progress: AdaptiveProgress; remediation: boolean; question: AdaptiveQuizQuestion }
  | { status: "ready-to-complete"; attemptId: string };

/**
 * Adaptive quiz UI for lesson curriculum quizzes and question-bank practice: fetches one
 * question at a time, its difficulty stepping up/down between questions based on the running
 * answer stream (see quizService.getQuizState), instead of a fixed set handed over upfront.
 * Mirrors DiagnosticRunner's two-step "grade instantly, prefetch the next question in the
 * background while feedback is on screen" pattern so the slow Gemini/RAG generation never blocks
 * the feedback the student is reading. When the engine signals `remediation` (two EASY misses in
 * a row — the "Low Performance" branch of the adaptive-gamification research's Fig. 2), shows the
 * lesson's own concept/example/common-mistake content again before continuing at a lower
 * difficulty, instead of just dropping the student into another question.
 */
export function AdaptiveQuizRunner<TCompleteResult>({
  attemptId,
  initialQuestion,
  initialProgress,
  content,
  heartsGated = false,
  onFinished,
}: {
  attemptId: string;
  initialQuestion: AdaptiveQuizQuestion;
  initialProgress: AdaptiveProgress;
  content?: LessonContent;
  heartsGated?: boolean;
  onFinished: (result: TCompleteResult) => void;
}) {
  const [question, setQuestion] = useState(initialQuestion);
  const [progress, setProgress] = useState(initialProgress);
  const [choice, setChoice] = useState("");
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [outOfHearts, setOutOfHearts] = useState(false);
  const [pendingRemediation, setPendingRemediation] = useState<Extract<NextState, { status: "in-progress" }> | null>(null);
  // Undefined while the background prefetch hasn't resolved yet — distinct from every real
  // NextState so the "next question"/"see results" button label can tell "still loading" apart
  // from a resolved state (same trick DiagnosticRunner uses).
  const [resolvedNext, setResolvedNext] = useState<NextState | undefined>(undefined);
  const nextStatePromiseRef = useRef<Promise<NextState> | null>(null);
  const { t } = useTranslation();

  async function submitAnswer() {
    if (!choice || submitting || feedback) return;
    setSubmitting(true);
    try {
      const result = await apiPost<AnswerFeedback>(`/api/attempts/${attemptId}/answer`, { questionId: question.id, answer: choice });
      setFeedback(result);
      if (heartsGated && result.heartsDepleted) {
        setOutOfHearts(true);
        return;
      }
      setResolvedNext(undefined);
      const promise = apiFetcher<NextState>(`/api/attempts/${attemptId}`);
      nextStatePromiseRef.current = promise;
      promise.then(setResolvedNext);
    } finally {
      setSubmitting(false);
    }
  }

  function applyNextQuestion(nextState: Extract<NextState, { status: "in-progress" }>) {
    setQuestion(nextState.question);
    setProgress(nextState.progress);
    setFeedback(null);
    setChoice("");
    setPendingRemediation(null);
  }

  async function next() {
    if (outOfHearts) {
      const result = await apiPost<TCompleteResult>(`/api/attempts/${attemptId}/complete`);
      onFinished(result);
      return;
    }
    setAdvancing(true);
    try {
      // Usually already resolved by the time the student finishes reading the feedback; if not,
      // this just waits on the same in-flight prefetch instead of starting a fresh one.
      const nextState = resolvedNext ?? (await nextStatePromiseRef.current!);
      if (!nextState || nextState.status !== "in-progress") {
        const result = await apiPost<TCompleteResult>(`/api/attempts/${attemptId}/complete`);
        onFinished(result);
        return;
      }
      if (nextState.remediation && content) {
        setPendingRemediation(nextState);
        setFeedback(null);
        setChoice("");
        return;
      }
      applyNextQuestion(nextState);
    } finally {
      setAdvancing(false);
    }
  }

  const isLastStep = resolvedNext !== undefined && resolvedNext.status !== "in-progress";
  const difficultyKey = `diagnostic.difficulty.${question.difficulty}` as TranslationKey;

  if (pendingRemediation && content) {
    return (
      <Card className="animate-pop-in">
        <span className="text-xs font-display px-2.5 py-1 rounded-full bg-[var(--gold-soft)] text-[var(--gold)] inline-block mb-3">
          {t("lesson.remediationBadge")}
        </span>
        <h2 className="font-display text-xl mb-2">{t("lesson.remediationTitle")}</h2>
        <p className="text-sm text-[var(--ink-soft)] mb-4">{t("lesson.remediationBody")}</p>
        <div className="mb-5">
          <LessonContentCards content={content} />
        </div>
        <RoughButton onClick={() => applyNextQuestion(pendingRemediation)} fullWidth>
          {t("lesson.remediationContinue")}
        </RoughButton>
      </Card>
    );
  }

  if (outOfHearts && feedback) {
    return (
      <Card className="text-center animate-pop-in">
        <p className="text-[var(--heart)] mb-2">
          <HeartsRow hearts={0} max={5} size={28} />
        </p>
        <h2 className="font-display text-2xl mb-2">{t("lesson.outOfHeartsShort")}</h2>
        <p className="text-sm text-[var(--ink-soft)] mb-4">{t("lesson.outOfHeartsHint")}</p>
        <RoughButton onClick={next}>{t("lesson.seeResults")}</RoughButton>
      </Card>
    );
  }

  return (
    <Card padding="p-6 md:p-8" className={feedback && !feedback.isCorrect ? "animate-shake" : ""}>
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <p className="text-xs text-[var(--ink-faint)]">
          {t("lesson.questionAdaptive", { current: progress.questionNumber, min: progress.minQuestions, max: progress.maxQuestions })}
        </p>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--ink-faint)]/10 text-[var(--ink-soft)]">{t(difficultyKey)}</span>
      </div>
      <h2 className="font-display text-xl mb-4">
        <MathText text={question.prompt} />
      </h2>

      {question.type === "FILL_BLANK" ? (
        <input
          value={choice}
          onChange={(e) => setChoice(e.target.value)}
          disabled={!!feedback}
          placeholder={t("lesson.typeAnswer")}
          className="w-full border border-[var(--border-primary)] rounded-[var(--radius-md)] px-3 py-2 bg-transparent mb-4 focus:outline-none focus:border-[var(--accent)]"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {question.options.map((opt) => {
            const isChosen = choice === opt;
            const isCorrectOpt = feedback && opt === feedback.correctAnswer;
            const isWrongChosen = feedback && isChosen && !feedback.isCorrect;
            return (
              <button
                key={opt}
                disabled={!!feedback}
                onClick={() => setChoice(opt)}
                className={`text-start px-5 py-3 rounded-xl border transition-colors ${
                  isCorrectOpt
                    ? "border-[var(--success)] bg-[var(--success-soft)]"
                    : isWrongChosen
                      ? "border-[var(--heart)] bg-[var(--heart-soft)]"
                      : isChosen
                        ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                        : "border-[var(--ink-soft)] hover:bg-[var(--accent-soft)]/40"
                }`}
              >
                <MathText text={opt} />
              </button>
            );
          })}
        </div>
      )}

      {feedback && (
        <div
          className={`flex items-start gap-2 rounded-xl p-3 mb-4 animate-pop-in ${
            feedback.isCorrect ? "bg-[var(--success-soft)] text-[var(--success)]" : "bg-[var(--heart-soft)] text-[var(--heart)]"
          }`}
        >
          {feedback.isCorrect ? <CheckIcon size={22} /> : <CrossIcon size={22} />}
          <div className="text-sm text-[var(--ink)]">
            <p className="font-display text-base mb-0.5">{feedback.isCorrect ? t("lesson.nice") : t("lesson.notQuite")}</p>
            {!feedback.isCorrect && (
              <p>
                <MathText text={feedback.explanation} />
              </p>
            )}
          </div>
        </div>
      )}

      {feedback ? (
        <RoughButton onClick={next} disabled={advancing} fullWidth>
          {advancing ? t("lesson.checking") : outOfHearts || isLastStep ? t("lesson.seeResults") : t("lesson.nextQuestion")}
        </RoughButton>
      ) : (
        <RoughButton onClick={submitAnswer} disabled={!choice || submitting} fullWidth>
          {submitting ? t("lesson.checking") : t("lesson.checkAnswer")}
        </RoughButton>
      )}
    </Card>
  );
}
