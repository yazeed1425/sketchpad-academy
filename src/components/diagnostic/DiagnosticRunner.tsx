"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { RoughButton } from "@/components/ui/RoughButton";
import { ClockIcon, CheckIcon, CrossIcon } from "@/components/ui/icons";
import { apiPost } from "@/lib/hooks/useApi";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import type { TranslationKey } from "@/lib/i18n/translations";

export interface DiagnosticQuestionView {
  id: string;
  domain: "QUANTITATIVE" | "VERBAL";
  subSkill: "ARITHMETIC" | "ALGEBRA" | "GEOMETRY" | "ANALOGIES" | "CONTEXTUAL_ERRORS" | "READING_COMPREHENSION";
  difficulty: "EASY" | "MEDIUM" | "HARD";
  prompt: string;
  options: string[];
  timeLimitSec: number;
}

interface Progress {
  current: number;
  total: number;
}

interface AnswerFeedback {
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string;
}

type NextState =
  | { status: "in-progress"; attemptId: string; progress: Progress; question: DiagnosticQuestionView }
  | { status: "ready-to-complete"; attemptId: string }
  | { status: "completed"; attemptId: string; report: unknown };

export function DiagnosticRunner({
  attemptId,
  initialQuestion,
  initialProgress,
  onFinished,
}: {
  attemptId: string;
  initialQuestion: DiagnosticQuestionView;
  initialProgress: Progress;
  onFinished: () => void;
}) {
  const [question, setQuestion] = useState(initialQuestion);
  const [progress, setProgress] = useState(initialProgress);
  const [choice, setChoice] = useState("");
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(initialQuestion.timeLimitSec);
  const [timedQuestionId, setTimedQuestionId] = useState(initialQuestion.id);
  const startedAtRef = useRef(Date.now());
  const { t } = useTranslation();

  // Reset the timer whenever a new question is shown — adjusted during render (not an
  // effect) per React's "resetting state when a prop changes" pattern.
  if (question.id !== timedQuestionId) {
    setTimedQuestionId(question.id);
    setTimeLeft(question.timeLimitSec);
    startedAtRef.current = Date.now();
  }

  useEffect(() => {
    if (feedback) return;
    const interval = setInterval(() => setTimeLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(interval);
  }, [feedback, question]);

  useEffect(() => {
    if (timeLeft === 0 && !feedback && !submitting) submitAnswer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  async function submitAnswer() {
    if (submitting || feedback) return;
    setSubmitting(true);
    const timeTakenSec = Math.round((Date.now() - startedAtRef.current) / 1000);
    try {
      const result = await apiPost<{ feedback: AnswerFeedback; next: NextState }>(`/api/diagnostic/${attemptId}/answer`, {
        questionId: question.id,
        answer: choice,
        timeTakenSec,
      });
      setFeedback(result.feedback);
      // progress/question only advance once "next" is clicked, so the feedback step
      // keeps showing the question that was just answered.
      pendingNext.current = result.next;
    } finally {
      setSubmitting(false);
    }
  }

  const pendingNext = useRef<NextState | null>(null);

  function next() {
    const nextState = pendingNext.current;
    setFeedback(null);
    setChoice("");
    if (!nextState || nextState.status !== "in-progress") {
      onFinished();
      return;
    }
    setQuestion(nextState.question);
    setProgress(nextState.progress);
  }

  const isLastStep = progress.current >= progress.total;
  const domainKey = `diagnostic.domain.${question.domain}` as TranslationKey;
  const subSkillKey = `diagnostic.subSkill.${question.subSkill}` as TranslationKey;
  const difficultyKey = `diagnostic.difficulty.${question.difficulty}` as TranslationKey;

  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-display px-2.5 py-1 rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
            {t(domainKey)}
          </span>
          <span className="text-xs font-display px-2.5 py-1 rounded-full bg-[var(--info-soft)] text-[var(--info)]">
            {t(subSkillKey)}
          </span>
          <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--ink-faint)]/10 text-[var(--ink-soft)]">
            {t(difficultyKey)}
          </span>
        </div>
        <span
          className={`flex items-center gap-1 text-sm font-display px-2.5 py-1 rounded-full ${
            timeLeft <= 10 ? "bg-[var(--heart-soft)] text-[var(--heart)]" : "bg-[var(--ink-faint)]/10 text-[var(--ink-soft)]"
          }`}
        >
          <ClockIcon size={16} /> {t("diagnostic.timeLeft", { seconds: timeLeft })}
        </span>
      </div>

      <Card className={feedback && !feedback.isCorrect ? "animate-shake" : ""}>
        <p className="text-xs text-[var(--ink-faint)] mb-2">{t("diagnostic.question", { current: progress.current, total: progress.total })}</p>
        <h2 className="font-display text-xl mb-4">{question.prompt}</h2>

        <div className="grid gap-2 mb-4">
          {question.options.map((opt) => {
            const isChosen = choice === opt;
            const isCorrectOpt = feedback && opt === feedback.correctAnswer;
            const isWrongChosen = feedback && isChosen && !feedback.isCorrect;
            return (
              <button
                key={opt}
                disabled={!!feedback}
                onClick={() => setChoice(opt)}
                className={`text-start px-4 py-2.5 rounded-xl border transition-colors ${
                  isCorrectOpt
                    ? "border-[var(--success)] bg-[var(--success-soft)]"
                    : isWrongChosen
                      ? "border-[var(--heart)] bg-[var(--heart-soft)]"
                      : isChosen
                        ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                        : "border-[var(--ink-soft)] hover:bg-[var(--accent-soft)]/40"
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {feedback && (
          <div
            className={`flex items-start gap-2 rounded-xl p-3 mb-4 animate-pop-in ${
              feedback.isCorrect ? "bg-[var(--success-soft)] text-[var(--success)]" : "bg-[var(--heart-soft)] text-[var(--heart)]"
            }`}
          >
            {feedback.isCorrect ? <CheckIcon size={22} /> : <CrossIcon size={22} />}
            <div className="text-sm text-[var(--ink)]">
              <p className="font-display text-base mb-0.5">{feedback.isCorrect ? t("diagnostic.nice") : t("diagnostic.notQuite")}</p>
              <p>{feedback.explanation}</p>
            </div>
          </div>
        )}

        {feedback ? (
          <RoughButton onClick={next} fullWidth>
            {isLastStep ? t("diagnostic.seeReport") : t("diagnostic.nextQuestion")}
          </RoughButton>
        ) : (
          <RoughButton onClick={submitAnswer} disabled={!choice || submitting} fullWidth>
            {submitting ? t("diagnostic.checking") : t("diagnostic.checkAnswer")}
          </RoughButton>
        )}
      </Card>
    </div>
  );
}
