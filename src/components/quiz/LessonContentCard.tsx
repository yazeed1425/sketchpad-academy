"use client";

import "katex/dist/katex.min.css";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

export interface LessonContentSection {
  type: "concept" | "example" | "warning";
  heading: string;
  body: string;
}

const CARD_STYLE: Record<LessonContentSection["type"], { bg: string; border: string; heading: string; icon: string }> = {
  concept: { bg: "var(--info-soft)", border: "var(--info)", heading: "var(--info)", icon: "\u{1F4A1}" },
  example: { bg: "var(--card-bg)", border: "var(--border-secondary)", heading: "var(--accent)", icon: "\u{1F4DD}" },
  warning: { bg: "var(--gold-soft)", border: "var(--gold)", heading: "var(--gold)", icon: "\u{26A0}\u{FE0F}" },
};

const markdownComponents: Components = {
  p: ({ children }) => <p className="text-sm text-[var(--ink-soft)] leading-relaxed mb-2 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-display text-[var(--ink)]">{children}</strong>,
  ul: ({ children }) => <ul className="list-disc ps-5 space-y-1.5 text-sm text-[var(--ink-soft)] mb-2 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal ps-5 space-y-2.5 text-sm text-[var(--ink-soft)] mb-2 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed pb-0.5">{children}</li>,
};

/** One styled, color-coded card for a lesson-content section, rendering Markdown + LaTeX (via KaTeX). */
export function LessonContentCard({ section }: { section: LessonContentSection }) {
  const style = CARD_STYLE[section.type] ?? CARD_STYLE.concept;

  return (
    <div
      className="rounded-[var(--radius-2xl)] border p-4"
      style={{ backgroundColor: style.bg, borderColor: style.border }}
    >
      <h2 className="font-display text-base mb-2 flex items-center gap-2" style={{ color: style.heading }}>
        <span aria-hidden>{style.icon}</span>
        {section.heading}
      </h2>
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]} components={markdownComponents}>
        {section.body}
      </ReactMarkdown>
    </div>
  );
}
