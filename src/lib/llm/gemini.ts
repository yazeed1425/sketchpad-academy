// Thin client for the Gemini API: generates diagnostic test questions and evaluates a
// finished attempt. Plain fetch + a strict responseSchema (no SDK) since this is the
// only place in the app that talks to an LLM.
import type { $Enums } from "@/generated/prisma/client";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

function apiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured");
  return key;
}

function model(): string {
  return process.env.GEMINI_MODEL || "gemini-2.5-flash";
}

/**
 * Gemini's JSON output occasionally emits a bare backslash before a LaTeX command starting with
 * t/f/n/r/b (\times, \tan, \text, \theta, \frac, \nabla...) without escaping the backslash
 * itself for JSON. Those five letters happen to also be real JSON string escapes (tab, form
 * feed, newline, carriage return, backspace), so JSON.parse silently swallows the backslash and
 * that one letter into a control character instead of erroring — corrupting the LaTeX invisibly
 * (e.g. "\times" becomes a tab character followed by "imes", which MathText then renders as
 * literal garbled text). None of our generated fields legitimately need a raw control character,
 * so escape any such backslash that isn't already escaped, before parsing.
 */
function fixUnescapedLatexBackslashes(rawText: string): string {
  return rawText.replace(/(?<!\\)\\([tfnrb])/g, "\\\\$1");
}

async function generateJson<T>(
  prompt: string,
  responseSchema: object,
  extraParts: { inlineData: { mimeType: string; data: string } }[] = []
): Promise<T> {
  const res = await fetch(`${API_BASE}/${model()}:generateContent?key=${apiKey()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }, ...extraParts] }],
      generationConfig: { responseMimeType: "application/json", responseSchema },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini request failed (${res.status}): ${body.slice(0, 500)}`);
  }

  const data = await res.json();
  const text: string | undefined = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned an empty response");

  try {
    return JSON.parse(fixUnescapedLatexBackslashes(text)) as T;
  } catch {
    throw new Error("Gemini returned malformed JSON");
  }
}

const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMENSIONS = 3072; // must match the dimension the Supabase question bank's vectors were stored at

/** Embeds text for RAG lookups against the Supabase question bank (same model/dimension the bank itself uses). */
export async function generateEmbedding(text: string): Promise<number[]> {
  const res = await fetch(`${API_BASE}/${EMBEDDING_MODEL}:embedContent?key=${apiKey()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: { parts: [{ text }] },
      outputDimensionality: EMBEDDING_DIMENSIONS,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini embedding request failed (${res.status}): ${body.slice(0, 500)}`);
  }

  const data = await res.json();
  const values: number[] | undefined = data.embedding?.values;
  if (!values) throw new Error("Gemini returned no embedding values");
  return values;
}

export const SUBSKILL_LABEL_AR: Record<$Enums.DiagnosticSubSkill, string> = {
  ARITHMETIC: "الحساب",
  ALGEBRA: "الجبر",
  GEOMETRY: "الهندسة",
  ANALOGIES: "التناظر اللفظي",
  CONTEXTUAL_ERRORS: "الخطأ السياقي",
  READING_COMPREHENSION: "استيعاب المقروء",
};

const DOMAIN_LABEL_AR: Record<$Enums.DiagnosticDomain, string> = {
  QUANTITATIVE: "الكمي",
  VERBAL: "اللفظي",
};

const DIFFICULTY_LABEL_AR: Record<$Enums.DiagnosticDifficulty, string> = {
  EASY: "سهل",
  MEDIUM: "متوسط",
  HARD: "صعب",
};

// Shared across every prompt that may need to express math (question prompts, options,
// explanations, lesson content) — renders via MathText (react-markdown + remark-math +
// rehype-katex), never plain caret/slash notation which shows up as literal text.
const MATH_FORMATTING_RULE = `قواعد صارمة لكتابة الرموز الرياضية: أي رمز أو رقم أو متغير رياضي (خصوصاً الأسس والكسور والجذور) يُكتب بصيغة LaTeX بين علامتي $ فقط داخل الجمل، مثل $س^2$ أو $\\frac{١}{٢}$ أو $\\sqrt{٩}$ أو $٢٠\\%$ — ممنوع استخدام رمز ^ أو / أو أي نص عادي للأسس والكسور مطلقاً.
اكتب كل رقم داخل علامتي $ بالأرقام الهندية العربية (٠١٢٣٤٥٦٧٨٩) حصراً، ممنوع استخدام الأرقام اللاتينية (0123456789) داخل الرياضيات إطلاقاً.
استخدم متغيرات عربية بدل اللاتينية: س بدلاً من x، وص بدلاً من y، وع بدلاً من z إذا احتجت متغيراً ثالثاً، وهكذا لأي متغير آخر تحتاجه.
يُسمح داخل علامتي $ فقط بالأرقام الهندية والمتغيرات العربية المفردة (مثل س، ص، ع) ورموز العمليات الرياضية وأوامر LaTeX — ممنوع وضع أي كلمة أو جملة عربية كاملة (شرح أو وصف) داخل علامتي $، فقط الرموز والمتغيرات المفردة.
لا تستخدم LaTeX في مواضيع لغوية بحتة لا تحتاجه.`;

export interface GeneratedDistractor {
  option: string;
  // A short label for the misconception/error pattern this wrong option represents (e.g. "sign
  // error", "confused radius with diameter") — stored as QuestionResponse.misconceptionTag /
  // DiagnosticResponse.misconceptionTag when a student picks it, for future analytics/badges.
  misconception: string;
  // One sentence explaining specifically why THIS option is wrong — shown to a student who
  // picked it instead of the generic "why the correct answer is right" explanation (Section 3.3
  // / Appendix D of the gamification research: diagnostic, choice-specific feedback).
  whyWrong: string;
}

export interface GeneratedQuestion {
  prompt: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  // Rationale for each of the 3 incorrect options — see GeneratedDistractor. Always requested,
  // but callers (buildDistractorRationaleMap) tolerate a missing/malformed entry per option and
  // simply fall back to the generic `explanation` for that option.
  distractors: GeneratedDistractor[];
}

/** Shared by every generate*Question function — all use QUESTION_SCHEMA. */
function validateGeneratedQuestion(result: GeneratedQuestion): void {
  if (!result.options.includes(result.correctAnswer)) {
    const trimmedMatch = result.options.find((o) => o.trim() === result.correctAnswer.trim());
    if (!trimmedMatch) throw new Error("Gemini's correctAnswer did not match any of its own options");
    result.correctAnswer = trimmedMatch;
  }
  if (result.options.length !== 4) throw new Error("Gemini did not return exactly 4 options");

  // Distractor rationale is a nice-to-have on top of a valid question, not a hard requirement —
  // drop anything that doesn't cleanly match one of the actual wrong options (by exact or
  // trimmed text) instead of failing the whole question over it.
  const wrongOptions = result.options.filter((o) => o !== result.correctAnswer);
  result.distractors = (result.distractors ?? [])
    .map((d) => {
      const match = wrongOptions.find((o) => o === d.option || o.trim() === d.option.trim());
      return match ? { ...d, option: match } : null;
    })
    .filter((d): d is GeneratedDistractor => d !== null);
}

/** Builds a {optionText: {misconception, whyWrong}} lookup for persisting as *.distractorRationaleJson, for O(1) lookup at answer time. */
export function buildDistractorRationaleMap(distractors: GeneratedDistractor[]): Record<string, { misconception: string; whyWrong: string }> {
  const map: Record<string, { misconception: string; whyWrong: string }> = {};
  for (const d of distractors) map[d.option] = { misconception: d.misconception, whyWrong: d.whyWrong };
  return map;
}

