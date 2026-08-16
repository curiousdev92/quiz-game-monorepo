-- DropIndex
DROP INDEX "ScoreEvent_userId_idx";

-- CreateIndex
CREATE INDEX "ScoreEvent_userId_createdAt_idx" ON "ScoreEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ScoreEvent_createdAt_idx" ON "ScoreEvent"("createdAt");
