"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { RoughButton } from "@/components/ui/RoughButton";
import { HeartsRow } from "@/components/ui/HeartsRow";
import { MathText } from "@/components/ui/MathText";
import { CheckIcon, CrossIcon } from "@/components/ui/icons";
import { apiPost } from "@/lib/hooks/useApi";
import { useTranslation } from "@/lib/i18n/LocaleProvider";

export interface QuizQuestion {
  id: string;
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "FILL_BLANK";
  prompt: string;
  options: string[];
}

interface AnswerFeedback {
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string;
  hearts: number;
  heartsDepleted: boolean;
}

export function QuizRunner<TCompleteResult>({
  attemptId,
  questions,
  onFinished,
}: {
  attemptId: string;
  questions: QuizQuestion[];
  onFinished: (result: TCompleteResult) => void;
}) {
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState("");
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [outOfHearts, setOutOfHearts] = useState(false);
  const { t } = useTranslation();

  const question = questions[index];
  const isLast = index === questions.length - 1;

  async function submitAnswer() {
    if (!choice) return;
    setSubmitting(true);
    try {
      const result = await apiPost<AnswerFeedback>(`/api/attempts/${attemptId}/answer`, {
        questionId: question.id,
        answer: choice,
      });
      setFeedback(result);
      if (result.heartsDepleted) setOutOfHearts(true);
    } finally {
      setSubmitting(false);
    }
  }

  async function next() {
    setFeedback(null);
    setChoice("");
    if (isLast || outOfHearts) {
      const result = await apiPost<TCompleteResult>(`/api/attempts/${attemptId}/complete`);
      onFinished(result);
    } else {
      setIndex((i) => i + 1);
    }
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
    <Card className={feedback && !feedback.isCorrect ? "animate-shake" : ""}>
      <p className="text-xs text-[var(--ink-faint)] mb-2">{t("lesson.question", { current: index + 1, total: questions.length })}</p>
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
        <RoughButton onClick={next} fullWidth>
          {isLast || outOfHearts ? t("lesson.seeResults") : t("lesson.nextQuestion")}
        </RoughButton>
      ) : (
        <RoughButton onClick={submitAnswer} disabled={!choice || submitting} fullWidth>
          {submitting ? t("lesson.checking") : t("lesson.checkAnswer")}
        </RoughButton>
      )}
    </Card>
  );
}
