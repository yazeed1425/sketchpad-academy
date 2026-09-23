"use client";

import "katex/dist/katex.min.css";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

// A single line of text that may contain inline $...$ (or $$...$$) LaTeX — rendered without
// a wrapping <p> so it drops cleanly into <li>/<button>/<div> containers. Shared by lesson
// content cards, diagnostic questions, and quiz questions — anywhere Gemini-authored text
// may carry math notation instead of plain digits.
const components: Components = {
  p: ({ children }) => <>{children}</>,
  strong: ({ children }) => <strong className="font-display">{children}</strong>,
};

// Gemini occasionally emits a bare LaTeX command (e.g. a whole option that's just
// `\frac{1}{9}`, no surrounding $) despite the prompt rule — remark-math then never
// recognizes it as math, and the raw source leaks straight to the screen. If a string has
// no `$` at all but clearly contains LaTeX syntax, treat the whole thing as one math
// expression instead of showing the user backslash-command soup.
const LOOKS_LIKE_BARE_LATEX = /\\(frac|sqrt|cdot|times|div|le|ge|neq|pm|approx)\b|\^\{|_\{/;

function ensureMathDelimited(text: string): string {
  if (text.includes("$") || !LOOKS_LIKE_BARE_LATEX.test(text)) return text;
  return `$${text}$`;
}

export function MathText({ text, className = "" }: { text: string; className?: string }) {
  return (
    <span className={className}>
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]} components={components}>
        {ensureMathDelimited(text)}
      </ReactMarkdown>
    </span>
  );
}
