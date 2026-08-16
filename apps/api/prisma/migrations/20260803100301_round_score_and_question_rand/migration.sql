-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "rand" DOUBLE PRECISION NOT NULL DEFAULT random();

-- AlterTable
ALTER TABLE "Round" ADD COLUMN     "score" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Question_isActive_difficulty_rand_idx" ON "Question"("isActive", "difficulty", "rand");
