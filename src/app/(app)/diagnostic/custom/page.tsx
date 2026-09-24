"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { RoughButton } from "@/components/ui/RoughButton";
import { FileTextIcon, ChevronLeftIcon, CrossIcon, TargetIcon } from "@/components/ui/icons";
import { CustomDiagnosticRunner, type CustomDiagnosticQuestionView } from "@/components/diagnostic/CustomDiagnosticRunner";
import { CustomDiagnosticReport, type CustomDiagnosticReportData } from "@/components/diagnostic/CustomDiagnosticReport";
import { apiPost, apiPostForm } from "@/lib/hooks/useApi";
import { useProfile } from "@/lib/hooks/useProfile";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import { ALLOWED_UPLOAD_MIME_TYPES, MAX_UPLOAD_BYTES } from "@/lib/gamification/customDiagnostic";

interface Progress {
  questionNumber: number;
  topicCount: number;
}

type State =
  | { phase: "intro" }
  | { phase: "starting" }
  | { phase: "running"; attemptId: string; question: CustomDiagnosticQuestionView; progress: Progress }
  | { phase: "completing" }
  | { phase: "completed"; report: CustomDiagnosticReportData }
  | { phase: "error"; message: string };

type StartResponse =
  | { status: "in-progress"; attemptId: string; progress: Progress; question: CustomDiagnosticQuestionView }
  | { status: "ready-to-complete"; attemptId: string }
  | { status: "completed"; attemptId: string; report: CustomDiagnosticReportData };

export default function CustomDiagnosticPage() {
  const [state, setState] = useState<State>({ phase: "intro" });
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mutate: refreshProfile } = useProfile();
  const { t } = useTranslation();

  const maxMb = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024));

  function validateAndSetFile(candidate: File) {
    if (!ALLOWED_UPLOAD_MIME_TYPES.includes(candidate.type as (typeof ALLOWED_UPLOAD_MIME_TYPES)[number])) {
      setFileError(t("diagnostic.custom.upload.error.invalidType"));
      return;
    }
    if (candidate.size > MAX_UPLOAD_BYTES) {
      setFileError(t("diagnostic.custom.upload.error.tooLarge", { maxMb }));
      return;
    }
    setFileError(null);
    setFile(candidate);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) validateAndSetFile(dropped);
  }

  async function handleStart() {
    if (!file) return;
    setState({ phase: "starting" });
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await apiPostForm<StartResponse>("/api/diagnostic/custom/start", formData);
      await applyState(result);
    } catch (err) {
      setState({ phase: "error", message: err instanceof Error ? err.message : t("diagnostic.custom.error.generic") });
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
      const { report } = await apiPost<{ report: CustomDiagnosticReportData }>(`/api/diagnostic/custom/${attemptId}/complete`);
      refreshProfile();
      setState({ phase: "completed", report });
    } catch (err) {
      setState({ phase: "error", message: err instanceof Error ? err.message : t("diagnostic.custom.error.generic") });
    }
  }

  async function handleQuestionsFinished() {
    if (state.phase !== "running") return;
    await completeAttempt(state.attemptId);
  }

  if (state.phase === "running") {
    return (
      <CustomDiagnosticRunner
        attemptId={state.attemptId}
        initialQuestion={state.question}
        initialProgress={state.progress}
        onFinished={handleQuestionsFinished}
      />
    );
  }

  if (state.phase === "starting" || state.phase === "completing") {
    const isStarting = state.phase === "starting";
    return (
      <Card className="max-w-lg mx-auto text-center">
        <span className="inline-flex bg-[var(--accent-soft)] text-[var(--accent)] rounded-2xl p-3 mb-3">
          <TargetIcon size={30} />
        </span>
        <h1 className="font-display text-xl mb-2">
          {isStarting ? t("diagnostic.custom.analyzing.title") : t("diagnostic.custom.completing.title")}
        </h1>
        <p className="text-sm text-[var(--ink-soft)]">
          {isStarting ? t("diagnostic.custom.analyzing.body") : t("diagnostic.custom.completing.body")}
        </p>
      </Card>
    );
  }

  if (state.phase === "completed") {
    return <CustomDiagnosticReport report={state.report} />;
  }

  if (state.phase === "error") {
    return (
      <Card className="max-w-lg mx-auto text-center">
        <p className="text-[var(--heart)] mb-4">{state.message}</p>
        <RoughButton onClick={() => setState({ phase: "intro" })}>{t("diagnostic.custom.error.retry")}</RoughButton>
      </Card>
    );
  }

  return (
    <Card className="max-w-lg mx-auto">
      <Link href="/diagnostic" className="btn-secondary-gray inline-flex items-center gap-1 text-sm mb-4">
        <ChevronLeftIcon size={14} />
        {t("diagnostic.intro.title")}
      </Link>

      <div className="text-center mb-4">
        <span className="inline-flex bg-[var(--info-soft)] text-[var(--info)] rounded-2xl p-3 mb-3">
          <FileTextIcon size={30} />
        </span>
        <h1 className="font-display text-xl mb-1">{t("diagnostic.custom.upload.title")}</h1>
        <p className="text-sm text-[var(--ink-soft)]">{t("diagnostic.custom.upload.body")}</p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="rounded-[var(--radius-2xl)] border-2 border-dashed p-8 text-center cursor-pointer transition-colors"
        style={{
          borderColor: isDragging ? "var(--accent)" : "var(--border-primary)",
          background: isDragging ? "var(--accent-soft)" : "var(--paper)",
        }}
      >
        {file ? (
          <div>
            <p className="text-sm font-medium text-[var(--ink)] mb-2">{t("diagnostic.custom.upload.selectedFile", { fileName: file.name })}</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
              }}
              className="inline-flex items-center gap-1 text-xs text-[var(--heart)] underline"
            >
              <CrossIcon size={12} />
              {t("diagnostic.custom.upload.remove")}
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-[var(--ink-soft)] mb-3">{t("diagnostic.custom.upload.dropHint")}</p>
            <span className="btn-secondary-color inline-flex">{t("diagnostic.custom.upload.browseButton")}</span>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_UPLOAD_MIME_TYPES.join(",")}
          className="hidden"
          onChange={(e) => {
            const selected = e.target.files?.[0];
            if (selected) validateAndSetFile(selected);
          }}
        />
      </div>

      {fileError && <p className="text-sm text-[var(--heart)] mt-2">{fileError}</p>}

      <RoughButton onClick={handleStart} disabled={!file} fullWidth className="mt-4">
        {t("diagnostic.custom.intro.start")}
      </RoughButton>
    </Card>
  );
}
