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
  title: "Math Mastery",
  description: "Build number sense and algebra skills through a branching tree of bite-sized lessons.",
  icon: "compass",
  order: 0,
  milestones: [
    { title: "Foundations", description: "Number sense and the order of operations.", order: 0 },
    { title: "Algebra Basics", description: "Variables, expressions, and linear equations.", order: 1 },
    { title: "Advanced Algebra", description: "Quadratics and systems of equations.", order: 2 },
  ],
  skills: [
    {
      key: "number-sense",
      title: "Number Sense",
      description: "Integers, fractions, and how they relate.",
      icon: "lightbulb",
      tier: 0,
      col: 0,
      xpReward: 20,
      prerequisites: [],
      milestoneTitle: "Foundations",
      lessons: [
        {
          title: "Integers & Fractions",
          xpReward: 15,
          questions: [
            {
              type: "MULTIPLE_CHOICE",
              prompt: "Which of these is an integer?",
              options: ["-7", "2.5", "1/3", "√2"],
              correctAnswer: "-7",
              explanation: "Integers are whole numbers and their negatives — no fractions or decimals.",
            },
            {
              type: "MULTIPLE_CHOICE",
              prompt: "What is 3/4 written as a decimal?",
              options: ["0.34", "0.75", "1.34", "0.43"],
              correctAnswer: "0.75",
              explanation: "Divide 3 by 4: 3 ÷ 4 = 0.75.",
            },
            {
              type: "TRUE_FALSE",
              prompt: "Zero is a positive integer.",
              options: ["True", "False"],
              correctAnswer: "False",
              explanation: "Zero is neither positive nor negative.",
            },
          ],
        },
      ],
    },
    {
      key: "order-of-ops",
      title: "Order of Operations",
      description: "PEMDAS: parentheses, exponents, multiply/divide, add/subtract.",
      icon: "star",
      tier: 0,
      col: 1,
      xpReward: 20,
      prerequisites: [],
      milestoneTitle: "Foundations",
      lessons: [
        {
          title: "PEMDAS in Practice",
          xpReward: 15,
          questions: [
            {
              type: "MULTIPLE_CHOICE",
              prompt: "What is 3 + 4 × 2?",
              options: ["14", "11", "10", "9"],
              correctAnswer: "11",
              explanation: "Multiply first: 4 × 2 = 8, then add 3 → 11.",
            },
            {
              type: "MULTIPLE_CHOICE",
              prompt: "What is (2 + 3) × 4?",
              options: ["20", "14", "11", "24"],
              correctAnswer: "20",
              explanation: "Parentheses first: 2 + 3 = 5, then 5 × 4 = 20.",
            },
            {
              type: "TRUE_FALSE",
              prompt: "Addition always happens before multiplication.",
              options: ["True", "False"],
              correctAnswer: "False",
              explanation: "Multiplication and division come before addition and subtraction.",
            },
          ],
        },
      ],
    },
    {
      key: "geometry-basics",
      title: "Geometry Basics",
      description: "Perimeter, area, and angles of common shapes.",
      icon: "compass",
      tier: 0,
      col: 2,
      xpReward: 20,
      prerequisites: [],
      milestoneTitle: "Foundations",
      lessons: [
        {
          title: "Shapes & Angles",
          xpReward: 15,
          questions: [
            {
              type: "MULTIPLE_CHOICE",
              prompt: "What is the sum of the interior angles of a triangle?",
              options: ["90°", "180°", "270°", "360°"],
              correctAnswer: "180°",
              explanation: "Every triangle's interior angles add up to 180°.",
            },
            {
              type: "MULTIPLE_CHOICE",
              prompt: "What is the area of a rectangle 4cm by 5cm?",
              options: ["9 cm²", "18 cm²", "20 cm²", "40 cm²"],
              correctAnswer: "20 cm²",
              explanation: "Area = length × width = 4 × 5 = 20 cm².",
            },
            {
              type: "TRUE_FALSE",
              prompt: "A square is always a rectangle.",
              options: ["True", "False"],
              correctAnswer: "True",
              explanation: "A square meets every requirement of a rectangle (four right angles), plus equal sides.",
            },
          ],
        },
      ],
    },
    {
      key: "variables-expressions",
      title: "Variables & Expressions",
      description: "Represent unknowns with letters and simplify expressions.",
      icon: "lightbulb",
      tier: 1,
      col: 0,
      xpReward: 25,
      prerequisites: ["number-sense"],
      milestoneTitle: "Algebra Basics",
      lessons: [
        {
          title: "Writing Expressions",
          xpReward: 20,
          questions: [
            {
              type: "MULTIPLE_CHOICE",
              prompt: "Which expression represents 'five more than a number x'?",
              options: ["5x", "x - 5", "x + 5", "5/x"],
              correctAnswer: "x + 5",
              explanation: "\"More than\" means addition: x + 5.",
            },
            {
              type: "MULTIPLE_CHOICE",
              prompt: "Simplify: 3x + 2x",
              options: ["5x", "6x", "5x²", "x"],
              correctAnswer: "5x",
              explanation: "Combine like terms: 3x + 2x = 5x.",
            },
            {
              type: "FILL_BLANK",
              prompt: "Simplify: 7y - 3y = ___y",
              options: [],
              correctAnswer: "4",
              explanation: "7y - 3y = 4y, so the coefficient is 4.",
            },
          ],
        },
      ],
    },
    {
      key: "linear-equations",
      title: "Linear Equations",
      description: "Solve for x in one-step and two-step equations.",
      icon: "star",
      tier: 1,
      col: 1,
      xpReward: 25,
      prerequisites: ["number-sense", "order-of-ops"],
      milestoneTitle: "Algebra Basics",
      lessons: [
        {
          title: "Solving for x",
          xpReward: 20,
          questions: [
            {
              type: "MULTIPLE_CHOICE",
              prompt: "Solve: x + 4 = 10",
              options: ["x = 6", "x = 14", "x = 4", "x = -6"],
              correctAnswer: "x = 6",
              explanation: "Subtract 4 from both sides: x = 10 - 4 = 6.",
            },
            {
              type: "MULTIPLE_CHOICE",
              prompt: "Solve: 3x = 21",
              options: ["x = 3", "x = 7", "x = 18", "x = 24"],
              correctAnswer: "x = 7",
              explanation: "Divide both sides by 3: x = 21 ÷ 3 = 7.",
            },
            {
              type: "MULTIPLE_CHOICE",
              prompt: "Solve: 2x + 3 = 11",
              options: ["x = 4", "x = 7", "x = 5.5", "x = 8"],
              correctAnswer: "x = 4",
              explanation: "Subtract 3: 2x = 8. Divide by 2: x = 4.",
            },
          ],
        },
      ],
    },
    {
      key: "inequalities",
      title: "Inequalities",
      description: "Solve and graph simple inequalities.",
      icon: "thumb",
      tier: 1,
      col: 2,
      xpReward: 25,
      prerequisites: ["order-of-ops"],
      milestoneTitle: "Algebra Basics",
      lessons: [
        {
          title: "Solving Inequalities",
          xpReward: 20,
          questions: [
            {
              type: "MULTIPLE_CHOICE",
              prompt: "Solve: x - 2 > 5",
              options: ["x > 7", "x > 3", "x < 7", "x > -3"],
              correctAnswer: "x > 7",
              explanation: "Add 2 to both sides: x > 5 + 2 = 7.",
            },
            {
              type: "TRUE_FALSE",
              prompt: "Dividing both sides of an inequality by a negative number flips the inequality sign.",
              options: ["True", "False"],
              correctAnswer: "True",
              explanation: "This is a key inequality rule: dividing/multiplying by a negative flips the sign.",
            },
            {
              type: "MULTIPLE_CHOICE",
              prompt: "Solve: -2x < 8",
              options: ["x > -4", "x < -4", "x < 4", "x > 4"],
              correctAnswer: "x > -4",
              explanation: "Divide by -2 and flip the sign: x > 8 / -2 = -4.",
            },
          ],
        },
      ],
    },
    {
      key: "quadratics",
      title: "Quadratic Equations",
      description: "Factor and solve equations with x².",
      icon: "badge",
      tier: 2,
      col: 0,
      xpReward: 30,
      prerequisites: ["variables-expressions", "linear-equations"],
      milestoneTitle: "Advanced Algebra",
      lessons: [
        {
          title: "Factoring Basics",
          xpReward: 25,
          questions: [
            {
              type: "MULTIPLE_CHOICE",
              prompt: "Factor: x² + 5x + 6",
              options: ["(x+2)(x+3)", "(x+1)(x+6)", "(x-2)(x-3)", "(x+6)(x-1)"],
              correctAnswer: "(x+2)(x+3)",
              explanation: "2 × 3 = 6 and 2 + 3 = 5, so it factors to (x+2)(x+3).",
            },
            {
              type: "MULTIPLE_CHOICE",
              prompt: "Solve: x² - 9 = 0",
              options: ["x = 3 or x = -3", "x = 9", "x = -9", "x = 3 only"],
              correctAnswer: "x = 3 or x = -3",
              explanation: "x² = 9, so x = ±√9 = ±3.",
            },
          ],
        },
      ],
    },
    {
      key: "systems",
      title: "Systems of Equations",
      description: "Solve two equations with two unknowns.",
      icon: "badge",
      tier: 2,
      col: 1,
      xpReward: 30,
      prerequisites: ["linear-equations", "inequalities"],
      milestoneTitle: "Advanced Algebra",
      lessons: [
        {
          title: "Substitution Method",
          xpReward: 25,
          questions: [
            {
              type: "MULTIPLE_CHOICE",
              prompt: "If y = x + 1 and x + y = 5, what is x?",
              options: ["x = 2", "x = 3", "x = 1", "x = 4"],
              correctAnswer: "x = 2",
              explanation: "Substitute: x + (x+1) = 5 → 2x + 1 = 5 → 2x = 4 → x = 2.",
            },
            {
              type: "TRUE_FALSE",
              prompt: "A system of two linear equations can have exactly one solution.",
              options: ["True", "False"],
              correctAnswer: "True",
              explanation: "Two non-parallel lines intersect at exactly one point.",
            },
          ],
        },
      ],
    },
  ],
};

