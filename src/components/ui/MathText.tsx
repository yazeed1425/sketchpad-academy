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

export function MathText({ text, className = "" }: { text: string; className?: string }) {
  return (
    <span className={className}>
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]} components={components}>
        {text}
      </ReactMarkdown>
    </span>
  );
}
