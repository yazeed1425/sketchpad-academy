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

export type LessonSectionType = "concept" | "example" | "warning";

export interface LessonContentSection {
  type: LessonSectionType;
  heading: string;
  body: string;
}

export interface GeneratedLessonContent {
  sections: LessonContentSection[];
}

const LESSON_CONTENT_SCHEMA = {
  type: "OBJECT",
  properties: {
    sections: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          type: { type: "STRING", enum: ["concept", "example", "warning"] },
          heading: { type: "STRING" },
          body: { type: "STRING" },
        },
        required: ["type", "heading", "body"],
      },
    },
  },
  required: ["sections"],
};

/** Generates the explanatory lesson content shown before its quiz, in Arabic Markdown+LaTeX. Called once per lesson and cached. */
export async function generateLessonContent(params: { title: string; description: string }): Promise<GeneratedLessonContent> {
  const prompt = `أنت معلم قدرات سعودي محترف (GAT) وخبير متمرّس تحديداً في مادة هذا الدرس — حدد أولاً التخصص الدقيق (رياضيات، جبر، هندسة، لغة عربية، استيعاب مقروء، تناظر لفظي... إلخ) من عنوان ووصف الدرس أدناه، واشرح بصفتك ذلك الخبير بالضبط، لا معلّماً عاماً. مهمتك شرح الدرس بأسلوب بصري ومبسّط ومباشر موجّه لطالب ثانوي، بدقة متناهية ودون أي مقدمات أو جمل تحفيزية فارغة (مثل "أهلاً بك"، "يا بطل"، "في رحلتك"، "تخيل معي"، "دعنا نستكشف"). كل جملة يجب أن تحمل معلومة أو قاعدة أو رقماً أو خطوة حل فعلية — إن حذفتَ الجملة ونقص المحتوى العلمي فهي حشو ويجب حذفها فعلاً.

عنوان الدرس: "${params.title}"
وصف الدرس: "${params.description}"

قواعد تنسيق المعادلات والنصوص (صارمة جداً):
- أي معادلة أو كسر أو قانون مستقل: بصيغة LaTeX بين علامتي $$ في سطر مستقل به، مثل: $$\\frac{a}{b}$$
- أي رمز أو رقم أو متغير داخل جملة نصية: بصيغة LaTeX بين علامتي $ فقط، مثل: $20\\%$. لا تضع أي حرف أو كلمة عربية داخل علامتي $ أو $$ أبداً — يُسمح داخلها فقط بأرقام ورموز ومتغيرات لاتينية وعمليات رياضية.
- تجنّب الفقرات الطويلة المتصلة تماماً — استخدم نقاطاً (- item) وأسطراً مستقلة لكل فكرة أو خطوة.
- استخدم **نص عريض** (Markdown) لإبراز المصطلحات والتسميات المهمة.
- لا تستخدم LaTeX خارج القسم الكمي (لا داعي له بمواضيع لغوية).

أعد بالضبط 3 أقسام (sections)، كل قسم له type محدد بالضبط كالتالي:

1. type="concept" — heading قصير جداً للمفهوم الأساسي. body: شرح مختصر جداً للمفهوم في سطرين كحد أقصى بصيغة نقاط، ثم القانون الأساسي في سطر LaTeX مستقل بين $$...$$.

2. type="example" — heading يذكر أنه مثال توضيحي محلول. body يتبع بالضبط هذا الهيكل، مع سطر فارغ فاصل بين كل جزء (المسألة، خطوات الحل، النتيجة النهائية) حتى يُفهم كل جزء ككتلة Markdown مستقلة:
**المسألة:** مسألة واقعية بأسلوب تجميعات اختبار القدرات، بأرقام حقيقية وليست افتراضية.

**خطوات الحل:**
1. **الخطوة الأولى:** شرح مختصر مع أي معادلة بصيغة $...$ أو $$...$$.
2. **الخطوة الثانية:** شرح مختصر مع أي معادلة.
(أضف خطوات إضافية بنفس النمط إن احتاج الحل ذلك)

**النتيجة النهائية:** القيمة النهائية بصيغة $...$

3. type="warning" — heading يذكر أنه خطأ شائع وتجنبه. body: نقطة أو نقطتان (- item) تذكر أكثر خطأ فعلي يقع فيه الطلاب في اختبار القدرات تحديداً بهذا الموضوع، مع طريقة تجنبه باختصار.

أعد النتيجة بصيغة JSON فقط حسب المخطط المطلوب، بدون أي نص إضافي، وبدون رموز Markdown داخل heading (heading نص عادي فقط).`;

  return generateJson<GeneratedLessonContent>(prompt, LESSON_CONTENT_SCHEMA);
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
فيما يلي محضر إجابات طالب على اختبار تحديد مستوى تكيّفي شامل من 30 سؤالاً، مقسّم على 6 مهارات فرعية (كل مهارة خمسة أسئلة تكيّفية متتالية: تبدأ بمستوى متوسط، وكل سؤال لاحق يصعب مستوى واحد إن أجاب الطالب صح، أو يسهل مستوى واحد إن أخطأ، ضمن ثلاثة مستويات: سهل/متوسط/صعب):

${transcriptText}

لكل مهارة من المهارات الست التالية بالضبط: ARITHMETIC, ALGEBRA, GEOMETRY, ANALOGIES, CONTEXTUAL_ERRORS, READING_COMPREHENSION —
صنّف مستوى إتقان الطالب لها إلى واحدة من: MASTERED (متقن)، DEVELOPING (قيد التطور)، GAP (فجوة مهارية)، واكتب سبباً موجزاً بالعربية (جملة واحدة) يعتمد على مستوى الصعوبة الذي وصل إليه الطالب وصحة إجاباته في تلك المهارة.
ثم اكتب ملخصاً عاماً وموجزاً بالعربية (3-4 جمل) عن أداء الطالب إجمالاً، ونقطة الانطلاق المناسبة له في خطة تعلّمه.
أعد النتيجة بصيغة JSON فقط حسب المخطط المطلوب، متضمّناً المهارات الست كلها بدون استثناء.`;

  return generateJson<LlmEvaluation>(prompt, EVALUATION_SCHEMA);
}

export interface GeneratedRoadmapQuestion {
  prompt: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
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
  questions: GeneratedRoadmapQuestion[];
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
    // No minItems/maxItems on `milestones`/`skills` — Gemini's structured-output validator
    // rejects the request (400 INVALID_ARGUMENT) once a 3rd array in this schema gets length
    // bounds on top of `questions`/`options` below. The prompt states the target range in
    // words instead, which the model follows closely enough in practice.
    milestones: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { title: { type: "STRING" }, description: { type: "STRING" } },
        required: ["title", "description"],
      },
    },
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
          questions: {
            type: "ARRAY",
            minItems: 2,
            maxItems: 3,
            items: {
              type: "OBJECT",
              properties: {
                prompt: { type: "STRING" },
                options: { type: "ARRAY", items: { type: "STRING" }, minItems: 4, maxItems: 4 },
                correctAnswer: { type: "STRING" },
                explanation: { type: "STRING" },
              },
              required: ["prompt", "options", "correctAnswer", "explanation"],
            },
          },
        },
        required: ["key", "title", "description", "milestoneTitle", "tier", "alreadyMastered", "prerequisites", "lessonTitle", "icon", "questions"],
      },
    },
  },
  required: ["title", "description", "milestones", "skills"],
};

export interface RoadmapEvaluationInput {
  subSkills: { subSkill: $Enums.DiagnosticSubSkill; mastery: $Enums.MasteryLevel; rationale: string }[];
  overallSummary: string;
}

/** Designs a personalized skill-tree roadmap (with real practice lessons) from a diagnostic's results. */
export async function generatePersonalizedRoadmap(evaluation: RoadmapEvaluationInput): Promise<GeneratedRoadmap> {
  const breakdown = evaluation.subSkills
    .map((s) => `- ${SUBSKILL_LABEL_AR[s.subSkill]}: ${s.mastery === "MASTERED" ? "متقن" : s.mastery === "DEVELOPING" ? "قيد التطور" : "فجوة مهارية"} — ${s.rationale}`)
    .join("\n");

  const prompt = `أنت مصمم مناهج خبير في اختبار القدرات العامة (GAT) السعودي.
نتيجة تقييم طالب في اختبار تحديد مستوى تكيّفي:
${breakdown}

ملخص عام: ${evaluation.overallSummary}

صمّم خطة تعلّم شخصية شاملة (شجرة مهارات) لهذا الطالب تحديداً بناءً على نتيجته، تغطي القسمين الكمي واللفظي معاً:
- من 10 إلى 16 عقدة مهارة (skills) إجمالاً موزّعة على المهارات الست كلها (لا تتجاهل أي مهارة حتى لو كانت متقنة). خصّص لكل مهارة "فجوة مهارية" عقدتين إلى ثلاث عقد متدرجة الصعوبة كنقاط بداية أساسية (أدنى tier)، ولكل مهارة "قيد التطور" عقدة إلى عقدتين لتعزيزها (tier أوسط)، ولكل مهارة "متقنة" عقدة تحدٍّ واحدة على الأقل للتثبيت (أعلى tier).
- قسّم الخطة إلى عدة مراحل (milestones) واضحة ومنصّفة بشكل جيد — من 4 إلى 8 مراحل، كل مرحلة مخصصة لمهارة فرعية واحدة أو مهارتين مرتبطتين موضوعياً ضمن نفس القسم (الكمي أو اللفظي). لا تجمع كل العقد في مرحلة واحدة كبيرة. رتّب المراحل بحيث تأتي مراحل الفجوات أولاً، ثم مراحل التعزيز، ثم مرحلة التحدي الختامية إن وجدت.
- لكل عقدة: key فريد بالإنجليزية (kebab-case)، عنوان ووصف بالعربية، milestoneTitle (اسم إحدى المراحل أعلاه بالضبط)، tier (رقم صف يبدأ من 0 ويعكس ترتيب المرحلة)، alreadyMastered (true فقط إذا كانت هذه العقدة تمثل مباشرة مهارة صنّفها التقييم كـ"متقن")، وقائمة prerequisites (مفاتيح عقد أخرى في نفس القائمة يجب إتقانها أولاً — عقد tier 0 غالباً بدون متطلبات سابقة).
- لكل عقدة: درس واحد (lessonTitle) يحتوي على 2-3 أسئلة اختيار من متعدد بالعربية (4 خيارات، خيار صحيح واحد يطابق correctAnswer حرفياً، مع شرح موجز) تدرّب الطالب تحديداً على الفجوة أو نقطة الضعف المحددة في تلك المهارة.
- لكل عقدة: اختر icon واحداً يناسب موضوعها من هذه القيم فقط: books (قراءة/نصوص/لغة)، bulb (مفاهيم عامة وأفكار)، search (تحليل/اكتشاف/تدقيق)، calculator (حساب/جبر/عمليات رياضية)، chart (مهارة ختامية أو تحدٍّ متقدم مركّب). ملاحظة: العقد المقفلة (تعتمد على متطلبات لم تُتقَن بعد) والعقد المتقنة مسبقاً تُعرض بشارتها الخاصة بغض النظر عن icon، فلا داعي لمراعاة ذلك.
- أعطِ الخطة عنواناً ووصفاً عاماً بالعربية (title, description).
أعد النتيجة بصيغة JSON فقط حسب المخطط المطلوب.`;

  const roadmap = await generateJson<GeneratedRoadmap>(prompt, ROADMAP_SCHEMA);

  const validKeys = new Set(roadmap.skills.map((s) => s.key));
  for (const skill of roadmap.skills) {
    skill.prerequisites = skill.prerequisites.filter((k) => validKeys.has(k) && k !== skill.key);
    if (!SKILL_ICON_KEYS.includes(skill.icon)) skill.icon = "bulb";
    for (const q of skill.questions) {
      if (!q.options.includes(q.correctAnswer)) {
        const trimmedMatch = q.options.find((o) => o.trim() === q.correctAnswer.trim());
        if (trimmedMatch) q.correctAnswer = trimmedMatch;
      }
    }
  }

  return roadmap;
}
