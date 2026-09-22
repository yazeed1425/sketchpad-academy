-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LearningPath" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'compass',
    "order" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT,
    "generatedByLlm" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "LearningPath_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_LearningPath" ("description", "icon", "id", "order", "slug", "title") SELECT "description", "icon", "id", "order", "slug", "title" FROM "LearningPath";
DROP TABLE "LearningPath";
ALTER TABLE "new_LearningPath" RENAME TO "LearningPath";
CREATE UNIQUE INDEX "LearningPath_slug_key" ON "LearningPath"("slug");
CREATE INDEX "LearningPath_userId_idx" ON "LearningPath"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