/**
 * Looks up the stored rationale for a specific chosen wrong option out of a persisted
 * *.distractorRationaleJson column, returning both the misconception tag to persist on the
 * response and a choice-specific explanation. Falls back to the question's generic explanation
 * when there's no rationale for this exact option (a question generated before Phase 3, a
 * FILL_BLANK question, or an option Gemini's distractor list didn't cover) — used by
 * quizService.submitAnswer, diagnosticService.submitDiagnosticAnswer, and
 * customDiagnosticService.submitCustomDiagnosticAnswer alike.
 */
export function lookupDistractorRationale(
  distractorRationaleJson: string | null,
  chosenAnswer: string,
  fallbackExplanation: string
): { explanation: string; misconceptionTag: string | null } {
  if (!distractorRationaleJson) return { explanation: fallbackExplanation, misconceptionTag: null };
  try {
    const map = JSON.parse(distractorRationaleJson) as Record<string, { misconception: string; whyWrong: string }>;
    const entry = map[chosenAnswer];
    if (!entry) return { explanation: fallbackExplanation, misconceptionTag: null };
    return { explanation: entry.whyWrong, misconceptionTag: entry.misconception };
  } catch {
    return { explanation: fallbackExplanation, misconceptionTag: null };
  }
}

const QUESTION_SCHEMA = {
  type: "OBJECT",
  properties: {
    prompt: { type: "STRING" },
    options: { type: "ARRAY", items: { type: "STRING" }, minItems: 4, maxItems: 4 },
    correctAnswer: { type: "STRING" },
    explanation: { type: "STRING" },
    distractors: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          option: { type: "STRING" },
          misconception: { type: "STRING" },
          whyWrong: { type: "STRING" },
        },
        required: ["option", "misconception", "whyWrong"],
      },
      minItems: 3,
      maxItems: 3,
    },
  },
  required: ["prompt", "options", "correctAnswer", "explanation", "distractors"],
};

const DISTRACTOR_RULE = `لكل واحد من الخيارات الثلاثة الخاطئة (غير correctAnswer)، أضف كائناً في distractors يحدد:
- option: نص الخيار الخاطئ حرفياً كما يظهر في options.
- misconception: تصنيف قصير جداً (2-4 كلمات) للخطأ المفاهيمي أو الحسابي الذي يقود لاختيار هذا الخيار تحديداً (مثال: "خطأ في الإشارة"، "الخلط بين نصف القطر والقطر"، "نسيان ترتيب العمليات").
- whyWrong: جملة واحدة تشرح تحديداً لماذا هذا الخيار بالذات خاطئ (ما الخطأ الذي يقود له)، لا لماذا الإجابة الصحيحة صحيحة.
اجعل كل خيار خاطئ ينتج فعلياً عن خطأ منطقي أو حسابي واقعي وشائع عند الطلاب في هذا الموضوع تحديداً، وليس رقماً عشوائياً — كل مشتت (distractor) يجب أن يقابل مساراً حسابياً فعلياً يوصل لذلك الرقم لو أخطأ الطالب بالطريقة الموصوفة.`;

/** Generates one fresh multiple-choice question for a sub-skill/difficulty, in Arabic. */
export async function generateDiagnosticQuestion(params: {
  domain: $Enums.DiagnosticDomain;
  subSkill: $Enums.DiagnosticSubSkill;
  difficulty: $Enums.DiagnosticDifficulty;
  avoidPrompts: string[];
}): Promise<GeneratedQuestion> {
  const avoid = params.avoidPrompts.length
    ? `\nتجنّب تكرار أو مشابهة هذه الأسئلة السابقة في نفس الاختبار:\n${params.avoidPrompts.map((p) => `- ${p}`).join("\n")}`
    : "";

  const prompt = `أنت خبير في تصميم أسئلة اختبار القدرات العامة (GAT) السعودي.
أنشئ سؤال اختيار من متعدد باللغة العربية الفصحى لقياس مهارة "${SUBSKILL_LABEL_AR[params.subSkill]}" ضمن القسم ${DOMAIN_LABEL_AR[params.domain]}، بمستوى صعوبة "${DIFFICULTY_LABEL_AR[params.difficulty]}".
المتطلبات:
- أربعة خيارات فقط، خيار واحد صحيح فقط.
- correctAnswer يجب أن يطابق نص أحد الخيارات الأربعة حرفياً تماماً (نفس الأحرف والمسافات).
- السؤال مناسب لطالب ثانوي سعودي يستعد لاختبار القدرات.
- اجعل الشرح (explanation) جملة أو جملتين توضح سبب صحة الإجابة.
${DISTRACTOR_RULE}
${MATH_FORMATTING_RULE}${avoid}
أعد النتيجة بصيغة JSON فقط حسب المخطط المطلوب، بدون أي نص إضافي.`;

  const result = await generateJson<GeneratedQuestion>(prompt, QUESTION_SCHEMA);
  validateGeneratedQuestion(result);
  return result;
}

export interface DiagnosticReference {
  question: string;
  options?: string[];
  correctAnswer?: string;
  explanation?: string;
}

/**
 * Generates a fresh multiple-choice question by mutating a real reference question pulled via
 * RAG from the Supabase GAT question bank — new numbers/names/context but the same underlying
 * skill, concept and difficulty, instead of inventing a question from nothing. The caller
 * (diagnosticService) falls back to generateDiagnosticQuestion when no reference is available.
 */
export async function generateMutatedDiagnosticQuestion(params: {
  domain: $Enums.DiagnosticDomain;
  subSkill: $Enums.DiagnosticSubSkill;
  difficulty: $Enums.DiagnosticDifficulty;
  reference: DiagnosticReference;
  avoidPrompts: string[];
}): Promise<GeneratedQuestion> {
  const avoid = params.avoidPrompts.length
    ? `\nتجنّب تكرار أو مشابهة هذه الأسئلة السابقة في نفس الاختبار:\n${params.avoidPrompts.map((p) => `- ${p}`).join("\n")}`
    : "";
  const referenceOptionsBlock = params.reference.options?.length
    ? `\nخياراته الأصلية: ${params.reference.options.join(" / ")}${params.reference.correctAnswer ? ` (الصحيح: ${params.reference.correctAnswer})` : ""}`
    : "";
  const referenceExplanationBlock = params.reference.explanation ? `\nشرح الحل الأصلي: "${params.reference.explanation}"` : "";

  const prompt = `أنت خبير في تصميم أسئلة اختبار القدرات العامة (GAT) السعودي.
فيما يلي سؤال حقيقي من بنك أسئلة القدرات لمهارة "${SUBSKILL_LABEL_AR[params.subSkill]}" ضمن القسم ${DOMAIN_LABEL_AR[params.domain]}:
نص السؤال المرجعي: "${params.reference.question}"${referenceOptionsBlock}${referenceExplanationBlock}

مهمتك: أنشئ سؤالاً جديداً بنفس الفكرة والمفهوم الرياضي وأسلوب الحل تماماً، لكن غيّر الأرقام والأسماء والسياق بحيث يبدو سؤالاً مختلفاً وليس نسخة معدّلة بشكل واضح عن الأصل. أعد حساب الإجابة الصحيحة والخيارات الأربعة من الصفر بما يطابق الأرقام الجديدة فعلياً (تحقق حسابياً من صحة الإجابة قبل إعادتها) — ممنوع نسخ الأرقام أو الأسماء الأصلية كما هي.
المتطلبات:
- أربعة خيارات فقط، خيار واحد صحيح فقط، والمشتتات (الخيارات الخاطئة) معقولة وليست واضحة الاستبعاد.
- correctAnswer يجب أن يطابق نص أحد الخيارات الأربعة حرفياً تماماً.
- درجة الصعوبة المطلوبة: "${DIFFICULTY_LABEL_AR[params.difficulty]}" — حافظ عليها في السؤال الجديد.
- اجعل الشرح (explanation) جملة أو جملتين توضح خطوات حل السؤال الجديد بأرقامه الجديدة.
${DISTRACTOR_RULE}
${MATH_FORMATTING_RULE}${avoid}
أعد النتيجة بصيغة JSON فقط حسب المخطط المطلوب، بدون أي نص إضافي.`;

  const result = await generateJson<GeneratedQuestion>(prompt, QUESTION_SCHEMA);
  validateGeneratedQuestion(result);
  return result;
}