const pythonPath: PathSeed = {
  slug: "python-basics",
  title: "Python Basics",
  description: "Learn to code in Python from variables to functions, one skill node at a time.",
  icon: "lightbulb",
  order: 1,
  milestones: [
    { title: "Getting Started", description: "Variables, types, and basic I/O.", order: 0 },
    { title: "Control Flow", description: "Conditionals and loops.", order: 1 },
    { title: "Functions & Data", description: "Reusable functions and lists.", order: 2 },
  ],
  skills: [
    {
      key: "variables-types",
      title: "Variables & Types",
      description: "Store data with variables and know your types.",
      icon: "lightbulb",
      tier: 0,
      col: 0,
      xpReward: 20,
      prerequisites: [],
      milestoneTitle: "Getting Started",
      lessons: [
        {
          title: "Your First Variables",
          xpReward: 15,
          questions: [
            {
              type: "MULTIPLE_CHOICE",
              prompt: "Which line correctly creates a variable named age with value 16?",
              options: ["age = 16", "16 = age", "var age == 16", "age := 16;"],
              correctAnswer: "age = 16",
              explanation: "Python assigns with a single equals sign: name = value.",
            },
            {
              type: "MULTIPLE_CHOICE",
              prompt: "What type is the value 3.14 in Python?",
              options: ["int", "float", "str", "bool"],
              correctAnswer: "float",
              explanation: "Numbers with a decimal point are floats.",
            },
            {
              type: "TRUE_FALSE",
              prompt: "In Python, \"16\" (in quotes) is treated as a number.",
              options: ["True", "False"],
              correctAnswer: "False",
              explanation: "Anything in quotes is a string, even if it looks like a number.",
            },
          ],
        },
      ],
    },
    {
      key: "print-input",
      title: "Print & Input",
      description: "Show output and read what the user types.",
      icon: "star",
      tier: 0,
      col: 1,
      xpReward: 20,
      prerequisites: [],
      milestoneTitle: "Getting Started",
      lessons: [
        {
          title: "Talking to the User",
          xpReward: 15,
          questions: [
            {
              type: "MULTIPLE_CHOICE",
              prompt: "Which function displays text on the screen?",
              options: ["print()", "display()", "show()", "write()"],
              correctAnswer: "print()",
              explanation: "print() writes text to the console.",
            },
            {
              type: "MULTIPLE_CHOICE",
              prompt: "What does input() always return?",
              options: ["a string", "an integer", "a float", "a boolean"],
              correctAnswer: "a string",
              explanation: "input() always returns text — convert it with int() or float() if you need a number.",
            },
          ],
        },
      ],
    },
    {
      key: "conditionals",
      title: "Conditionals",
      description: "Make decisions with if, elif, and else.",
      icon: "lightbulb",
      tier: 1,
      col: 0,
      xpReward: 25,
      prerequisites: ["variables-types"],
      milestoneTitle: "Control Flow",
      lessons: [
        {
          title: "If, Elif, Else",
          xpReward: 20,
          questions: [
            {
              type: "MULTIPLE_CHOICE",
              prompt: "Which keyword checks an additional condition after 'if'?",
              options: ["elif", "else if", "elseif", "or"],
              correctAnswer: "elif",
              explanation: "Python uses 'elif', not 'else if' or 'elseif'.",
            },
            {
              type: "TRUE_FALSE",
              prompt: "An 'else' block runs only when no earlier condition was True.",
              options: ["True", "False"],
              correctAnswer: "True",
              explanation: "'else' is the fallback when every 'if'/'elif' condition failed.",
            },
            {
              type: "MULTIPLE_CHOICE",
              prompt: "What does 5 == 5 evaluate to?",
              options: ["True", "False", "5", "Error"],
              correctAnswer: "True",
              explanation: "== checks equality and returns a boolean.",
            },
          ],
        },
      ],
    },
    {
      key: "loops",
      title: "Loops",
      description: "Repeat actions with for and while loops.",
      icon: "star",
      tier: 1,
      col: 1,
      xpReward: 25,
      prerequisites: ["variables-types", "print-input"],
      milestoneTitle: "Control Flow",
      lessons: [
        {
          title: "For and While",
          xpReward: 20,
          questions: [
            {
              type: "MULTIPLE_CHOICE",
              prompt: "How many times does 'for i in range(5):' loop?",
              options: ["5", "4", "6", "infinite"],
              correctAnswer: "5",
              explanation: "range(5) produces 0,1,2,3,4 — five values.",
            },
            {
              type: "MULTIPLE_CHOICE",
              prompt: "Which loop repeats while a condition stays True?",
              options: ["while", "for", "repeat", "loop"],
              correctAnswer: "while",
              explanation: "'while' loops continue as long as their condition is True.",
            },
            {
              type: "TRUE_FALSE",
              prompt: "A while loop can run forever if its condition never becomes False.",
              options: ["True", "False"],
              correctAnswer: "True",
              explanation: "That's an infinite loop — always make sure the condition can become False.",
            },
          ],
        },
      ],
    },
    {
      key: "functions",
      title: "Functions",
      description: "Package reusable logic with def.",
      icon: "badge",
      tier: 2,
      col: 0,
      xpReward: 30,
      prerequisites: ["conditionals", "loops"],
      milestoneTitle: "Functions & Data",
      lessons: [
        {
          title: "Defining Functions",
          xpReward: 25,
          questions: [
            {
              type: "MULTIPLE_CHOICE",
              prompt: "Which keyword defines a function in Python?",
              options: ["def", "func", "function", "define"],
              correctAnswer: "def",
              explanation: "Functions start with 'def name():'.",
            },
            {
              type: "MULTIPLE_CHOICE",
              prompt: "What does 'return' do inside a function?",
              options: [
                "Sends a value back to the caller",
                "Prints a value",
                "Ends the program",
                "Loops the function again",
              ],
              correctAnswer: "Sends a value back to the caller",
              explanation: "'return' hands a value back to wherever the function was called.",
            },
          ],
        },
      ],
    },
    {
      key: "lists",
      title: "Lists",
      description: "Store and work with ordered collections.",
      icon: "badge",
      tier: 2,
      col: 1,
      xpReward: 30,
      prerequisites: ["loops"],
      milestoneTitle: "Functions & Data",
      lessons: [
        {
          title: "Working with Lists",
          xpReward: 25,
          questions: [
            {
              type: "MULTIPLE_CHOICE",
              prompt: "What is the index of the first item in a Python list?",
              options: ["0", "1", "-1", "first"],
              correctAnswer: "0",
              explanation: "Python lists are zero-indexed.",
            },
            {
              type: "MULTIPLE_CHOICE",
              prompt: "Which method adds an item to the end of a list?",
              options: [".append()", ".add()", ".push()", ".insert()"],
              correctAnswer: ".append()",
              explanation: ".append() adds a single item to the end of the list.",
            },
          ],
        },
      ],
    },
  ],
};

