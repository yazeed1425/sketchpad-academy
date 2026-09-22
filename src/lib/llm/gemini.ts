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
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Gemini returned malformed JSON");
  }
}

const SUBSKILL_LABEL_AR: Record<$Enums.DiagnosticSubSkill, string> = {
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

export interface GeneratedQuestion {
  prompt: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
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
- اجعل الشرح (explanation) جملة أو جملتين توضح سبب صحة الإجابة.${avoid}
أعد النتيجة بصيغة JSON فقط حسب المخطط المطلوب، بدون أي نص إضافي.`;

  const result = await generateJson<GeneratedQuestion>(prompt, QUESTION_SCHEMA);

  if (!result.options.includes(result.correctAnswer)) {
    const trimmedMatch = result.options.find((o) => o.trim() === result.correctAnswer.trim());
    if (!trimmedMatch) throw new Error("Gemini's correctAnswer did not match any of its own options");
    result.correctAnswer = trimmedMatch;
  }
  if (result.options.length !== 4) throw new Error("Gemini did not return exactly 4 options");

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
فيما يلي محضر إجابات طالب على اختبار تحديد مستوى تكيّفي شمل 6 مهارات فرعية (كل مهارة سؤالان: الأول بمستوى متوسط، والثاني إما أصعب إن أجاب صح أو أسهل إن أجاب خطأ):

${transcriptText}

لكل مهارة من المهارات الست التالية بالضبط: ARITHMETIC, ALGEBRA, GEOMETRY, ANALOGIES, CONTEXTUAL_ERRORS, READING_COMPREHENSION —
صنّف مستوى إتقان الطالب لها إلى واحدة من: MASTERED (متقن)، DEVELOPING (قيد التطور)، GAP (فجوة مهارية)، واكتب سبباً موجزاً بالعربية (جملة واحدة) يعتمد على مستوى الصعوبة الذي وصل إليه الطالب وصحة إجاباته في تلك المهارة.
ثم اكتب ملخصاً عاماً وموجزاً بالعربية (3-4 جمل) عن أداء الطالب إجمالاً، ونقطة الانطلاق المناسبة له في خطة تعلّمه.
أعد النتيجة بصيغة JSON فقط حسب المخطط المطلوب، متضمّناً المهارات الست كلها بدون استثناء.`;

  return generateJson<LlmEvaluation>(prompt, EVALUATION_SCHEMA);
}