export interface QuestionBankReference {
  question: string;
  options?: string[];
  correctAnswer?: string;
  explanation?: string;
}

/**
 * Generates one fresh multiple-choice practice question for a lesson's topic — no RAG reference
 * available (or it failed), so nothing to mutate from. `difficulty` drives the same EASY/MEDIUM/
 * HARD ladder as the diagnostic (see src/lib/gamification/adaptive.ts), letting lesson quizzes
 * and question-bank practice adapt question-to-question instead of staying at one fixed level.
 */
export async function generatePracticeQuestion(params: {
  topic: string;
  difficulty: $Enums.DiagnosticDifficulty;
  avoidPrompts: string[];
}): Promise<GeneratedQuestion> {
  const avoid = params.avoidPrompts.length
    ? `\nتجنّب تكرار أو مشابهة هذه الأسئلة السابقة في نفس جلسة التدريب:\n${params.avoidPrompts.map((p) => `- ${p}`).join("\n")}`
    : "";

  const prompt = `أنت خبير في تصميم أسئلة اختبار القدرات العامة (GAT) السعودي.
أنشئ سؤال اختيار من متعدد باللغة العربية الفصحى للتدريب على موضوع "${params.topic}"، بمستوى صعوبة "${DIFFICULTY_LABEL_AR[params.difficulty]}".
المتطلبات:
- أربعة خيارات فقط، خيار واحد صحيح فقط.
- correctAnswer يجب أن يطابق نص أحد الخيارات الأربعة حرفياً تماماً.
- السؤال مناسب لطالب ثانوي سعودي يستعد لاختبار القدرات.
- اجعل الشرح (explanation) جملة أو جملتين توضح سبب صحة الإجابة.
${DISTRACTOR_RULE}
${MATH_FORMATTING_RULE}${avoid}
أعد النتيجة بصيغة JSON فقط حسب المخطط المطلوب، بدون أي نص إضافي.`;

  const result = await generateJson<GeneratedQuestion>(prompt, QUESTION_SCHEMA);
  validateGeneratedQuestion(result);
  return result;
}

/**
 * Generates a fresh practice question by mutating a real reference question pulled via RAG from
 * the Supabase GAT question bank — same idea as generateMutatedDiagnosticQuestion, but framed
 * around a lesson's free-text topic instead of the diagnostic's fixed domain/subSkill/difficulty
 * taxonomy (a lesson's topic is far more granular than the 6 diagnostic sub-skills).
 */
export async function generateMutatedPracticeQuestion(params: {
  topic: string;
  difficulty: $Enums.DiagnosticDifficulty;
  reference: QuestionBankReference;
  avoidPrompts: string[];
}): Promise<GeneratedQuestion> {
  const avoid = params.avoidPrompts.length
    ? `\nتجنّب تكرار أو مشابهة هذه الأسئلة السابقة في نفس جلسة التدريب:\n${params.avoidPrompts.map((p) => `- ${p}`).join("\n")}`
    : "";
  const referenceOptionsBlock = params.reference.options?.length
    ? `\nخياراته الأصلية: ${params.reference.options.join(" / ")}${params.reference.correctAnswer ? ` (الصحيح: ${params.reference.correctAnswer})` : ""}`
    : "";
  const referenceExplanationBlock = params.reference.explanation ? `\nشرح الحل الأصلي: "${params.reference.explanation}"` : "";

  const prompt = `أنت خبير في تصميم أسئلة اختبار القدرات العامة (GAT) السعودي.
فيما يلي سؤال حقيقي من بنك أسئلة القدرات متعلق بموضوع "${params.topic}":
نص السؤال المرجعي: "${params.reference.question}"${referenceOptionsBlock}${referenceExplanationBlock}

مهمتك: أنشئ سؤالاً جديداً بنفس الفكرة والمفهوم وأسلوب الحل تماماً، لكن غيّر الأرقام والأسماء والسياق بحيث يبدو سؤالاً مختلفاً وليس نسخة معدّلة بشكل واضح عن الأصل. أعد حساب الإجابة الصحيحة والخيارات الأربعة من الصفر بما يطابق الأرقام الجديدة فعلياً (تحقق حسابياً من صحة الإجابة قبل إعادتها) — ممنوع نسخ الأرقام أو الأسماء الأصلية كما هي.
المتطلبات:
- أربعة خيارات فقط، خيار واحد صحيح فقط، والمشتتات (الخيارات الخاطئة) معقولة وليست واضحة الاستبعاد.
- correctAnswer يجب أن يطابق نص أحد الخيارات الأربعة حرفياً تماماً.
- درجة الصعوبة المطلوبة: "${DIFFICULTY_LABEL_AR[params.difficulty]}" — عدّل تعقيد الأرقام والخطوات في السؤال الجديد بما يطابق هذا المستوى (قد يختلف عن صعوبة السؤال المرجعي الأصلي).
- اجعل الشرح (explanation) جملة أو جملتين توضح خطوات حل السؤال الجديد بأرقامه الجديدة.
${DISTRACTOR_RULE}
${MATH_FORMATTING_RULE}${avoid}
أعد النتيجة بصيغة JSON فقط حسب المخطط المطلوب، بدون أي نص إضافي.`;

  const result = await generateJson<GeneratedQuestion>(prompt, QUESTION_SCHEMA);
  validateGeneratedQuestion(result);
  return result;
}

export interface LessonReference {
  question: string;
  explanation: string;
  imageUrl?: string;
}

export interface LessonContent {
  concept: { title: string; explanation_points: string[]; formula: string };
  example: { title: string; question: string; steps: string[]; pro_tip: string; image_url?: string };
  common_mistake: { title: string; mistake: string; correction: string };
}

const LESSON_CONTENT_SCHEMA = {
  type: "OBJECT",
  properties: {
    concept: {
      type: "OBJECT",
      properties: {
        title: { type: "STRING" },
        explanation_points: { type: "ARRAY", items: { type: "STRING" } },
        formula: { type: "STRING" },
      },
      required: ["title", "explanation_points", "formula"],
    },
    example: {
      type: "OBJECT",
      properties: {
        title: { type: "STRING" },
        question: { type: "STRING" },
        steps: { type: "ARRAY", items: { type: "STRING" } },
        pro_tip: { type: "STRING" },
      },
      required: ["title", "question", "steps", "pro_tip"],
    },
    common_mistake: {
      type: "OBJECT",
      properties: {
        title: { type: "STRING" },
        mistake: { type: "STRING" },
        correction: { type: "STRING" },
      },
      required: ["title", "mistake", "correction"],
    },
  },
  required: ["concept", "example", "common_mistake"],
};

/**
 * Generates the explanatory lesson content shown before its quiz, in Arabic Markdown+LaTeX,
 * as a strict {concept, example, common_mistake} JSON contract. Called once per lesson and
 * cached. Exactly one grounding source is normally supplied:
 * - `reference`: a real question pulled via RAG from the Supabase GAT question bank (Qudurat
 *   skills only) — the example is built on it instead of invented from scratch.
 * - `sourceExcerpt`: a text excerpt from a document the student uploaded themselves (custom
 *   skills only, see Skill.sourceExcerpt) — the WHOLE lesson (not just the example) must be
 *   grounded in it, since a Qudurat-flavored explanation would be actively wrong for arbitrary
 *   uploaded material (e.g. a biology or history document).
 */