const verbalPath: PathSeed = {
  slug: "verbal-reasoning",
  title: "Verbal Reasoning",
  description: "Sharpen the analogy, error-spotting, and reading skills the GAT verbal section tests.",
  icon: "lightbulb",
  order: 2,
  milestones: [{ title: "Verbal Foundations", description: "Analogies, contextual errors, and reading comprehension.", order: 0 }],
  skills: [
    {
      key: "analogies",
      title: "Analogies",
      description: "Spot the relationship between a pair of words and match it.",
      icon: "lightbulb",
      tier: 0,
      col: 0,
      xpReward: 20,
      prerequisites: [],
      milestoneTitle: "Verbal Foundations",
      lessons: [
        {
          title: "Word Relationships",
          xpReward: 15,
          questions: [
            {
              type: "MULTIPLE_CHOICE",
              prompt: "Bird is to Nest as Bee is to ___?",
              options: ["Hive", "Flower", "Honey", "Wing"],
              correctAnswer: "Hive",
              explanation: "A bird lives in a nest the way a bee lives in a hive — same relationship (animal → home).",
            },
            {
              type: "MULTIPLE_CHOICE",
              prompt: "Pen is to Write as Knife is to ___?",
              options: ["Cut", "Kitchen", "Sharp", "Metal"],
              correctAnswer: "Cut",
              explanation: "A pen's function is to write; a knife's function is to cut — tool → function.",
            },
          ],
        },
      ],
    },
    {
      key: "contextual-errors",
      title: "Contextual Errors",
      description: "Find the word that doesn't fit the meaning of the sentence.",
      icon: "star",
      tier: 0,
      col: 1,
      xpReward: 20,
      prerequisites: [],
      milestoneTitle: "Verbal Foundations",
      lessons: [
        {
          title: "Spot the Error",
          xpReward: 15,
          questions: [
            {
              type: "MULTIPLE_CHOICE",
              prompt: "Which word is used incorrectly? \"The freezing desert heat forced them to seek shade.\"",
              options: ["freezing", "desert", "shade", "forced"],
              correctAnswer: "freezing",
              explanation: "\"Freezing\" contradicts \"desert heat\" — the sentence needs a word like \"scorching\" instead.",
            },
            {
              type: "MULTIPLE_CHOICE",
              prompt: "Which word is used incorrectly? \"She whispered loudly so everyone could hear the secret.\"",
              options: ["whispered", "loudly", "secret", "hear"],
              correctAnswer: "whispered",
              explanation: "Whispering is quiet by definition, which contradicts \"loudly\" and \"so everyone could hear\".",
            },
          ],
        },
      ],
    },
    {
      key: "reading-comprehension",
      title: "Reading Comprehension",
      description: "Read a short passage and answer questions about it.",
      icon: "badge",
      tier: 0,
      col: 2,
      xpReward: 20,
      prerequisites: [],
      milestoneTitle: "Verbal Foundations",
      lessons: [
        {
          title: "Short Passages",
          xpReward: 15,
          questions: [
            {
              type: "MULTIPLE_CHOICE",
              prompt:
                "Passage: \"Coral reefs cover less than 1% of the ocean floor, yet they support roughly a quarter of all marine species.\" What is the main idea?",
              options: [
                "Coral reefs are small but ecologically vital",
                "Most of the ocean floor is covered in coral",
                "Marine species mostly live outside reefs",
                "Coral reefs are shrinking every year",
              ],
              correctAnswer: "Coral reefs are small but ecologically vital",
              explanation: "The passage contrasts reefs' tiny footprint with the huge share of species they support.",
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

interface DiagnosticQuestionSeed {
  domain: "QUANTITATIVE" | "VERBAL";
  subSkill:
    | "ARITHMETIC"
    | "ALGEBRA"
    | "GEOMETRY"
    | "ANALOGIES"
    | "CONTEXTUAL_ERRORS"
    | "READING_COMPREHENSION";
  difficulty: "EASY" | "MEDIUM" | "HARD";
  prompt: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

const diagnosticQuestions: DiagnosticQuestionSeed[] = [
  // Arithmetic
  {
    domain: "QUANTITATIVE", subSkill: "ARITHMETIC", difficulty: "EASY",
    prompt: "What is 12 + 15?", options: ["25", "27", "28", "30"], correctAnswer: "27",
    explanation: "12 + 15 = 27.",
  },
  {
    domain: "QUANTITATIVE", subSkill: "ARITHMETIC", difficulty: "MEDIUM",
    prompt: "What is 3/5 of 40?", options: ["16", "20", "24", "28"], correctAnswer: "24",
    explanation: "3/5 × 40 = 120/5 = 24.",
  },
  {
    domain: "QUANTITATIVE", subSkill: "ARITHMETIC", difficulty: "HARD",
    prompt: "A price of 80 is increased by 25% then decreased by 20%. What is the final price?", options: ["76", "80", "84", "90"], correctAnswer: "80",
    explanation: "80 × 1.25 = 100, then 100 × 0.8 = 80 — the two changes exactly cancel out.",
  },
  // Algebra
  {
    domain: "QUANTITATIVE", subSkill: "ALGEBRA", difficulty: "EASY",
    prompt: "Solve: x + 7 = 12", options: ["x = 3", "x = 5", "x = 7", "x = 19"], correctAnswer: "x = 5",
    explanation: "Subtract 7 from both sides: x = 12 - 7 = 5.",
  },
  {
    domain: "QUANTITATIVE", subSkill: "ALGEBRA", difficulty: "MEDIUM",
    prompt: "Solve: 4x - 3 = 13", options: ["x = 3", "x = 4", "x = 5", "x = 10"], correctAnswer: "x = 4",
    explanation: "Add 3: 4x = 16. Divide by 4: x = 4.",
  },
  {
    domain: "QUANTITATIVE", subSkill: "ALGEBRA", difficulty: "HARD",
    prompt: "If 2x + y = 10 and x - y = 2, what is x?", options: ["2", "3", "4", "6"], correctAnswer: "4",
    explanation: "Add the equations: 3x = 12, so x = 4.",
  },
  // Geometry
  {
    domain: "QUANTITATIVE", subSkill: "GEOMETRY", difficulty: "EASY",
    prompt: "How many sides does a hexagon have?", options: ["5", "6", "7", "8"], correctAnswer: "6",
    explanation: "\"Hexa-\" means six — a hexagon has 6 sides.",
  },
  {
    domain: "QUANTITATIVE", subSkill: "GEOMETRY", difficulty: "MEDIUM",
    prompt: "What is the area of a circle with radius 3? (use π ≈ 3)", options: ["9", "18", "27", "36"], correctAnswer: "27",
    explanation: "Area = πr² ≈ 3 × 3² = 3 × 9 = 27.",
  },
  {
    domain: "QUANTITATIVE", subSkill: "GEOMETRY", difficulty: "HARD",
    prompt: "A right triangle has legs 6 and 8. What is its hypotenuse?", options: ["9", "10", "12", "14"], correctAnswer: "10",
    explanation: "Pythagorean theorem: √(6² + 8²) = √(36 + 64) = √100 = 10.",
  },
  // Analogies
  {
    domain: "VERBAL", subSkill: "ANALOGIES", difficulty: "EASY",
    prompt: "Puppy is to Dog as Kitten is to ___?", options: ["Cat", "Kitten", "Paw", "Meow"], correctAnswer: "Cat",
    explanation: "A puppy grows into a dog the way a kitten grows into a cat — baby → adult.",
  },
  {
    domain: "VERBAL", subSkill: "ANALOGIES", difficulty: "MEDIUM",
    prompt: "Author is to Book as Composer is to ___?", options: ["Symphony", "Piano", "Concert", "Orchestra"], correctAnswer: "Symphony",
    explanation: "An author creates a book; a composer creates a symphony — creator → creation.",
  },
  {
    domain: "VERBAL", subSkill: "ANALOGIES", difficulty: "HARD",
    prompt: "Frugal is to Wasteful as Timid is to ___?", options: ["Bold", "Shy", "Quiet", "Careful"], correctAnswer: "Bold",
    explanation: "Frugal and wasteful are opposites; timid and bold are the matching pair of opposites.",
  },
  // Contextual errors
  {
    domain: "VERBAL", subSkill: "CONTEXTUAL_ERRORS", difficulty: "EASY",
    prompt: "Which word is used incorrectly? \"The sun set in the morning sky.\"", options: ["sun", "set", "morning", "sky"], correctAnswer: "set",
    explanation: "The sun \"rises\" in the morning; \"set\" contradicts \"morning\".",
  },
  {
    domain: "VERBAL", subSkill: "CONTEXTUAL_ERRORS", difficulty: "MEDIUM",
    prompt: "Which word is used incorrectly? \"He was so exhausted that he sprinted energetically to the finish line.\"", options: ["exhausted", "sprinted", "energetically", "finish"], correctAnswer: "energetically",
    explanation: "\"Energetically\" contradicts \"exhausted\" — someone exhausted would struggle, not sprint energetically.",
  },
  {
    domain: "VERBAL", subSkill: "CONTEXTUAL_ERRORS", difficulty: "HARD",
    prompt: "Which word is used incorrectly? \"The transparent fog made it impossible to see the road ahead.\"", options: ["transparent", "fog", "impossible", "road"], correctAnswer: "transparent",
    explanation: "\"Transparent\" (easy to see through) contradicts fog making it \"impossible to see\" — it should be \"thick\" or \"dense\".",
  },
  // Reading comprehension
  {
    domain: "VERBAL", subSkill: "READING_COMPREHENSION", difficulty: "EASY",
    prompt: "Passage: \"Bats are the only mammals capable of sustained flight.\" What does this passage state?", options: ["Bats can fly", "Bats are birds", "All mammals can fly", "Bats cannot fly far"], correctAnswer: "Bats can fly",
    explanation: "The passage directly states bats are capable of sustained flight.",
  },
  {
    domain: "VERBAL", subSkill: "READING_COMPREHENSION", difficulty: "MEDIUM",
    prompt:
      "Passage: \"Despite being the smallest planet, Mercury has the most extreme temperature swings in the solar system, since it has almost no atmosphere to trap heat.\" Why does Mercury have extreme temperature swings?",
    options: [
      "It has almost no atmosphere to trap heat",
      "It is the smallest planet",
      "It is the closest planet to Earth",
      "It has a very thick atmosphere",
    ],
    correctAnswer: "It has almost no atmosphere to trap heat",
    explanation: "The passage gives the lack of atmosphere as the reason temperatures swing so drastically.",
  },
  {
    domain: "VERBAL", subSkill: "READING_COMPREHENSION", difficulty: "HARD",
    prompt:
      "Passage: \"Critics initially dismissed the invention as impractical, yet within a decade it had reshaped how the entire industry operated.\" What can be inferred about the invention?",
    options: [
      "It proved far more significant than early critics expected",
      "It was never adopted by the industry",
      "Critics were correct that it was impractical",
      "It took over a century to gain acceptance",
    ],
    correctAnswer: "It proved far more significant than early critics expected",
    explanation: "The contrast (\"yet\") signals the invention's real impact outpaced the critics' dismissal.",
  },
];

async function seedDiagnosticQuestions() {
  await db.diagnosticQuestion.deleteMany();
  for (const q of diagnosticQuestions) {
    await db.diagnosticQuestion.create({
      data: {
        domain: q.domain,
        subSkill: q.subSkill,
        difficulty: q.difficulty,
        prompt: q.prompt,
        optionsJson: JSON.stringify(q.options),
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
      },
    });
  }
}

async function main() {
  await seedPath(mathPath);
  await seedPath(pythonPath);
  await seedPath(verbalPath);
  await seedDiagnosticQuestions();

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
