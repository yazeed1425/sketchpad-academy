-- AlterTable
ALTER TABLE "QuestionResponse" ADD COLUMN "misconceptionTag" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Profile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "totalXp" INTEGER NOT NULL DEFAULT 0,
    "hearts" INTEGER NOT NULL DEFAULT 5,
    "heartsMax" INTEGER NOT NULL DEFAULT 5,
    "nextRegenAt" DATETIME,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "bestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastActiveDate" TEXT,
    "leaderboardAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Profile" ("bestStreak", "currentStreak", "hearts", "heartsMax", "id", "lastActiveDate", "level", "nextRegenAt", "totalXp", "updatedAt", "userId") SELECT "bestStreak", "currentStreak", "hearts", "heartsMax", "id", "lastActiveDate", "level", "nextRegenAt", "totalXp", "updatedAt", "userId" FROM "Profile";
DROP TABLE "Profile";
ALTER TABLE "new_Profile" RENAME TO "Profile";
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");
CREATE TABLE "new_Question" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lessonId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'MULTIPLE_CHOICE',
    "source" TEXT NOT NULL DEFAULT 'CURRICULUM',
    "difficulty" TEXT NOT NULL DEFAULT 'MEDIUM',
    "prompt" TEXT NOT NULL,
    "optionsJson" TEXT NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "distractorRationaleJson" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Question_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Question" ("correctAnswer", "explanation", "id", "lessonId", "optionsJson", "order", "prompt", "source", "type") SELECT "correctAnswer", "explanation", "id", "lessonId", "optionsJson", "order", "prompt", "source", "type" FROM "Question";
DROP TABLE "Question";
ALTER TABLE "new_Question" RENAME TO "Question";
CREATE INDEX "Question_difficulty_idx" ON "Question"("difficulty");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
