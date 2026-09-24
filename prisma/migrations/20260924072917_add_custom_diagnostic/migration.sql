-- CreateTable
CREATE TABLE "CustomDiagnosticAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "sourceFileName" TEXT NOT NULL,
    "sourceMimeType" TEXT NOT NULL,
    "documentTitle" TEXT NOT NULL,
    "topicsJson" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "reportJson" TEXT,
    CONSTRAINT "CustomDiagnosticAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustomDiagnosticResponse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "attemptId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "topic" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "optionsJson" TEXT NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "userAnswer" TEXT,
    "isCorrect" BOOLEAN,
    "timeTakenSec" INTEGER,
    "answeredAt" DATETIME,
    CONSTRAINT "CustomDiagnosticResponse_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "CustomDiagnosticAttempt" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CustomDiagnosticAttempt_userId_idx" ON "CustomDiagnosticAttempt"("userId");

-- CreateIndex
CREATE INDEX "CustomDiagnosticResponse_attemptId_idx" ON "CustomDiagnosticResponse"("attemptId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomDiagnosticResponse_attemptId_order_key" ON "CustomDiagnosticResponse"("attemptId", "order");
