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

async function generateJson<T>(prompt: string, responseSchema: object): Promise<T> {
  const res = await fetch(`${API_BASE}/${model()}:generateContent?key=${apiKey()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
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

export interface GeneratedQuestion {
  prompt: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

/** Shared by generateDiagnosticQuestion and generateMutatedDiagnosticQuestion — both use QUESTION_SCHEMA. */
function validateGeneratedQuestion(result: GeneratedQuestion): void {
  if (!result.options.includes(result.correctAnswer)) {
    const trimmedMatch = result.options.find((o) => o.trim() === result.correctAnswer.trim());
    if (!trimmedMatch) throw new Error("Gemini's correctAnswer did not match any of its own options");
    result.correctAnswer = trimmedMatch;
  }
  if (result.options.length !== 4) throw new Error("Gemini did not return exactly 4 options");
}

const QUESTION_SCHEMA = {
  type: "OBJECT",
  properties: {
    prompt: { type: "STRING" },
    options: { type: "ARRAY", items: { type: "STRING" }, minItems: 4, maxItems: 4 },
    correctAnswer: { type: "STRING" },
    explanation: { type: "STRING" },
  },
  required: ["prompt", "options", "correctAnswer", "explanation"],
};

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

/** Generates one fresh multiple-choice practice question for a lesson's topic — no RAG reference available (or it failed), so nothing to mutate from. */
export async function generatePracticeQuestion(params: { topic: string; avoidPrompts: string[] }): Promise<GeneratedQuestion> {
  const avoid = params.avoidPrompts.length
    ? `\nتجنّب تكرار أو مشابهة هذه الأسئلة السابقة في نفس جلسة التدريب:\n${params.avoidPrompts.map((p) => `- ${p}`).join("\n")}`
    : "";

  const prompt = `أنت خبير في تصميم أسئلة اختبار القدرات العامة (GAT) السعودي.
أنشئ سؤال اختيار من متعدد باللغة العربية الفصحى للتدريب على موضوع "${params.topic}".
المتطلبات:
- أربعة خيارات فقط، خيار واحد صحيح فقط.
- correctAnswer يجب أن يطابق نص أحد الخيارات الأربعة حرفياً تماماً.
- السؤال مناسب لطالب ثانوي سعودي يستعد لاختبار القدرات.
- اجعل الشرح (explanation) جملة أو جملتين توضح سبب صحة الإجابة.
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
- اجعل الشرح (explanation) جملة أو جملتين توضح خطوات حل السؤال الجديد بأرقامه الجديدة.
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
 * cached. When `reference` is supplied (a real question pulled via RAG from the Supabase GAT
 * question bank), the example is grounded in it instead of invented from scratch.
 */
export async function generateLessonContent(params: {
  title: string;
  description: string;
  reference?: LessonReference;
}): Promise<LessonContent> {
  const referenceBlock = params.reference
    ? `\nسؤال مرجعي حقيقي من بنك أسئلة اختبار القدرات لهذا الموضوع تحديداً — استخدمه كأساس لقسم example (وسّعه واشرحه خطوة بخطوة)، ولا تخترع مسألة بديلة:\nنص السؤال: "${params.reference.question}"\nالحل/الشرح المرجعي: "${params.reference.explanation}"\n`
    : "";

  const prompt = `أنت معلم قدرات سعودي محترف (GAT) وخبير متمرّس تحديداً في مادة هذا الدرس — حدد أولاً التخصص الدقيق (رياضيات، جبر، هندسة، لغة عربية، استيعاب مقروء، تناظر لفظي... إلخ) من عنوان ووصف الدرس أدناه، واشرح بصفتك ذلك الخبير بالضبط، لا معلّماً عاماً. مهمتك شرح الدرس بأسلوب بصري ومبسّط ومباشر موجّه لطالب ثانوي، بدقة متناهية ودون أي مقدمات أو جمل تحفيزية فارغة (مثل "أهلاً بك"، "يا بطل"، "في رحلتك"، "تخيل معي"، "دعنا نستكشف"). كل جملة يجب أن تحمل معلومة أو قاعدة أو رقماً أو خطوة حل فعلية.

عنوان الدرس: "${params.title}"
وصف الدرس: "${params.description}"
${referenceBlock}
أعد كائن JSON واحد بالضبط بهذا الشكل الصارم، بحقوله التالية بالضبط:

- concept.title: عنوان قصير جداً مثل "💡 المفهوم والقاعدة الأساسية".
- concept.explanation_points: من نقطتين إلى ثلاث نقاط قصيرة جداً (أقل من 10 كلمات لكل نقطة) تشرح المفهوم والاستراتيجية.
- concept.formula: القانون الأساسي بصيغة LaTeX فقط، **بدون** علامتي $ أو $$ حوله (سيُعرض في صندوق مستقل تلقائياً)، مثل: \\frac{a}{b}
- example.title: عنوان قصير مثل "📝 مثال توضيحي واستراتيجية الحل".
- example.question: ${params.reference ? "نص المسألة المرجعية أعلاه، حرفياً أو بصياغة مكافئة مبسطة لطالب ثانوي" : "مسألة واقعية بأسلوب تجميعات اختبار القدرات، بأرقام حقيقية وليست افتراضية"}.
- example.steps: قائمة من عنصرين إلى أربعة عناصر نصية، كل عنصر يبدأ بـ "الخطوة N:" ثم شرح مختصر مع أي معادلة بصيغة $...$ عند الحاجة.
- example.pro_tip: استراتيجية حل سريع (أقل من 30 ثانية) بصيغة جملة واحدة تبدأ بـ "💡".
- common_mistake.title: عنوان قصير مثل "⚠️ خطأ شائع وتجنبه".
- common_mistake.mistake: أكثر خطأ فعلي يقع فيه الطلاب بهذا الموضوع تحديداً في اختبار القدرات، جملة واحدة.
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
  prerequisites: string[];
  lessonTitle: string;
  icon: SkillIconKey;
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
          prerequisites: { type: "ARRAY", items: { type: "STRING" } },
          lessonTitle: { type: "STRING" },
          icon: { type: "STRING", enum: [...SKILL_ICON_KEYS] },
        },
        required: ["key", "title", "description", "milestoneTitle", "tier", "alreadyMastered", "prerequisites", "lessonTitle", "icon"],
      },
    },
  },
  required: ["title", "description", "milestones", "skills"],
};

export interface RoadmapEvaluationInput {
  subSkills: { subSkill: $Enums.DiagnosticSubSkill; mastery: $Enums.MasteryLevel; rationale: string }[];
  overallSummary: string;
}

/** Drops dangling/self prerequisites and falls back invalid icons. */
function sanitizeRoadmap(roadmap: GeneratedRoadmap): void {
  const validKeys = new Set(roadmap.skills.map((s) => s.key));
  for (const skill of roadmap.skills) {
    skill.prerequisites = skill.prerequisites.filter((k) => validKeys.has(k) && k !== skill.key);
    if (!SKILL_ICON_KEYS.includes(skill.icon)) skill.icon = "bulb";
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
