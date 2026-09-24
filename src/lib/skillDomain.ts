// Skills don't carry an explicit quantitative/verbal domain field — this classifies a
// (possibly LLM-paraphrased) skill title using the same vocabulary markers that appear in
// the 7 canonical verbal baseline topics (see COMPREHENSIVE_VERBAL_TOPICS in gemini.ts).
// Anything that doesn't match a verbal marker defaults to quantitative, since 16 of the 23
// baseline topics are quantitative and generated titles reliably keep at least one marker.
const VERBAL_MARKERS = ["لفظي", "تناظر", "مقروء", "مفردة", "سياق", "الجمل", "الجملة", "ضمائر"];

export type SkillDomain = "quantitative" | "verbal";

export function classifySkillDomain(title: string): SkillDomain {
  return VERBAL_MARKERS.some((marker) => title.includes(marker)) ? "verbal" : "quantitative";
}
