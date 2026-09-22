/*
  Warnings:

  - You are about to drop the column `heartsFullAt` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `lastHeartLostAt` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `xpIntoLevel` on the `Profile` table. All the data in the column will be lost.

*/
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
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Profile" ("bestStreak", "currentStreak", "hearts", "heartsMax", "id", "lastActiveDate", "level", "totalXp", "updatedAt", "userId") SELECT "bestStreak", "currentStreak", "hearts", "heartsMax", "id", "lastActiveDate", "level", "totalXp", "updatedAt", "userId" FROM "Profile";
DROP TABLE "Profile";
ALTER TABLE "new_Profile" RENAME TO "Profile";
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");
CREATE TABLE "new_QuizAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "isPractice" BOOLEAN NOT NULL DEFAULT false,
    "scorePct" INTEGER NOT NULL DEFAULT 0,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "heartsLost" INTEGER NOT NULL DEFAULT 0,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "QuizAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QuizAttempt_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_QuizAttempt" ("completedAt", "heartsLost", "id", "lessonId", "scorePct", "startedAt", "userId", "xpEarned") SELECT "completedAt", "heartsLost", "id", "lessonId", "scorePct", "startedAt", "userId", "xpEarned" FROM "QuizAttempt";
DROP TABLE "QuizAttempt";
ALTER TABLE "new_QuizAttempt" RENAME TO "QuizAttempt";
CREATE INDEX "QuizAttempt_userId_idx" ON "QuizAttempt"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
