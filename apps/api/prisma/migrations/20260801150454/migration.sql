-- CreateEnum
CREATE TYPE "RoundStatus" AS ENUM ('IN_PROGRESS', 'FINISHED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "ScoreReason" AS ENUM ('CORRECT_ANSWER', 'ROUND_BONUS', 'REFERRAL_CREDIT', 'ADMIN_ADJUSTMENT', 'QUEST_REWARD', 'LEAGUE_REWARD');

-- CreateEnum
CREATE TYPE "PrizeAwardStatus" AS ENUM ('PENDING', 'FULFILLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "QuestType" AS ENUM ('CHALLENGE', 'ACTION');

-- CreateEnum
CREATE TYPE "QuestVerify" AS ENUM ('NONE', 'REFERRAL_SIGNUPS');

-- CreateEnum
CREATE TYPE "LeagueRewardStatus" AS ENUM ('PENDING', 'COLLECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "displayName" TEXT,
    "age" INTEGER,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "referredById" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcquisitionSource" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "referralCode" TEXT,
    "landingPath" TEXT,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcquisitionSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameConfig" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "gameDurationSeconds" INTEGER NOT NULL DEFAULT 60,
    "roundBonus" INTEGER NOT NULL DEFAULT 0,
    "referralBonus" INTEGER NOT NULL DEFAULT 0,
    "difficultyMix" JSONB NOT NULL DEFAULT '[{"difficulty":1,"count":4},{"difficulty":2,"count":4},{"difficulty":3,"count":4}]',
    "pointsPerDifficulty" JSONB NOT NULL DEFAULT '[{"difficulty":1,"points":5},{"difficulty":2,"points":10},{"difficulty":3,"points":20}]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "choices" JSONB NOT NULL,
    "correctIndex" INTEGER NOT NULL,
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Round" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "RoundStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "leagueId" TEXT,

    CONSTRAINT "Round_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoundGrant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "questId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoundGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoundQuestion" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answeredIndex" INTEGER,
    "isCorrect" BOOLEAN,
    "answeredAt" TIMESTAMP(3),

    CONSTRAINT "RoundQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roundId" TEXT,
    "points" INTEGER NOT NULL,
    "reason" "ScoreReason" NOT NULL,
    "weekKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoreEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prize" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tier" INTEGER NOT NULL DEFAULT 1,
    "rankFrom" INTEGER NOT NULL,
    "rankTo" INTEGER NOT NULL,
    "weekScope" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Prize_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrizeAward" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "prizeId" TEXT NOT NULL,
    "weekKey" TEXT NOT NULL,
    "status" "PrizeAwardStatus" NOT NULL DEFAULT 'PENDING',
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrizeAward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "uses" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralAttribution" (
    "id" TEXT NOT NULL,
    "referralCode" TEXT NOT NULL,
    "newUserId" TEXT NOT NULL,
    "attributedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralAttribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quest" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '🎯',
    "description" TEXT,
    "type" "QuestType" NOT NULL DEFAULT 'ACTION',
    "rewardScore" INTEGER NOT NULL DEFAULT 0,
    "rewardRounds" INTEGER NOT NULL DEFAULT 0,
    "targetScore" INTEGER,
    "actionUrl" TEXT,
    "verify" "QuestVerify" NOT NULL DEFAULT 'NONE',
    "verifyTarget" INTEGER,
    "minDwellSeconds" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadline" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestCollection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "awardedScore" INTEGER NOT NULL,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "League" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "isOverall" BOOLEAN NOT NULL DEFAULT false,
    "frozenAt" TIMESTAMP(3),
    "roundAllowance" INTEGER NOT NULL DEFAULT 3,
    "parentLeagueId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "League_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeagueReward" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "basePoints" INTEGER NOT NULL DEFAULT 0,
    "physicalPrize" TEXT,
    "optionPoints" INTEGER,
    "optionDiscountPercent" INTEGER,
    "status" "LeagueRewardStatus" NOT NULL DEFAULT 'PENDING',
    "chosenOption" TEXT,
    "discountCode" TEXT,
    "collectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeagueReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscountCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "percent" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "assignedToUserId" TEXT,
    "assignedAt" TIMESTAMP(3),

    CONSTRAINT "DiscountCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_referredById_idx" ON "User"("referredById");

-- CreateIndex
CREATE UNIQUE INDEX "AcquisitionSource_userId_key" ON "AcquisitionSource"("userId");

-- CreateIndex
CREATE INDEX "Round_userId_idx" ON "Round"("userId");

-- CreateIndex
CREATE INDEX "Round_leagueId_idx" ON "Round"("leagueId");

-- CreateIndex
CREATE INDEX "RoundGrant_userId_leagueId_idx" ON "RoundGrant"("userId", "leagueId");

-- CreateIndex
CREATE INDEX "RoundQuestion_roundId_idx" ON "RoundQuestion"("roundId");

-- CreateIndex
CREATE INDEX "ScoreEvent_userId_idx" ON "ScoreEvent"("userId");

-- CreateIndex
CREATE INDEX "ScoreEvent_weekKey_idx" ON "ScoreEvent"("weekKey");

-- CreateIndex
CREATE INDEX "PrizeAward_weekKey_idx" ON "PrizeAward"("weekKey");

-- CreateIndex
CREATE UNIQUE INDEX "PrizeAward_userId_prizeId_weekKey_key" ON "PrizeAward"("userId", "prizeId", "weekKey");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_code_key" ON "Referral"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_ownerUserId_key" ON "Referral"("ownerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralAttribution_newUserId_key" ON "ReferralAttribution"("newUserId");

-- CreateIndex
CREATE INDEX "ReferralAttribution_referralCode_idx" ON "ReferralAttribution"("referralCode");

-- CreateIndex
CREATE INDEX "QuestCollection_userId_idx" ON "QuestCollection"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestCollection_userId_questId_key" ON "QuestCollection"("userId", "questId");

-- CreateIndex
CREATE INDEX "League_isOverall_idx" ON "League"("isOverall");

-- CreateIndex
CREATE INDEX "League_parentLeagueId_idx" ON "League"("parentLeagueId");

-- CreateIndex
CREATE INDEX "LeagueReward_userId_idx" ON "LeagueReward"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LeagueReward_leagueId_userId_key" ON "LeagueReward"("leagueId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "DiscountCode_code_key" ON "DiscountCode"("code");

-- CreateIndex
CREATE INDEX "DiscountCode_percent_assignedToUserId_idx" ON "DiscountCode"("percent", "assignedToUserId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcquisitionSource" ADD CONSTRAINT "AcquisitionSource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Round" ADD CONSTRAINT "Round_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Round" ADD CONSTRAINT "Round_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundGrant" ADD CONSTRAINT "RoundGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundGrant" ADD CONSTRAINT "RoundGrant_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundQuestion" ADD CONSTRAINT "RoundQuestion_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundQuestion" ADD CONSTRAINT "RoundQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreEvent" ADD CONSTRAINT "ScoreEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreEvent" ADD CONSTRAINT "ScoreEvent_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrizeAward" ADD CONSTRAINT "PrizeAward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrizeAward" ADD CONSTRAINT "PrizeAward_prizeId_fkey" FOREIGN KEY ("prizeId") REFERENCES "Prize"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralAttribution" ADD CONSTRAINT "ReferralAttribution_referralCode_fkey" FOREIGN KEY ("referralCode") REFERENCES "Referral"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralAttribution" ADD CONSTRAINT "ReferralAttribution_newUserId_fkey" FOREIGN KEY ("newUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestCollection" ADD CONSTRAINT "QuestCollection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestCollection" ADD CONSTRAINT "QuestCollection_questId_fkey" FOREIGN KEY ("questId") REFERENCES "Quest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "League" ADD CONSTRAINT "League_parentLeagueId_fkey" FOREIGN KEY ("parentLeagueId") REFERENCES "League"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueReward" ADD CONSTRAINT "LeagueReward_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueReward" ADD CONSTRAINT "LeagueReward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