export async function generateLessonContent(params: {
  title: string;
  description: string;
  reference?: LessonReference;
  sourceExcerpt?: string;
}): Promise<LessonContent> {
  const referenceBlock = params.reference
    ? `\nسؤال مرجعي حقيقي من بنك أسئلة اختبار القدرات لهذا الموضوع تحديداً — استخدمه كأساس لقسم example (وسّعه واشرحه خطوة بخطوة)، ولا تخترع مسألة بديلة:\nنص السؤال: "${params.reference.question}"\nالحل/الشرح المرجعي: "${params.reference.explanation}"\n`
    : "";

  const persona = params.sourceExcerpt
    ? `أنت معلّم خبير في مادة هذا الدرس تحديداً — حدد التخصص الدقيق من عنوان الدرس والمقتطف المرجعي أدناه (وليس من أي افتراض آخر) واشرح بصفتك ذلك الخبير بالضبط.`
    : `أنت معلم قدرات سعودي محترف (GAT) وخبير متمرّس تحديداً في مادة هذا الدرس — حدد أولاً التخصص الدقيق (رياضيات، جبر، هندسة، لغة عربية، استيعاب مقروء، تناظر لفظي... إلخ) من عنوان ووصف الدرس أدناه، واشرح بصفتك ذلك الخبير بالضبط، لا معلّماً عاماً.`;

  const sourceExcerptBlock = params.sourceExcerpt
    ? `\nمقتطف مرجعي حقيقي من محتوى دراسي رفعه الطالب بنفسه — اشرح الدرس بالاعتماد حصراً على الحقائق والمفاهيم الواردة فيه، ولا تخترع معلومات خارجه ولا تفترض أنه اختبار قدرات:\n"""\n${params.sourceExcerpt}\n"""\n`
    : "";

  const prompt = `${persona} مهمتك شرح الدرس بأسلوب بصري ومبسّط ومباشر موجّه لطالب ثانوي، بدقة متناهية ودون أي مقدمات أو جمل تحفيزية فارغة (مثل "أهلاً بك"، "يا بطل"، "في رحلتك"، "تخيل معي"، "دعنا نستكشف"). كل جملة يجب أن تحمل معلومة أو قاعدة أو رقماً أو خطوة حل فعلية.

عنوان الدرس: "${params.title}"
وصف الدرس: "${params.description}"
${referenceBlock}${sourceExcerptBlock}
أعد كائن JSON واحد بالضبط بهذا الشكل الصارم، بحقوله التالية بالضبط:

- concept.title: عنوان قصير جداً مثل "💡 المفهوم والقاعدة الأساسية".
- concept.explanation_points: من نقطتين إلى ثلاث نقاط قصيرة جداً (أقل من 10 كلمات لكل نقطة) تشرح المفهوم والاستراتيجية.
- concept.formula: ${params.sourceExcerpt ? "قانون أو معادلة أساسية بصيغة LaTeX إن وجدت في المقتطف، وإلا اتركه نصاً فارغاً" : "القانون الأساسي"} بصيغة LaTeX فقط، **بدون** علامتي $ أو $$ حوله (سيُعرض في صندوق مستقل تلقائياً)، مثل: \\frac{a}{b}
- example.title: عنوان قصير مثل "📝 مثال توضيحي واستراتيجية الحل".
- example.question: ${params.reference ? "نص المسألة المرجعية أعلاه، حرفياً أو بصياغة مكافئة مبسطة لطالب ثانوي" : params.sourceExcerpt ? "سؤال أو مثال واقعي مبني حصراً على حقائق المقتطف أعلاه" : "مسألة واقعية بأسلوب تجميعات اختبار القدرات، بأرقام حقيقية وليست افتراضية"}.
- example.steps: قائمة من عنصرين إلى أربعة عناصر نصية، كل عنصر يبدأ بـ "الخطوة N:" ثم شرح مختصر مع أي معادلة بصيغة $...$ عند الحاجة.
- example.pro_tip: استراتيجية حل سريع (أقل من 30 ثانية) بصيغة جملة واحدة تبدأ بـ "💡".
- common_mistake.title: عنوان قصير مثل "⚠️ خطأ شائع وتجنبه".
- common_mistake.mistake: أكثر خطأ فعلي يقع فيه الطلاب بهذا الموضوع تحديداً${params.sourceExcerpt ? "" : " في اختبار القدرات"}، جملة واحدة.
- common_mistake.correction: كيفية تجنب هذا الخطأ مباشرة، جملة واحدة.

${MATH_FORMATTING_RULE}

أعد النتيجة بصيغة JSON فقط حسب المخطط المطلوب، بدون أي نص إضافي.`;

  const result = await generateJson<LessonContent>(prompt, LESSON_CONTENT_SCHEMA);
  if (params.reference?.imageUrl) result.example.image_url = params.reference.imageUrl;
  return result;
}

export interface LlmSubSkillEvaluation {
  subSkill: $Enums.DiagnosticSubSkill;
  mastery: $Enums.MasteryLevel;
  rationale: string;
}

export interface LlmEvaluation {
  subSkills: LlmSubSkillEvaluation[];
  overallSummary: string;
}

const EVALUATION_SCHEMA = {
  type: "OBJECT",
  properties: {
    subSkills: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          subSkill: {
            type: "STRING",
            enum: ["ARITHMETIC", "ALGEBRA", "GEOMETRY", "ANALOGIES", "CONTEXTUAL_ERRORS", "READING_COMPREHENSION"],
          },
          mastery: { type: "STRING", enum: ["GAP", "DEVELOPING", "MASTERED"] },
          rationale: { type: "STRING" },
        },
        required: ["subSkill", "mastery", "rationale"],
      },
    },
    overallSummary: { type: "STRING" },
  },
  required: ["subSkills", "overallSummary"],
};

export interface DiagnosticTranscriptEntry {
  subSkill: $Enums.DiagnosticSubSkill;
  domain: $Enums.DiagnosticDomain;
  difficulty: $Enums.DiagnosticDifficulty;
  prompt: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}

/** Sends the full attempt transcript to Gemini and lets it decide mastery per sub-skill. */
export async function evaluateDiagnosticAttempt(transcript: DiagnosticTranscriptEntry[]): Promise<LlmEvaluation> {
  const transcriptText = transcript
    .map((t, i) => {
      const label = `${SUBSKILL_LABEL_AR[t.subSkill]} / ${DIFFICULTY_LABEL_AR[t.difficulty]}`;
      const result = t.isCorrect ? "إجابة صحيحة" : `إجابة خاطئة (الصحيحة: ${t.correctAnswer})`;
      return `${i + 1}. [${label}] السؤال: ${t.prompt}\n   إجابة الطالب: ${t.userAnswer} — ${result}`;
    })
    .join("\n");

  const prompt = `أنت مقيّم تربوي خبير في اختبار القدرات العامة (GAT) السعودي.
فيما يلي محضر إجابات طالب على اختبار تحديد مستوى تكيّفي مقسّم على 6 مهارات فرعية. عدد الأسئلة لكل مهارة متغيّر (بين 2 و5) حسب أداء الطالب: تبدأ كل مهارة بسؤال متوسط، وكل سؤال لاحق يصعب مستوى واحد إن أجاب الطالب صح أو يسهل مستوى واحد إن أخطأ (ضمن ثلاثة مستويات: سهل/متوسط/صعب)، ويتوقف الاختبار في تلك المهارة مبكراً بمجرد وضوح النتيجة (إجابتان متتاليتان صحيحتان بأصعب مستوى تعني إتقاناً واضحاً، وإجابتان متتاليتان خاطئتان بأسهل مستوى تعني فجوة واضحة) وإلا يكمل حتى 5 أسئلة:

${transcriptText}

لكل مهارة من المهارات الست التالية بالضبط: ARITHMETIC, ALGEBRA, GEOMETRY, ANALOGIES, CONTEXTUAL_ERRORS, READING_COMPREHENSION —
صنّف مستوى إتقان الطالب لها إلى واحدة من: MASTERED (متقن)، DEVELOPING (قيد التطور)، GAP (فجوة مهارية)، واكتب سبباً موجزاً بالعربية (جملة واحدة) يعتمد على مستوى الصعوبة الذي وصل إليه الطالب وصحة إجاباته في تلك المهارة.
ثم اكتب ملخصاً عاماً وموجزاً بالعربية (3-4 جمل) عن أداء الطالب إجمالاً، ونقطة الانطلاق المناسبة له في خطة تعلّمه.
أعد النتيجة بصيغة JSON فقط حسب المخطط المطلوب، متضمّناً المهارات الست كلها بدون استثناء.`;

  return generateJson<LlmEvaluation>(prompt, EVALUATION_SCHEMA);
}

