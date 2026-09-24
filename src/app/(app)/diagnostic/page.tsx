"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { RoughButton } from "@/components/ui/RoughButton";
import { TargetIcon, CheckIcon, ClockIcon } from "@/components/ui/icons";
import { DiagnosticRunner, type DiagnosticQuestionView } from "@/components/diagnostic/DiagnosticRunner";
import { DiagnosticReport, type DiagnosticReportData } from "@/components/diagnostic/DiagnosticReport";
import { apiPost } from "@/lib/hooks/useApi";
import { useProfile } from "@/lib/hooks/useProfile";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import { MAX_TOTAL_QUESTIONS, TIME_LIMIT_SEC } from "@/lib/gamification/diagnostic";

interface Progress {
  questionNumber: number;
  subSkillNumber: number;
  totalSubSkills: number;
}

type State =
  | { phase: "intro" }
  | { phase: "starting" }
  | { phase: "running"; attemptId: string; question: DiagnosticQuestionView; progress: Progress }
  | { phase: "completing" }
  | { phase: "completed"; report: DiagnosticReportData }
  | { phase: "error"; message: string };

type StartResponse =
  | { status: "in-progress"; attemptId: string; progress: Progress; question: DiagnosticQuestionView }
  | { status: "ready-to-complete"; attemptId: string }
  | { status: "completed"; attemptId: string; report: DiagnosticReportData };

export default function DiagnosticPage() {
  const [state, setState] = useState<State>({ phase: "intro" });
  const { mutate: refreshProfile } = useProfile();
  const { t } = useTranslation();

  async function handleStart() {
    setState({ phase: "starting" });
    try {
      const result = await apiPost<StartResponse>("/api/diagnostic/start");
      await applyState(result);
    } catch (err) {
      setState({ phase: "error", message: err instanceof Error ? err.message : "Something went wrong" });
    }
  }

  async function applyState(result: StartResponse) {
    if (result.status === "in-progress") {
      setState({ phase: "running", attemptId: result.attemptId, question: result.question, progress: result.progress });
    } else if (result.status === "ready-to-complete") {
      await completeAttempt(result.attemptId);
    } else {
      setState({ phase: "completed", report: result.report });
    }
  }

  async function completeAttempt(attemptId: string) {
    setState({ phase: "completing" });
    try {
      const { report } = await apiPost<{ report: DiagnosticReportData }>(`/api/diagnostic/${attemptId}/complete`);
      refreshProfile();
      setState({ phase: "completed", report });
    } catch (err) {
      setState({ phase: "error", message: err instanceof Error ? err.message : "Something went wrong" });
    }
  }

  async function handleQuestionsFinished() {
    if (state.phase !== "running") return;
    await completeAttempt(state.attemptId);
  }

  if (state.phase === "running") {
    return (
      <DiagnosticRunner
        attemptId={state.attemptId}
        initialQuestion={state.question}
        initialProgress={state.progress}
        onFinished={handleQuestionsFinished}
      />
    );
  }

  if (state.phase === "completing") {
    return (
      <Card className="max-w-lg mx-auto text-center">
        <span className="inline-flex bg-[var(--accent-soft)] text-[var(--accent)] rounded-2xl p-3 mb-3">
          <TargetIcon size={30} />
        </span>
        <h1 className="font-display text-xl mb-2">{t("diagnostic.completing.title")}</h1>
        <p className="text-sm text-[var(--ink-soft)]">{t("diagnostic.completing.body")}</p>
      </Card>
    );
  }

  if (state.phase === "completed") {
    return <DiagnosticReport report={state.report} />;
  }

  if (state.phase === "error") {
    return <p className="text-[var(--heart)]">{state.message}</p>;
  }

  return (
    <Card className="max-w-lg mx-auto text-center">
      <span className="inline-flex bg-[var(--accent-soft)] text-[var(--accent)] rounded-2xl p-3 mb-3">
        <TargetIcon size={30} />
      </span>
      <h1 className="font-display text-2xl mb-2">{t("diagnostic.intro.title")}</h1>
      <p className="text-sm text-[var(--ink-soft)] mb-4">{t("diagnostic.intro.body")}</p>

      <ul className="text-sm text-start space-y-2 mb-5 max-w-xs mx-auto">
        <li className="flex items-center gap-2">
          <ClockIcon size={16} className="text-[var(--accent)] shrink-0" />
          {t("diagnostic.intro.point1", { count: MAX_TOTAL_QUESTIONS, minutes: Math.round((MAX_TOTAL_QUESTIONS * TIME_LIMIT_SEC) / 60) })}
        </li>
        <li className="flex items-center gap-2">
          <CheckIcon size={16} className="text-[var(--success)] shrink-0" />
          {t("diagnostic.intro.point2")}
        </li>
        <li className="flex items-center gap-2">
          <CheckIcon size={16} className="text-[var(--success)] shrink-0" />
          {t("diagnostic.intro.point3")}
        </li>
      </ul>

      <RoughButton onClick={handleStart} disabled={state.phase === "starting"} fullWidth>
        {state.phase === "starting" ? t("diagnostic.intro.starting") : t("diagnostic.intro.start")}
      </RoughButton>
    </Card>
  );
}
