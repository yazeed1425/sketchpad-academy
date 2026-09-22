import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" });
const db = new PrismaClient({ adapter });

interface QuestionSeed {
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "FILL_BLANK";
  prompt: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

interface LessonSeed {
  title: string;
  xpReward: number;
  questions: QuestionSeed[];
}

interface SkillSeed {
  key: string; // local id used only to wire prerequisites within the seed
  title: string;
  description: string;
  icon: string;
  tier: number;
  col: number;
  xpReward: number;
  prerequisites: string[]; // keys of other skills in this path
  milestoneTitle: string;
  lessons: LessonSeed[];
}

interface PathSeed {
  slug: string;
  title: string;
  description: string;
  icon: string;
  order: number;
  milestones: { title: string; description: string; order: number }[];
  skills: SkillSeed[];
}

const mathPath: PathSeed = {
  slug: "math-mastery",
  title: "إتقان الرياضيات",
  description: "ابنِ حسّك العددي ومهاراتك الجبرية عبر شجرة متفرعة من الدروس القصيرة.",
  icon: "compass",
  order: 0,
  milestones: [
    { title: "الأساسيات", description: "الحس العددي وترتيب العمليات الحسابية.", order: 0 },
    { title: "أساسيات الجبر", description: "المتغيرات والتعبيرات والمعادلات الخطية.", order: 1 },
    { title: "الجبر المتقدم", description: "المعادلات التربيعية وأنظمة المعادلات.", order: 2 },
  ],
  skills: [
    {
      key: "number-sense",
      title: "الحس العددي",
      description: "الأعداد الصحيحة والكسور وعلاقتها ببعضها.",
      icon: "lightbulb",
      tier: 0,
      col: 0,
      xpReward: 20,
      prerequisites: [],
      milestoneTitle: "الأساسيات",
      lessons: [
        {
          title: "الأعداد الصحيحة والكسور",
          xpReward: 15,
          questions: [
            {
              type: "MULTIPLE_CHOICE",
              prompt: "أي من التالي عدد صحيح؟",
              options: ["-7", "2.5", "1/3", "√2"],
              correctAnswer: "-7",
              explanation: "الأعداد الصحيحة هي الأعداد الطبيعية ونظيراتها السالبة — بدون كسور أو أعشار.",
            },
            {
              type: "MULTIPLE_CHOICE",
              prompt: "كم يساوي 3/4 على شكل عدد عشري؟",
              options: ["0.34", "0.75", "1.34", "0.43"],
              correctAnswer: "0.75",
              explanation: "اقسم 3 على 4: 3 ÷ 4 = 0.75.",
            },
            {
              type: "TRUE_FALSE",
              prompt: "الصفر عدد صحيح موجب.",
              options: ["صحيح", "خطأ"],
              correctAnswer: "خطأ",
              explanation: "الصفر ليس موجباً ولا سالباً.",
            },
          ],
        },
      ],
    },
    {
      key: "order-of-ops",
      title: "ترتيب العمليات الحسابية",
      description: "الأقواس، الأسس، الضرب والقسمة، ثم الجمع والطرح.",
      icon: "star",
      tier: 0,
      col: 1,
      xpReward: 20,
      prerequisites: [],
      milestoneTitle: "الأساسيات",
      lessons: [
        {
          title: "تطبيق ترتيب العمليات",
          xpReward: 15,
          questions: [
            {
              type: "MULTIPLE_CHOICE",
              prompt: "كم يساوي 3 + 4 × 2؟",
              options: ["14", "11", "10", "9"],
              correctAnswer: "11",
              explanation: "اضرب أولاً: 4 × 2 = 8، ثم أضف 3 → 11.",
            },
            {
              type: "MULTIPLE_CHOICE",
              prompt: "كم يساوي (2 + 3) × 4؟",
              options: ["20", "14", "11", "24"],
              correctAnswer: "20",
              explanation: "الأقواس أولاً: 2 + 3 = 5، ثم 5 × 4 = 20.",
            },
            {
              type: "TRUE_FALSE",
              prompt: "الجمع يُنفَّذ دائماً قبل الضرب.",
              options: ["صحيح", "خطأ"],
              correctAnswer: "خطأ",
              explanation: "الضرب والقسمة يُنفَّذان قبل الجمع والطرح.",
            },
          ],
        },
      ],
    },
    {
      key: "geometry-basics",
      title: "أساسيات الهندسة",
      description: "المحيط والمساحة وزوايا الأشكال الشائعة.",
      icon: "compass",
      tier: 0,
      col: 2,
      xpReward: 20,
      prerequisites: [],
      milestoneTitle: "الأساسيات",
      lessons: [
        {
          title: "الأشكال والزوايا",
          xpReward: 15,
          questions: [
            {
              type: "MULTIPLE_CHOICE",
              prompt: "كم مجموع الزوايا الداخلية للمثلث؟",
              options: ["90°", "180°", "270°", "360°"],
              correctAnswer: "180°",
              explanation: "مجموع الزوايا الداخلية لأي مثلث يساوي 180°.",
            },
            {
              type: "MULTIPLE_CHOICE",
              prompt: "ما مساحة مستطيل أبعاده 4سم × 5سم؟",
              options: ["9 سم²", "18 سم²", "20 سم²", "40 سم²"],
              correctAnswer: "20 سم²",
              explanation: "المساحة = الطول × العرض = 4 × 5 = 20 سم².",
            },
            {
              type: "TRUE_FALSE",
              prompt: "المربع مستطيل دائماً.",
              options: ["صحيح", "خطأ"],
              correctAnswer: "صحيح",
              explanation: "المربع يحقق كل شروط المستطيل (أربع زوايا قائمة)، بالإضافة إلى تساوي أضلاعه.",
            },
          ],
        },
      ],
    },
    {
      key: "variables-expressions",
      title: "المتغيرات والتعبيرات",
      description: "تمثيل المجاهيل بالحروف وتبسيط التعبيرات.",
      icon: "lightbulb",
      tier: 1,
      col: 0,
      xpReward: 25,
      prerequisites: ["number-sense"],
      milestoneTitle: "أساسيات الجبر",
      lessons: [
        {
          title: "كتابة التعبيرات",
          xpReward: 20,
          questions: [
            {
              type: "MULTIPLE_CHOICE",
              prompt: "أي تعبير يمثل 'خمسة أكثر من عدد x'؟",
              options: ["5x", "x - 5", "x + 5", "5/x"],
              correctAnswer: "x + 5",
              explanation: "\"أكثر من\" تعني الجمع: x + 5.",
            },
            {
              type: "MULTIPLE_CHOICE",
              prompt: "بسّط: 3x + 2x",
              options: ["5x", "6x", "5x²", "x"],
              correctAnswer: "5x",
              explanation: "اجمع الحدود المتشابهة: 3x + 2x = 5x.",
            },
            {
              type: "FILL_BLANK",
              prompt: "بسّط: 7y - 3y = ___y",
              options: [],
              correctAnswer: "4",
              explanation: "7y - 3y = 4y، إذاً المعامل هو 4.",
            },
          ],
        },
      ],
    },
    {
      key: "linear-equations",
      title: "المعادلات الخطية",
      description: "حل معادلات ذات خطوة وخطوتين لإيجاد x.",
      icon: "star",
      tier: 1,
      col: 1,
      xpReward: 25,
      prerequisites: ["number-sense", "order-of-ops"],
      milestoneTitle: "أساسيات الجبر",
      lessons: [
        {
          title: "حل المعادلات لإيجاد x",
          xpReward: 20,
          questions: [
            {
              type: "MULTIPLE_CHOICE",
              prompt: "حل: x + 4 = 10",
              options: ["x = 6", "x = 14", "x = 4", "x = -6"],
              correctAnswer: "x = 6",
              explanation: "اطرح 4 من الطرفين: x = 10 - 4 = 6.",
            },
            {
              type: "MULTIPLE_CHOICE",
              prompt: "حل: 3x = 21",
              options: ["x = 3", "x = 7", "x = 18", "x = 24"],
              correctAnswer: "x = 7",
              explanation: "اقسم الطرفين على 3: x = 21 ÷ 3 = 7.",
            },
            {
              type: "MULTIPLE_CHOICE",
              prompt: "حل: 2x + 3 = 11",
              options: ["x = 4", "x = 7", "x = 5.5", "x = 8"],
              correctAnswer: "x = 4",
              explanation: "اطرح 3: 2x = 8. اقسم على 2: x = 4.",
            },
          ],
        },
      ],
    },
    {
      key: "inequalities",
      title: "المتباينات",
      description: "حل ورسم المتباينات البسيطة.",
      icon: "thumb",
      tier: 1,
      col: 2,
      xpReward: 25,
      prerequisites: ["order-of-ops"],
      milestoneTitle: "أساسيات الجبر",
      lessons: [
        {
          title: "حل المتباينات",
          xpReward: 20,
          questions: [
            {
              type: "MULTIPLE_CHOICE",
              prompt: "حل: x - 2 > 5",
              options: ["x > 7", "x > 3", "x < 7", "x > -3"],
              correctAnswer: "x > 7",
              explanation: "أضف 2 للطرفين: x > 5 + 2 = 7.",
            },
            {
              type: "TRUE_FALSE",
              prompt: "قسمة طرفي المتباينة على عدد سالب يعكس اتجاه إشارة المتباينة.",
              options: ["صحيح", "خطأ"],
              correctAnswer: "صحيح",
              explanation: "هذه قاعدة أساسية في المتباينات: القسمة أو الضرب في عدد سالب يعكس الإشارة.",
            },
            {
              type: "MULTIPLE_CHOICE",
              prompt: "حل: -2x < 8",
              options: ["x > -4", "x < -4", "x < 4", "x > 4"],
              correctAnswer: "x > -4",
              explanation: "اقسم على -2 واعكس الإشارة: x > 8 / -2 = -4.",
            },
          ],
        },
      ],
    },
    {
      key: "quadratics",
      title: "المعادلات التربيعية",
      description: "تحليل وحل المعادلات التي تحتوي على x².",
      icon: "badge",
      tier: 2,
      col: 0,
      xpReward: 30,
      prerequisites: ["variables-expressions", "linear-equations"],
      milestoneTitle: "الجبر المتقدم",
      lessons: [
        {
          title: "أساسيات التحليل",
          xpReward: 25,
          questions: [
            {
              type: "MULTIPLE_CHOICE",
              prompt: "حلّل: x² + 5x + 6",
              options: ["(x+2)(x+3)", "(x+1)(x+6)", "(x-2)(x-3)", "(x+6)(x-1)"],
              correctAnswer: "(x+2)(x+3)",
              explanation: "2 × 3 = 6 و 2 + 3 = 5، إذاً التحليل هو (x+2)(x+3).",
            },
            {
              type: "MULTIPLE_CHOICE",
              prompt: "حل: x² - 9 = 0",
              options: ["x = 3 أو x = -3", "x = 9", "x = -9", "x = 3 فقط"],
              correctAnswer: "x = 3 أو x = -3",
              explanation: "x² = 9، إذاً x = ±√9 = ±3.",
            },
          ],
        },
      ],
    },
    {
      key: "systems",
      title: "أنظمة المعادلات",
      description: "حل معادلتين بمجهولين.",
      icon: "badge",
      tier: 2,
      col: 1,
      xpReward: 30,
      prerequisites: ["linear-equations", "inequalities"],
      milestoneTitle: "الجبر المتقدم",
      lessons: [
        {
          title: "طريقة التعويض",
          xpReward: 25,
          questions: [
            {
              type: "MULTIPLE_CHOICE",
              prompt: "إذا كان y = x + 1 و x + y = 5، فما قيمة x؟",
              options: ["x = 2", "x = 3", "x = 1", "x = 4"],
              correctAnswer: "x = 2",
              explanation: "بالتعويض: x + (x+1) = 5 → 2x + 1 = 5 → 2x = 4 → x = 2.",
            },
            {
              type: "TRUE_FALSE",
              prompt: "يمكن أن يكون لنظام معادلتين خطيتين حل واحد بالضبط.",
              options: ["صحيح", "خطأ"],
              correctAnswer: "صحيح",
              explanation: "خطان غير متوازيين يتقاطعان في نقطة واحدة بالضبط.",
            },
          ],
        },
      ],
    },
  ],
};

const pythonPath: PathSeed = {
  slug: "python-basics",
  title: "أساسيات بايثون",
  description: "تعلّم البرمجة بلغة بايثون من المتغيرات إلى الدوال، خطوة بخطوة.",
  icon: "lightbulb",
  order: 1,
  milestones: [
    { title: "البداية", description: "المتغيرات والأنواع والإدخال والإخراج الأساسي.", order: 0 },
    { title: "التحكم في التدفق", description: "الجمل الشرطية والحلقات التكرارية.", order: 1 },
    { title: "الدوال والبيانات", description: "دوال قابلة لإعادة الاستخدام وقوائم.", order: 2 },
  ],
  skills: [
    {
      key: "variables-types",
      title: "المتغيرات والأنواع",
      description: "احفظ البيانات بالمتغيرات وتعرّف على أنواعها.",
      icon: "lightbulb",
      tier: 0,
      col: 0,
      xpReward: 20,
      prerequisites: [],
      milestoneTitle: "البداية",
      lessons: [
        {
          title: "أول متغيراتك",
          xpReward: 15,
          questions: [
            {
              type: "MULTIPLE_CHOICE",
              prompt: "أي سطر ينشئ متغيراً باسم age بقيمة 16 بشكل صحيح؟",
              options: ["age = 16", "16 = age", "var age == 16", "age := 16;"],
              correctAnswer: "age = 16",
              explanation: "بايثون تُسنِد القيم بعلامة يساوي واحدة: name = value.",
            },
            {
              type: "MULTIPLE_CHOICE",
              prompt: "ما نوع القيمة 3.14 في بايثون؟",
              options: ["int", "float", "str", "bool"],
              correctAnswer: "float",
              explanation: "الأعداد التي تحتوي على فاصلة عشرية هي من نوع float.",
            },
            {
              type: "TRUE_FALSE",
              prompt: "في بايثون، \"16\" (بين علامتي تنصيص) تُعامَل كعدد.",
              options: ["صحيح", "خطأ"],
              correctAnswer: "خطأ",
              explanation: "أي شيء بين علامتي تنصيص هو نص (string)، حتى لو بدا كعدد.",
            },
          ],
        },
      ],
    },
    {
      key: "print-input",
      title: "الطباعة والإدخال",
      description: "اعرض المخرجات واقرأ ما يكتبه المستخدم.",
      icon: "star",
      tier: 0,
      col: 1,
      xpReward: 20,
      prerequisites: [],
      milestoneTitle: "البداية",
      lessons: [
        {
          title: "التحدث مع المستخدم",
          xpReward: 15,
          questions: [
            {
              type: "MULTIPLE_CHOICE",
              prompt: "أي دالة تعرض نصاً على الشاشة؟",
              options: ["print()", "display()", "show()", "write()"],
              correctAnswer: "print()",
              explanation: "الدالة print() تكتب نصاً في وحدة التحكم (console).",
            },
            {
              type: "MULTIPLE_CHOICE",
              prompt: "ماذا تُعيد الدالة input() دائماً؟",
              options: ["نص (string)", "عدد صحيح (integer)", "عدد عشري (float)", "قيمة منطقية (boolean)"],
              correctAnswer: "نص (string)",
              explanation: "الدالة input() تُعيد نصاً دائماً — حوّله باستخدام int() أو float() إذا احتجت رقماً.",
            },
          ],
        },
      ],
    },
    {
      key: "conditionals",
      title: "الجمل الشرطية",
      description: "اتخذ القرارات باستخدام if وelif وelse.",
      icon: "lightbulb",
      tier: 1,
      col: 0,
      xpReward: 25,
      prerequisites: ["variables-types"],
      milestoneTitle: "التحكم في التدفق",
      lessons: [
        {
          title: "if وelif وelse",
          xpReward: 20,
          questions: [
            {
              type: "MULTIPLE_CHOICE",
              prompt: "أي كلمة مفتاحية تتحقق من شرط إضافي بعد 'if'؟",
              options: ["elif", "else if", "elseif", "or"],
              correctAnswer: "elif",
              explanation: "بايثون تستخدم 'elif'، وليس 'else if' أو 'elseif'.",
            },
            {
              type: "TRUE_FALSE",
              prompt: "كتلة 'else' تُنفَّذ فقط عندما تفشل كل الشروط السابقة.",
              options: ["صحيح", "خطأ"],
              correctAnswer: "صحيح",
              explanation: "'else' هي الخيار الاحتياطي عندما تفشل كل شروط 'if'/'elif'.",
            },
            {
              type: "MULTIPLE_CHOICE",
              prompt: "ماذا تساوي 5 == 5؟",
              options: ["True", "False", "5", "Error"],
              correctAnswer: "True",
              explanation: "== تتحقق من التساوي وتُعيد قيمة منطقية (boolean).",
            },
          ],
        },
      ],
    },
    {
      key: "loops",
      title: "الحلقات التكرارية",
      description: "كرّر الإجراءات باستخدام for وwhile.",
      icon: "star",
      tier: 1,
      col: 1,
      xpReward: 25,
      prerequisites: ["variables-types", "print-input"],
      milestoneTitle: "التحكم في التدفق",
      lessons: [
        {
          title: "for وwhile",
          xpReward: 20,
          questions: [
            {
              type: "MULTIPLE_CHOICE",
              prompt: "كم مرة تتكرر 'for i in range(5):'؟",
              options: ["5", "4", "6", "لا نهائي"],
              correctAnswer: "5",
              explanation: "range(5) تُنتج القيم 0،1،2،3،4 — خمس قيم.",
            },
            {
              type: "MULTIPLE_CHOICE",
              prompt: "أي حلقة تتكرر طالما بقي الشرط صحيحاً؟",
              options: ["while", "for", "repeat", "loop"],
              correctAnswer: "while",
              explanation: "حلقة 'while' تستمر طالما شرطها صحيحاً (True).",
            },
            {
              type: "TRUE_FALSE",
              prompt: "يمكن لحلقة while أن تعمل إلى الأبد إذا لم يتحول شرطها إلى False أبداً.",
              options: ["صحيح", "خطأ"],
              correctAnswer: "صحيح",
              explanation: "هذه حلقة لا نهائية — تأكد دائماً أن الشرط يمكن أن يصبح False.",
            },
          ],
        },
      ],
    },
    {
      key: "functions",
      title: "الدوال",
      description: "غلّف المنطق القابل لإعادة الاستخدام باستخدام def.",
      icon: "badge",
      tier: 2,
      col: 0,
      xpReward: 30,
      prerequisites: ["conditionals", "loops"],
      milestoneTitle: "الدوال والبيانات",
      lessons: [
        {
          title: "تعريف الدوال",
          xpReward: 25,
          questions: [
            {
              type: "MULTIPLE_CHOICE",
              prompt: "أي كلمة مفتاحية تُعرِّف دالة في بايثون؟",
              options: ["def", "func", "function", "define"],
              correctAnswer: "def",
              explanation: "الدوال تبدأ بـ 'def name():'.",
            },
            {
              type: "MULTIPLE_CHOICE",
              prompt: "ماذا تفعل 'return' داخل الدالة؟",
              options: [
                "تُعيد قيمة إلى الجهة التي استدعت الدالة",
                "تطبع قيمة",
                "تُنهي البرنامج",
                "تُكرر الدالة مرة أخرى",
              ],
              correctAnswer: "تُعيد قيمة إلى الجهة التي استدعت الدالة",
              explanation: "'return' تُسلّم قيمة إلى المكان الذي استُدعيت منه الدالة.",
            },
          ],
        },
      ],
    },
    {
      key: "lists",
      title: "القوائم",
      description: "خزّن وتعامل مع مجموعات مرتبة من البيانات.",
      icon: "badge",
      tier: 2,
      col: 1,
      xpReward: 30,
      prerequisites: ["loops"],
      milestoneTitle: "الدوال والبيانات",
      lessons: [
        {
          title: "التعامل مع القوائم",
          xpReward: 25,
          questions: [
            {
              type: "MULTIPLE_CHOICE",
              prompt: "ما فهرس (index) أول عنصر في قائمة بايثون؟",
              options: ["0", "1", "-1", "first"],
              correctAnswer: "0",
              explanation: "قوائم بايثون تبدأ ترقيمها من الصفر.",
            },
            {
              type: "MULTIPLE_CHOICE",
              prompt: "أي دالة (method) تضيف عنصراً إلى نهاية القائمة؟",
              options: [".append()", ".add()", ".push()", ".insert()"],
              correctAnswer: ".append()",
              explanation: ".append() تضيف عنصراً واحداً إلى نهاية القائمة.",
            },
          ],
        },
      ],
    },
  ],
};

const verbalPath: PathSeed = {
  slug: "verbal-reasoning",
  title: "الاستدلال اللفظي",
  description: "طوّر مهارات التناظر اللفظي واكتشاف الأخطاء واستيعاب المقروء التي يختبرها القسم اللفظي في القدرات.",
  icon: "lightbulb",
  order: 2,
  milestones: [{ title: "أساسيات القسم اللفظي", description: "التناظر اللفظي، الخطأ السياقي، واستيعاب المقروء.", order: 0 }],
  skills: [
    {
      key: "analogies",
      title: "التناظر اللفظي",
      description: "اكتشف العلاقة بين زوج من الكلمات وطابقها.",
      icon: "lightbulb",
      tier: 0,
      col: 0,
      xpReward: 20,
      prerequisites: [],
      milestoneTitle: "أساسيات القسم اللفظي",
      lessons: [
        {
          title: "علاقات الكلمات",
          xpReward: 15,
          questions: [
            {
              type: "MULTIPLE_CHOICE",
              prompt: "الطائر : العش :: النحلة : ___؟",
              options: ["الخلية", "الزهرة", "العسل", "الجناح"],
              correctAnswer: "الخلية",
              explanation: "الطائر يعيش في العش كما تعيش النحلة في الخلية — نفس العلاقة (حيوان ← مسكنه).",
            },
            {
              type: "MULTIPLE_CHOICE",
              prompt: "القلم : الكتابة :: السكين : ___؟",
              options: ["القطع", "المطبخ", "حاد", "معدن"],
              correctAnswer: "القطع",
              explanation: "وظيفة القلم الكتابة؛ ووظيفة السكين القطع — أداة ← وظيفتها.",
            },
          ],
        },
      ],
    },
    {
      key: "contextual-errors",
      title: "الخطأ السياقي",
      description: "اكتشف الكلمة التي لا تناسب معنى الجملة.",
      icon: "star",
      tier: 0,
      col: 1,
      xpReward: 20,
      prerequisites: [],
      milestoneTitle: "أساسيات القسم اللفظي",
      lessons: [
        {
          title: "اكتشف الخطأ",
          xpReward: 15,
          questions: [
            {
              type: "MULTIPLE_CHOICE",
              prompt: "أي كلمة استُخدمت خطأً؟ \"الحرارة الصحراوية المتجمدة اضطرتهم للبحث عن الظل.\"",
              options: ["المتجمدة", "الصحراوية", "الظل", "اضطرتهم"],
              correctAnswer: "المتجمدة",
              explanation: "\"المتجمدة\" تتناقض مع \"الحرارة الصحراوية\" — الجملة تحتاج كلمة مثل \"اللاهبة\" بدلاً منها.",
            },
            {
              type: "MULTIPLE_CHOICE",
              prompt: "أي كلمة استُخدمت خطأً؟ \"همست بصوتٍ عالٍ حتى يسمع الجميع السر.\"",
              options: ["همست", "عالٍ", "السر", "يسمع"],
              correctAnswer: "همست",
              explanation: "الهمس يعني الكلام بصوت خافت بحكم تعريفه، ما يتناقض مع \"بصوت عالٍ\" و\"يسمع الجميع\".",
            },
          ],
        },
      ],
    },
    {
      key: "reading-comprehension",
      title: "استيعاب المقروء",
      description: "اقرأ فقرة قصيرة وأجب عن أسئلة حولها.",
      icon: "badge",
      tier: 0,
      col: 2,
      xpReward: 20,
      prerequisites: [],
      milestoneTitle: "أساسيات القسم اللفظي",
      lessons: [
        {
          title: "فقرات قصيرة",
          xpReward: 15,
          questions: [
            {
              type: "MULTIPLE_CHOICE",
              prompt:
                "النص: \"تغطي الشعاب المرجانية أقل من 1% من قاع المحيط، لكنها تدعم حوالي ربع جميع الكائنات البحرية.\" ما الفكرة الرئيسية؟",
              options: [
                "الشعاب المرجانية صغيرة المساحة لكنها حيوية بيئياً",
                "معظم قاع المحيط مغطى بالمرجان",
                "معظم الكائنات البحرية تعيش خارج الشعاب",
                "الشعاب المرجانية تتقلص كل عام",
              ],
              correctAnswer: "الشعاب المرجانية صغيرة المساحة لكنها حيوية بيئياً",
              explanation: "يقارن النص بين المساحة الصغيرة جداً للشعاب والنسبة الكبيرة من الكائنات التي تدعمها.",
            },
          ],
        },
      ],
    },
  ],
};

const questTemplates = [
  { type: "COMPLETE_LESSONS" as const, description: "Complete {target} lessons today", targetMin: 1, targetMax: 3, xpReward: 30 },
  { type: "EARN_XP" as const, description: "Earn {target} XP today", targetMin: 80, targetMax: 200, xpReward: 40 },
  { type: "PERFECT_QUIZ" as const, description: "Get a perfect score on {target} quiz", targetMin: 1, targetMax: 1, xpReward: 50 },
  { type: "PRACTICE_SESSION" as const, description: "Finish {target} practice session", targetMin: 1, targetMax: 1, xpReward: 20 },
];

const badges = [
  { key: "first-steps", title: "First Steps", description: "Complete your first skill.", icon: "star", criteria: "SKILLS_COMPLETED" as const, criteriaValue: 1 },
  { key: "streak-3", title: "Three-Day Spark", description: "Reach a 3-day streak.", icon: "flame", criteria: "STREAK_DAYS" as const, criteriaValue: 3 },
  { key: "streak-7", title: "Week-Long Streak", description: "Reach a 7-day streak.", icon: "flame", criteria: "STREAK_DAYS" as const, criteriaValue: 7 },
  { key: "streak-30", title: "Streak Champion", description: "Reach a 30-day streak.", icon: "flame", criteria: "STREAK_DAYS" as const, criteriaValue: 30 },
  { key: "level-5", title: "Rising Star", description: "Reach level 5.", icon: "badge", criteria: "LEVEL_REACHED" as const, criteriaValue: 5 },
  { key: "level-10", title: "Dedicated Learner", description: "Reach level 10.", icon: "badge", criteria: "LEVEL_REACHED" as const, criteriaValue: 10 },
  { key: "skills-10", title: "Skill Collector", description: "Complete 10 skills.", icon: "lightbulb", criteria: "SKILLS_COMPLETED" as const, criteriaValue: 10 },
  { key: "perfect-5", title: "Sharp Shooter", description: "Score 100% on 5 quizzes.", icon: "thumb", criteria: "PERFECT_QUIZZES" as const, criteriaValue: 5 },
  { key: "promoted-1", title: "Climbing the Ranks", description: "Get promoted out of a league division.", icon: "star", criteria: "LEAGUE_PROMOTIONS" as const, criteriaValue: 1 },
  { key: "path-complete", title: "Path Master", description: "Complete every skill in a learning path.", icon: "badge", criteria: "PATH_COMPLETED" as const, criteriaValue: 1 },
];

async function seedPath(path: PathSeed) {
  const created = await db.learningPath.upsert({
    where: { slug: path.slug },
    create: { slug: path.slug, title: path.title, description: path.description, icon: path.icon, order: path.order },
    update: { title: path.title, description: path.description, icon: path.icon, order: path.order },
  });

  const milestoneIdByTitle = new Map<string, string>();
  for (const m of path.milestones) {
    const existing = await db.milestone.findFirst({ where: { pathId: created.id, title: m.title } });
    const milestone = existing
      ? await db.milestone.update({ where: { id: existing.id }, data: { description: m.description, order: m.order } })
      : await db.milestone.create({ data: { pathId: created.id, title: m.title, description: m.description, order: m.order } });
    milestoneIdByTitle.set(m.title, milestone.id);
  }

  const skillIdByKey = new Map<string, string>();
  for (const s of path.skills) {
    const existing = await db.skill.findFirst({ where: { pathId: created.id, title: s.title } });
    const skill = existing
      ? await db.skill.update({
          where: { id: existing.id },
          data: {
            description: s.description,
            icon: s.icon,
            tier: s.tier,
            col: s.col,
            xpReward: s.xpReward,
            milestoneId: milestoneIdByTitle.get(s.milestoneTitle),
          },
        })
      : await db.skill.create({
          data: {
            pathId: created.id,
            title: s.title,
            description: s.description,
            icon: s.icon,
            tier: s.tier,
            col: s.col,
            xpReward: s.xpReward,
            milestoneId: milestoneIdByTitle.get(s.milestoneTitle),
          },
        });
    skillIdByKey.set(s.key, skill.id);

    // Rebuild lessons/questions fresh each seed run for simplicity.
    await db.lesson.deleteMany({ where: { skillId: skill.id } });
    for (const [order, lesson] of s.lessons.entries()) {
      const createdLesson = await db.lesson.create({
        data: { skillId: skill.id, title: lesson.title, order, xpReward: lesson.xpReward },
      });
      for (const [qOrder, q] of lesson.questions.entries()) {
        await db.question.create({
          data: {
            lessonId: createdLesson.id,
            type: q.type,
            prompt: q.prompt,
            optionsJson: JSON.stringify(q.options),
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            order: qOrder,
          },
        });
      }
    }
  }

  // Wire prerequisites once every skill exists.
  for (const s of path.skills) {
    const skillId = skillIdByKey.get(s.key)!;
    await db.skillPrerequisite.deleteMany({ where: { skillId } });
    for (const prereqKey of s.prerequisites) {
      const prerequisiteId = skillIdByKey.get(prereqKey)!;
      await db.skillPrerequisite.create({ data: { skillId, prerequisiteId } });
    }
  }
}

async function main() {
  await seedPath(mathPath);
  await seedPath(pythonPath);
  await seedPath(verbalPath);

  for (const t of questTemplates) {
    const existing = await db.dailyQuestTemplate.findFirst({ where: { type: t.type, description: t.description } });
    if (!existing) await db.dailyQuestTemplate.create({ data: t });
  }

  for (const b of badges) {
    await db.badge.upsert({ where: { key: b.key }, create: b, update: b });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