const SKILL_ICON_KEYS = ["books", "bulb", "search", "calculator", "chart"] as const;
type SkillIconKey = (typeof SKILL_ICON_KEYS)[number];

export interface GeneratedRoadmapSkill {
  key: string;
  title: string;
  description: string;
  milestoneTitle: string;
  tier: number;
  alreadyMastered: boolean;
  // The mastery level (of this skill's underlying diagnostic sub-skill/topic) that alreadyMastered
  // was itself derived from — persisted on the Skill row (Skill.diagnosedMastery) so
  // checkAndAwardBadges can later reward mastering a skill that started as GAP/DEVELOPING, not
  // just alreadyMastered's coarser true/false.
  mastery: $Enums.MasteryLevel;
  prerequisites: string[];
  lessonTitle: string;
  icon: SkillIconKey;
  // Only set (and only meaningful) for custom-content roadmaps: the exact name of the source
  // topic (from CustomRoadmapEvaluationInput.topics) this skill was built from, so its excerpt
  // can be attached to the persisted Skill row for later lesson-content grounding.
  sourceTopicName?: string;
  // Only set (and only meaningful) for custom-content roadmaps: a short Arabic subject/category
  // label (one of a handful Gemini defines for the whole document) shown as this node's domain
  // tag — the comprehensive plan's fixed quantitative/verbal split doesn't apply here.
  domainLabel?: string;
}

export interface GeneratedRoadmap {
  title: string;
  description: string;
  milestones: { title: string; description: string }[];
  skills: GeneratedRoadmapSkill[];
}

const ROADMAP_SCHEMA = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    description: { type: "STRING" },
    milestones: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { title: { type: "STRING" }, description: { type: "STRING" } },
        required: ["title", "description"],
      },
    },
    // Deliberately no `questions` here — that used to be embedded per skill, generating every
    // node's full quiz upfront in this one call (100+ questions for the comprehensive plan,
    // the reason it took 1.5-2 minutes). Questions are now generated lazily, on-demand, the
    // first time a student actually opens that lesson (see getOrGenerateCurriculumQuestions in
    // quizService.ts) — the same cache-on-first-open pattern already used for lesson content.
    // This alone cuts roadmap generation down to structure only: title/description/tier/
    // prerequisites/icon per node, no invented question content.
    skills: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          key: { type: "STRING" },
          title: { type: "STRING" },
          description: { type: "STRING" },
          milestoneTitle: { type: "STRING" },
          tier: { type: "INTEGER" },
          alreadyMastered: { type: "BOOLEAN" },
          mastery: { type: "STRING", enum: ["GAP", "DEVELOPING", "MASTERED"] },
          prerequisites: { type: "ARRAY", items: { type: "STRING" } },
          lessonTitle: { type: "STRING" },
          icon: { type: "STRING", enum: [...SKILL_ICON_KEYS] },
          sourceTopicName: { type: "STRING" },
          domainLabel: { type: "STRING" },
        },
        required: ["key", "title", "description", "milestoneTitle", "tier", "alreadyMastered", "mastery", "prerequisites", "lessonTitle", "icon"],
      },
    },
  },
  required: ["title", "description", "milestones", "skills"],
};

export interface RoadmapEvaluationInput {
  subSkills: { subSkill: $Enums.DiagnosticSubSkill; mastery: $Enums.MasteryLevel; rationale: string }[];
  overallSummary: string;
}

const MASTERY_LEVELS: $Enums.MasteryLevel[] = ["GAP", "DEVELOPING", "MASTERED"];

/** Drops dangling/self prerequisites, falls back invalid icons, and normalizes mastery/alreadyMastered against each other. */
function sanitizeRoadmap(roadmap: GeneratedRoadmap): void {
  const validKeys = new Set(roadmap.skills.map((s) => s.key));
  for (const skill of roadmap.skills) {
    skill.prerequisites = skill.prerequisites.filter((k) => validKeys.has(k) && k !== skill.key);
    if (!SKILL_ICON_KEYS.includes(skill.icon)) skill.icon = "bulb";
    if (!MASTERY_LEVELS.includes(skill.mastery)) skill.mastery = "DEVELOPING";
    // alreadyMastered is the ground truth for auto-completion (generateAndAssignComprehensivePath
    // acts on it directly) — keep mastery consistent with it rather than trusting two
    // independently-generated fields to agree.
    if (skill.alreadyMastered) skill.mastery = "MASTERED";
    else if (skill.mastery === "MASTERED") skill.mastery = "DEVELOPING";
  }
}

const COMPREHENSIVE_QUANTITATIVE_TOPICS = [
  "العمليات الحسابية الأساسية وسرعة الحساب",
  "الكسور العادية والعشرية والعمليات عليها",
  "النسبة المئوية وقوانين الربح والخسران",
  "التناسب الطردي والعكسي والتدرج المنتظم",
  "حل المعادلات من الدرجة الأولى والثانية",
  "قوانين الأسس والعمليات عليها",
  "الجذور وتبسيط المقادير الجذرية",
  "الهندسة: الأشكال الثنائية (المربع، المستطيل، الدائرة)",
  "الهندسة: زوايا المثلثات والمضلعات والزوايا المتوازية",
  "الهندسة: المجسمات والحجوم (المكعب، الأسطوانة)",
  "المسائل الكلامية: السرعة والمسافة والزمن",
  "المسائل الكلامية: الأعمار والإنجاز المشترك",
  "الإحصاء: قراءة الجداول والقطاعات الدائرية",
  "الإحصاء: المتوسط والوسيط والمنوال",
  "المقارنات: استراتيجيات الحل السريع والخيارات",
  "الاحتمالات ومبدأ العد الأساسي",
];

const COMPREHENSIVE_VERBAL_TOPICS = [
  "التناظر اللفظي: العلاقات المكانية والزمنية",
  "التناظر اللفظي: علاقات السبب والنتيجة والجزء من الكل",
  "إكمال الجمل: فهم التناسق الدلالي وسياق النص",
  "الخطأ السياقي: استراتيجيات اكتشاف الكلمة المخلة بالمفهوم",
  "استيعاب المقروء: تحليل النصوص واستخراج الأفكار الرئيسة",
  "استيعاب المقروء: عودة الضمائر واستنباط المعاني الضمنية",
  "المفردة المخالفة واكتشاف الاختلاف الدلالي",
];

