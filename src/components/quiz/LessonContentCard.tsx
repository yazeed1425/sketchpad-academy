"use client";

import { MathText } from "@/components/ui/MathText";

export interface LessonContent {
  concept: { title: string; explanation_points: string[]; formula: string };
  example: { title: string; question: string; steps: string[]; pro_tip: string; image_url?: string };
  common_mistake: { title: string; mistake: string; correction: string };
}

function ConceptCard({ data }: { data: LessonContent["concept"] }) {
  return (
    <div className="w-full rounded-[var(--radius-2xl)] border p-6 md:p-8" style={{ backgroundColor: "var(--info-soft)", borderColor: "var(--info)" }}>
      <h2 className="font-display text-lg mb-4" style={{ color: "var(--info)" }}>
        {data.title}
      </h2>
      {data.explanation_points.length > 0 && (
        <ul className="list-disc ps-5 space-y-2.5 text-base text-[var(--ink-soft)] mb-5">
          {data.explanation_points.map((point, i) => (
            <li key={i} className="leading-relaxed">
              <MathText text={point} />
            </li>
          ))}
        </ul>
      )}
      {data.formula && (
        <div
          className="rounded-[var(--radius-lg)] px-5 py-4 text-center"
          style={{ backgroundColor: "color-mix(in srgb, var(--info) 10%, var(--card-bg))" }}
        >
          <MathText text={`$$${data.formula}$$`} />
        </div>
      )}
    </div>
  );
}

function ExampleCard({ data }: { data: LessonContent["example"] }) {
  return (
    <div
      className="w-full rounded-[var(--radius-2xl)] border p-6 md:p-8"
      style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--border-secondary)" }}
    >
      <h2 className="font-display text-lg mb-4" style={{ color: "var(--accent)" }}>
        {data.title}
      </h2>

      <p className="text-base text-[var(--ink)] font-display mb-4 leading-relaxed">
        <MathText text={data.question} />
      </p>

      {data.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={data.image_url} alt="" className="w-full rounded-[var(--radius-lg)] border border-[var(--border-secondary)] mb-5" />
      )}

      {data.steps.length > 0 && (
        <ol className="list-decimal ps-5 space-y-3 text-base text-[var(--ink-soft)] mb-5">
          {data.steps.map((step, i) => (
            <li key={i} className="leading-relaxed pb-0.5">
              <MathText text={step} />
            </li>
          ))}
        </ol>
      )}

      {data.pro_tip && (
        <div className="rounded-[var(--radius-lg)] px-5 py-4" style={{ backgroundColor: "var(--success-soft)" }}>
          <p className="text-base font-display" style={{ color: "var(--success)" }}>
            <MathText text={data.pro_tip} />
          </p>
        </div>
      )}
    </div>
  );
}

function CommonMistakeCard({ data }: { data: LessonContent["common_mistake"] }) {
  return (
    <div className="w-full rounded-[var(--radius-2xl)] border p-6 md:p-8" style={{ backgroundColor: "var(--gold-soft)", borderColor: "var(--gold)" }}>
      <h2 className="font-display text-lg mb-4" style={{ color: "var(--gold)" }}>
        {data.title}
      </h2>
      <p className="text-base text-[var(--ink-soft)] leading-relaxed mb-3">
        <MathText text={data.mistake} />
      </p>
      <p className="text-base text-[var(--ink)] font-display leading-relaxed">
        <MathText text={`✅ ${data.correction}`} />
      </p>
    </div>
  );
}

/** The three fixed, color-coded lesson-content cards (concept, worked example, common mistake). */
export function LessonContentCards({ content }: { content: LessonContent }) {
  return (
    <div className="w-full space-y-6">
      <ConceptCard data={content.concept} />
      <ExampleCard data={content.example} />
      <CommonMistakeCard data={content.common_mistake} />
    </div>
  );
}
