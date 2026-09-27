-- AlterEnum
ALTER TYPE "BadgeCriteria" ADD VALUE 'WEAK_TOPIC_MASTERED';
ALTER TYPE "BadgeCriteria" ADD VALUE 'COMEBACK';

-- AlterTable
ALTER TABLE "Question" ADD COLUMN "difficulty" "DiagnosticDifficulty" NOT NULL DEFAULT 'MEDIUM';
ALTER TABLE "Question" ADD COLUMN "distractorRationaleJson" TEXT;
CREATE INDEX "Question_difficulty_idx" ON "Question"("difficulty");

-- AlterTable
ALTER TABLE "QuestionResponse" ADD COLUMN "misconceptionTag" TEXT;

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN "leaderboardAnonymous" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Skill" ADD COLUMN "diagnosedMastery" "MasteryLevel";

-- AlterTable
ALTER TABLE "DiagnosticQuestion" ADD COLUMN "distractorRationaleJson" TEXT;

-- AlterTable
ALTER TABLE "DiagnosticResponse" ADD COLUMN "misconceptionTag" TEXT;

-- AlterTable
ALTER TABLE "CustomDiagnosticResponse" ADD COLUMN "distractorRationaleJson" TEXT;
ALTER TABLE "CustomDiagnosticResponse" ADD COLUMN "misconceptionTag" TEXT;

-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN "flashcardsJson" TEXT;
ALTER TABLE "Lesson" ADD COLUMN "knowledgeGraphJson" TEXT;