// Maps each of the 23 baseline topics to the diagnostic sub-skill it belongs to, so Gemini
// doesn't have to freely judge the mapping itself when deciding alreadyMastered — several
// topics are genuinely ambiguous (e.g. is "النسبة المئوية" arithmetic or algebra?) and a fixed
// table keeps that decision consistent instead of drifting between generations. One topic
// (probability) has no clean match to any of the 6 sub-skills and is intentionally excluded —
// it always stays unmastered regardless of the evaluation.
const TOPIC_SUBSKILL_GROUPS: { subSkill: $Enums.DiagnosticSubSkill; topics: string[] }[] = [
  {
    subSkill: "ARITHMETIC",
    topics: [
      "العمليات الحسابية الأساسية وسرعة الحساب",
      "الكسور العادية والعشرية والعمليات عليها",
      "النسبة المئوية وقوانين الربح والخسران",
      "التناسب الطردي والعكسي والتدرج المنتظم",
      "الإحصاء: قراءة الجداول والقطاعات الدائرية",
      "الإحصاء: المتوسط والوسيط والمنوال",
      "المقارنات: استراتيجيات الحل السريع والخيارات",
    ],
  },
  {
    subSkill: "ALGEBRA",
    topics: [
      "حل المعادلات من الدرجة الأولى والثانية",
      "قوانين الأسس والعمليات عليها",
      "الجذور وتبسيط المقادير الجذرية",
      "المسائل الكلامية: السرعة والمسافة والزمن",
      "المسائل الكلامية: الأعمار والإنجاز المشترك",
    ],
  },
  {
    subSkill: "GEOMETRY",
    topics: [
      "الهندسة: الأشكال الثنائية (المربع، المستطيل، الدائرة)",
      "الهندسة: زوايا المثلثات والمضلعات والزوايا المتوازية",
      "الهندسة: المجسمات والحجوم (المكعب، الأسطوانة)",
    ],
  },
  {
    subSkill: "ANALOGIES",
    topics: [
      "التناظر اللفظي: العلاقات المكانية والزمنية",
      "التناظر اللفظي: علاقات السبب والنتيجة والجزء من الكل",
      "المفردة المخالفة واكتشاف الاختلاف الدلالي",
    ],
  },
  {
    subSkill: "CONTEXTUAL_ERRORS",
    topics: ["إكمال الجمل: فهم التناسق الدلالي وسياق النص", "الخطأ السياقي: استراتيجيات اكتشاف الكلمة المخلة بالمفهوم"],
  },
  {
    subSkill: "READING_COMPREHENSION",
    topics: ["استيعاب المقروء: تحليل النصوص واستخراج الأفكار الرئيسة", "استيعاب المقروء: عودة الضمائر واستنباط المعاني الضمنية"],
  },
];

/**
 * Designs a full GAT curriculum covering every required baseline topic, ordered easy to hard,
 * informed by the student's diagnostic results: topics whose sub-skill the diagnostic found
 * already mastered are pre-completed, but nothing is ever dropped from the tree just because
 * its sub-skill tested well — this is a comprehensive plan, not a narrowed-down one.
 */
export async function generateComprehensiveRoadmap(evaluation: RoadmapEvaluationInput): Promise<GeneratedRoadmap> {
  const totalTopics = COMPREHENSIVE_QUANTITATIVE_TOPICS.length + COMPREHENSIVE_VERBAL_TOPICS.length;
  const breakdown = evaluation.subSkills
    .map((s) => `- ${SUBSKILL_LABEL_AR[s.subSkill]}: ${s.mastery === "MASTERED" ? "متقن" : s.mastery === "DEVELOPING" ? "قيد التطور" : "فجوة مهارية"} — ${s.rationale}`)
    .join("\n");
  const masteryGroupLines = TOPIC_SUBSKILL_GROUPS.map((g) => `- ${SUBSKILL_LABEL_AR[g.subSkill]}: ${g.topics.join("، ")}`).join("\n");

  const prompt = `أنت مصمم مناهج خبير في اختبار القدرات العامة (GAT) السعودي.
نتيجة تقييم طالب في اختبار تحديد مستوى تكيّفي:
${breakdown}

ملخص عام: ${evaluation.overallSummary}

صمّم خطة تعلّم تأسيسية شاملة تغطي القسمين الكمي واللفظي بالكامل، مبنية على نتيجة تقييم هذا الطالب أعلاه.

هذه قائمة إلزامية (baseline) من ${totalTopics} مهارة فرعية مستقلة يجب تغطيتها بالكامل بغض النظر عن نتيجة التقييم — كل نقطة في القائمة تمثّل عقدة (node) مستقلة بذاتها في الخطة، ممنوع دمج نقطتين أو أكثر من القائمة في عقدة واحدة، وممنوع إسقاط أي نقطة منها حتى لو كانت مهارتها المقابلة "متقنة":

القسم الكمي (${COMPREHENSIVE_QUANTITATIVE_TOPICS.length} عقدة على الأقل):
${COMPREHENSIVE_QUANTITATIVE_TOPICS.map((t, i) => `${i + 1}. ${t}`).join("\n")}

القسم اللفظي (${COMPREHENSIVE_VERBAL_TOPICS.length} عقدة على الأقل):
${COMPREHENSIVE_VERBAL_TOPICS.map((t, i) => `${COMPREHENSIVE_QUANTITATIVE_TOPICS.length + i + 1}. ${t}`).join("\n")}

لتحديد العقد المتقنة مسبقاً (alreadyMastered)، استخدم هذا التصنيف الثابت الذي يربط كل موضوع بمهارة التقييم المقابلة له بالضبط (لا تجتهد بربط مختلف):
${masteryGroupLines}
- بدون تصنيف (يبقى alreadyMastered = false دائماً بغض النظر عن نتيجة التقييم): الاحتمالات ومبدأ العد الأساسي

المتطلبات:
- عقدة واحدة مستقلة على الأقل لكل نقطة من القائمة أعلاه (لا تدمج، لا تُسقط) — أي لا يقل إجمالي عدد العقد (skills) عن ${totalTopics}. المواضيع التي تحتاج تدرجاً إضافياً (مثل معادلات الدرجة الأولى والثانية، أو استيعاب المقروء) يمكن أن تنقسم لأكثر من عقدة، فيصل الإجمالي إلى ٢٦-٣٠ عقدة إذا رأيت ذلك مناسباً — لكن لا تقل أبداً عن ${totalTopics}.
- alreadyMastered يجب أن تكون true فقط للعقد اللي موضوعها مصنّف أعلاه ضمن مهارة صنّفها التقييم كـ"متقن" بالضبط — كل عقدة أخرى (بما فيها كل عقد الاحتمالات، وأي عقدة موضوعها ضمن مهارة "قيد التطور" أو "فجوة مهارية") تكون alreadyMastered = false.
- لكل عقدة: mastery يجب أن يطابق تصنيف التقييم لمهارتها المقابلة بالضبط: MASTERED إن كانت "متقن" (ويجب أن يطابق alreadyMastered = true حينها)، DEVELOPING إن كانت "قيد التطور"، GAP إن كانت "فجوة مهارية". عقد الاحتمالات (بدون تصنيف) تكون دائماً mastery = GAP.
- قسّم الخطة إلى أسابيع دراسية متتالية (milestones) بتسلسل تدريجي منطقي من الأسهل للأصعب: ابدأ بأساسيات الحس العددي والمفردات اللغوية، ثم انتقل تدريجياً للمواضيع الأكثر تعقيداً، وانتهِ بأسبوع تطبيقي شامل. كل أسبوع يجب أن يحتوي على 4 إلى 6 عقد فرعية بالضبط (لا نودين فقط) — اضبط عدد الأسابيع تبعاً لذلك (يكون عادةً بين 4 و6 أسابيع بما إن إجمالي العقد لا يقل عن ${totalTopics}). عنوان كل مرحلة (milestoneTitle) يجب أن يبدأ بصيغة "الأسبوع N: " متبوعاً بوصف قصير لموضوعها (مثل "الأسبوع 1: الحس العددي والمفردات الأساسية")، حيث N رقم تسلسلي يبدأ من 1.
- لكل عقدة: key فريد بالإنجليزية (kebab-case)، عنوان ووصف بالعربية يعكسان تحديداً نقطة واحدة من القائمة أعلاه، milestoneTitle (اسم أحد الأسابيع أعلاه بالضبط)، tier (رقم صف يبدأ من 0 ويعكس ترتيب الأسبوع)، وقائمة prerequisites (مفاتيح عقد أخرى في نفس القائمة يجب إتقانها أولاً — عقد tier 0 غالباً بدون متطلبات سابقة).
- لكل عقدة: عنوان درس واحد (lessonTitle) يصف تدريباً مكثفاً على أساسيات ذلك الموضوع تحديداً (لا تولّد أسئلة الدرس هنا، فقط عنوانه — الأسئلة تُنشأ لاحقاً عند فتح الدرس فعلياً).
- لكل عقدة: اختر icon واحداً يناسب موضوعها من هذه القيم فقط: books (قراءة/نصوص/لغة)، bulb (مفاهيم عامة وأفكار)، search (تحليل/اكتشاف/تدقيق)، calculator (حساب/جبر/عمليات رياضية)، chart (مهارة ختامية أو تحدٍّ متقدم مركّب). ملاحظة: العقد المقفلة (تعتمد على متطلبات لم تُتقَن بعد) والعقد المتقنة مسبقاً تُعرض بشارتها الخاصة بغض النظر عن icon، فلا داعي لمراعاة ذلك.
- أعطِ الخطة عنواناً ووصفاً عاماً بالعربية (title, description) يعكسان أنها خطة تأسيسية شاملة مبنية على نتيجة تقييم الطالب.
${MATH_FORMATTING_RULE}
أعد النتيجة بصيغة JSON فقط حسب المخطط المطلوب.`;

  const roadmap = await generateJson<GeneratedRoadmap>(prompt, ROADMAP_SCHEMA);
  sanitizeRoadmap(roadmap);
  return roadmap;
}

