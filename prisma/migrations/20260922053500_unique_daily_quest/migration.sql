-- CreateIndex
CREATE UNIQUE INDEX "DailyQuest_userId_templateId_date_key" ON "DailyQuest"("userId", "templateId", "date");
