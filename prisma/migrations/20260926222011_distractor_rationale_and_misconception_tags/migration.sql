-- AlterTable
ALTER TABLE "CustomDiagnosticResponse" ADD COLUMN "distractorRationaleJson" TEXT;
ALTER TABLE "CustomDiagnosticResponse" ADD COLUMN "misconceptionTag" TEXT;

-- AlterTable
ALTER TABLE "DiagnosticQuestion" ADD COLUMN "distractorRationaleJson" TEXT;

-- AlterTable
ALTER TABLE "DiagnosticResponse" ADD COLUMN "misconceptionTag" TEXT;