// ───────────────────────── Custom-content adaptive placement ─────────────────────────
// A second placement flow: the student uploads a document (PDF or image), Gemini reads it
// directly (inline base64, no parsing library — Gemini natively understands both formats) and
// extracts a dynamic set of topics, each with a grounding text excerpt. Every later call in
// this flow (question generation, mastery evaluation, roadmap design) uses only that cached
// excerpt text — the file bytes are sent to Gemini exactly once, here.

export interface CustomTopic {
  name: string;
  excerpt: string;
}

export interface DocumentAnalysis {
  documentTitle: string;
  topics: CustomTopic[];
}

const MIN_CUSTOM_TOPICS = 5;
const MAX_CUSTOM_TOPICS = 8;

const DOCUMENT_ANALYSIS_SCHEMA = {
  type: "OBJECT",
  properties: {
    documentTitle: { type: "STRING" },
    topics: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { name: { type: "STRING" }, excerpt: { type: "STRING" } },
        required: ["name", "excerpt"],
      },
      minItems: MIN_CUSTOM_TOPICS,
      maxItems: MAX_CUSTOM_TOPICS,
    },
  },
  required: ["documentTitle", "topics"],
};

/** Reads the attached file once and extracts a dynamic topic list to build an adaptive test and roadmap from. */
export async function analyzeDocument(params: { mimeType: string; base64Data: string }): Promise<DocumentAnalysis> {
  const prompt = `اقرأ محتوى الملف المرفق بالكامل بعناية (قد يكون صفحات كتاب، شرائح عرض تقديمي، أو ملخصاً دراسياً بأي مادة أو لغة).
استخرج منه عنواناً قصيراً يصف موضوع الملف عموماً (documentTitle)، ثم بين ${MIN_CUSTOM_TOPICS} و ${MAX_CUSTOM_TOPICS} مواضيع فرعية مستقلة تغطي أهم ما ورد في الملف.
لكل موضوع:
- name: عنوان قصير (٣-٦ كلمات) لهذا الموضوع الفرعي.
- excerpt: ملخص نصي ذاتي الاكتفاء من ١٥٠ إلى ٣٠٠ كلمة يغطي أهم الحقائق والمفاهيم والتفاصيل الفعلية لهذا الموضوع من الملف، بحيث يمكن توليد أسئلة اختبار دقيقة منه لاحقاً دون الرجوع للملف الأصلي مطلقاً — لا تكتفِ بوصف عام، انقل الحقائق والأرقام والتعريفات الفعلية الواردة في الملف.
اكتب كل شيء باللغة العربية الفصحى بغض النظر عن لغة الملف الأصلية.
${MATH_FORMATTING_RULE}
أعد النتيجة بصيغة JSON فقط حسب المخطط المطلوب، بدون أي نص إضافي.`;

  const result = await generateJson<DocumentAnalysis>(prompt, DOCUMENT_ANALYSIS_SCHEMA, [
    { inlineData: { mimeType: params.mimeType, data: params.base64Data } },
  ]);
  if (result.topics.length < MIN_CUSTOM_TOPICS) throw new Error("Gemini extracted too few topics from the uploaded document");
  return result;
}

/** Generates one fresh multiple-choice question grounded strictly in a cached topic excerpt — no file resent. */
export async function generateCustomQuestion(params: {
  topic: string;
  excerpt: string;
  difficulty: $Enums.DiagnosticDifficulty;
  avoidPrompts: string[];
}): Promise<GeneratedQuestion> {
  const avoid = params.avoidPrompts.length
    ? `\nتجنّب تكرار أو مشابهة هذه الأسئلة السابقة في نفس الاختبار:\n${params.avoidPrompts.map((p) => `- ${p}`).join("\n")}`
    : "";

  const prompt = `أنت معلّم خبير تصمم سؤال اختيار من متعدد باللغة العربية الفصحى لاختبار فهم الطالب لموضوع "${params.topic}"، بالاعتماد حصراً على المقتطف التالي المستخرج من محتوى دراسي حقيقي رفعه الطالب:
"""
${params.excerpt}
"""
المستوى المطلوب: "${DIFFICULTY_LABEL_AR[params.difficulty]}".
المتطلبات:
- السؤال وإجابته الصحيحة يجب أن يُستنتجا من المقتطف أعلاه حصراً، لا معلومات خارجية.
- أربعة خيارات فقط، خيار واحد صحيح فقط، والمشتتات معقولة وليست واضحة الاستبعاد.
- correctAnswer يجب أن يطابق نص أحد الخيارات الأربعة حرفياً تماماً.
- اجعل الشرح (explanation) جملة أو جملتين توضح سبب صحة الإجابة بالاستناد للمقتطف.
${DISTRACTOR_RULE}
${MATH_FORMATTING_RULE}${avoid}
أعد النتيجة بصيغة JSON فقط حسب المخطط المطلوب، بدون أي نص إضافي.`;

  const result = await generateJson<GeneratedQuestion>(prompt, QUESTION_SCHEMA);
  validateGeneratedQuestion(result);
  return result;
}

export interface CustomTopicEvaluation {
  topic: string;
  mastery: $Enums.MasteryLevel;
  rationale: string;
}

export interface LlmCustomEvaluation {
  topics: CustomTopicEvaluation[];
  overallSummary: string;
}

const CUSTOM_EVALUATION_SCHEMA = {
  type: "OBJECT",
  properties: {
    topics: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          topic: { type: "STRING" },
          mastery: { type: "STRING", enum: ["GAP", "DEVELOPING", "MASTERED"] },
          rationale: { type: "STRING" },
        },
        required: ["topic", "mastery", "rationale"],
      },
    },
    overallSummary: { type: "STRING" },
  },
  required: ["topics", "overallSummary"],
};

export interface CustomDiagnosticTranscriptEntry {
  topic: string;
  difficulty: $Enums.DiagnosticDifficulty;
  prompt: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}

/** Sends the full custom-attempt transcript to Gemini and lets it decide mastery per extracted topic (dynamic list, unlike the fixed 6-subskill evaluateDiagnosticAttempt). */
export async function evaluateCustomDiagnosticAttempt(
  transcript: CustomDiagnosticTranscriptEntry[],
  topics: string[]
): Promise<LlmCustomEvaluation> {
  const transcriptText = transcript
    .map((t, i) => {
      const label = `${t.topic} / ${DIFFICULTY_LABEL_AR[t.difficulty]}`;
      const result = t.isCorrect ? "إجابة صحيحة" : `إجابة خاطئة (الصحيحة: ${t.correctAnswer})`;
      return `${i + 1}. [${label}] السؤال: ${t.prompt}\n   إجابة الطالب: ${t.userAnswer} — ${result}`;
    })
    .join("\n");

  const prompt = `أنت مقيّم تربوي خبير.
فيما يلي محضر إجابات طالب على اختبار تكيّفي مبني على محتوى رفعه بنفسه، مقسّم على المواضيع التالية بالضبط: ${topics.join("، ")}.
عدد الأسئلة لكل موضوع متغيّر حسب أداء الطالب: يبدأ كل موضوع بسؤال متوسط، وكل سؤال لاحق يصعب مستوى إن أجاب صح أو يسهل مستوى إن أخطأ، ويتوقف الاختبار في ذلك الموضوع مبكراً بمجرد وضوح النتيجة.

${transcriptText}

لكل موضوع من المواضيع المذكورة أعلاه بالضبط (اذكرها جميعاً بدون استثناء، بنفس الأسماء الحرفية):
صنّف مستوى إتقان الطالب له إلى واحدة من: MASTERED (متقن)، DEVELOPING (قيد التطور)، GAP (فجوة مهارية)، واكتب سبباً موجزاً بالعربية (جملة واحدة).
ثم اكتب ملخصاً عاماً وموجزاً بالعربية (3-4 جمل) عن أداء الطالب إجمالاً.
أعد النتيجة بصيغة JSON فقط حسب المخطط المطلوب، متضمّناً كل المواضيع المذكورة أعلاه بدون استثناء وبنفس أسمائها الحرفية.`;

  return generateJson<LlmCustomEvaluation>(prompt, CUSTOM_EVALUATION_SCHEMA);
}

export interface CustomRoadmapEvaluationInput {
  documentTitle: string;
  topics: (CustomTopicEvaluation & { excerpt: string })[];
  overallSummary: string;
}

/**
 * Designs a learning roadmap from a set of topics extracted from the student's own uploaded
 * document (not the fixed Qudurat baseline) — one node at minimum per topic, informed directly
 * by that topic's own mastery result (no subskill-group indirection needed, since evaluation
 * here is already per-topic).
 */
export async function generateCustomRoadmap(input: CustomRoadmapEvaluationInput): Promise<GeneratedRoadmap> {
  const totalTopics = input.topics.length;
  const breakdown = input.topics
    .map((t) => `- ${t.topic}: ${t.mastery === "MASTERED" ? "متقن" : t.mastery === "DEVELOPING" ? "قيد التطور" : "فجوة مهارية"} — ${t.rationale}`)
    .join("\n");

  const prompt = `أنت مصمم مناهج خبير.
طالب رفع ملفاً دراسياً بعنوان "${input.documentTitle}" وأخذ اختباراً تكيفياً مبنياً عليه. نتيجة تقييمه:
${breakdown}

ملخص عام: ${input.overallSummary}

صمّم خطة تعلّم شاملة تغطي محتوى هذا الملف بالكامل، مبنية على نتيجة تقييم هذا الطالب أعلاه.

هذه قائمة إلزامية (baseline) من ${totalTopics} مهارة فرعية مستقلة مستخرجة من ملف الطالب يجب تغطيتها بالكامل بغض النظر عن نتيجة التقييم — كل نقطة تمثّل عقدة (node) مستقلة بذاتها في الخطة، ممنوع دمج نقطتين أو أكثر في عقدة واحدة، وممنوع إسقاط أي نقطة منها حتى لو كانت "متقنة":
${input.topics.map((t, i) => `${i + 1}. ${t.topic}`).join("\n")}

المتطلبات:
- عقدة واحدة مستقلة على الأقل لكل نقطة أعلاه (لا تدمج، لا تُسقط) — أي لا يقل إجمالي عدد العقد (skills) عن ${totalTopics}. المواضيع الواسعة يمكن أن تنقسم لأكثر من عقدة إذا رأيت ذلك مناسباً، لكن لا تقل أبداً عن ${totalTopics}.
- alreadyMastered يجب أن تكون true فقط للعقد التي موضوعها مصنّف "متقن" أعلاه بالضبط — كل عقدة أخرى (قيد التطور أو فجوة مهارية) تكون alreadyMastered = false.
- لكل عقدة: mastery يجب أن يطابق تصنيف الموضوع المقابل لها أعلاه بالضبط: MASTERED إن كان "متقن" (ويجب أن يطابق alreadyMastered = true حينها)، DEVELOPING إن كان "قيد التطور"، GAP إن كان "فجوة مهارية".
- قسّم الخطة إلى أسابيع دراسية متتالية (milestones) بتسلسل تدريجي منطقي من الأسهل للأصعب. كل أسبوع يحتوي على 3 إلى 6 عقد فرعية. عنوان كل مرحلة (milestoneTitle) يجب أن يبدأ بصيغة "الأسبوع N: " متبوعاً بوصف قصير لموضوعها، حيث N رقم تسلسلي يبدأ من 1.
- لكل عقدة: key فريد بالإنجليزية (kebab-case)، عنوان ووصف بالعربية يعكسان تحديداً نقطة واحدة من القائمة أعلاه، milestoneTitle (اسم أحد الأسابيع أعلاه بالضبط)، tier (رقم صف يبدأ من 0 ويعكس ترتيب الأسبوع)، وقائمة prerequisites (مفاتيح عقد أخرى في نفس القائمة يجب إتقانها أولاً — عقد tier 0 غالباً بدون متطلبات سابقة).
- لكل عقدة: sourceTopicName يجب أن يطابق بالضبط (نفس الأحرف) اسم إحدى النقاط في القائمة الرقمية أعلاه — هذا إلزامي لكل عقدة بلا استثناء، حتى لو انقسمت نقطة واحدة لعدة عقد (تحمل كلها نفس sourceTopicName).
- عرّف أولاً من ٢ إلى ٤ أقسام/فئات موضوعية عريضة تغطي كل محتوى الملف (مثلاً لملف عن الأرشفة: "التصنيف والتنظيم"، "الوصف والتوثيق"، "الحفظ والصيانة" — أسماء توضيحية فعلية تعكس محتوى هذا الملف تحديداً، وليست هذه الأمثلة حرفياً). ثم لكل عقدة: domainLabel يجب أن يطابق بالضبط (نفس الأحرف) اسم أحد هذه الأقسام التي عرّفتها — إلزامي لكل عقدة بلا استثناء، مثل "كمي"/"لفظي" في اختبار القدرات لكن بأسماء تعكس مادة هذا الملف تحديداً لا القدرات.
- لكل عقدة: عنوان درس واحد (lessonTitle) يصف تدريباً مكثفاً على أساسيات ذلك الموضوع تحديداً (لا تولّد أسئلة الدرس هنا، فقط عنوانه).
- لكل عقدة: اختر icon واحداً يناسب موضوعها من هذه القيم فقط: books (قراءة/نصوص/لغة)، bulb (مفاهيم عامة وأفكار)، search (تحليل/اكتشاف/تدقيق)، calculator (حساب/أرقام/عمليات)، chart (مهارة ختامية أو تحدٍّ متقدم مركّب).
- أعطِ الخطة عنواناً ووصفاً عاماً بالعربية (title, description) يعكسان أنها خطة مبنية على محتوى "${input.documentTitle}" ونتيجة تقييم الطالب.
${MATH_FORMATTING_RULE}
أعد النتيجة بصيغة JSON فقط حسب المخطط المطلوب.`;

  const roadmap = await generateJson<GeneratedRoadmap>(prompt, ROADMAP_SCHEMA);
  sanitizeRoadmap(roadmap);
  return roadmap;
}
