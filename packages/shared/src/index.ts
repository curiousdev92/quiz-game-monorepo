export { getWeekKey } from "./week-key";

// Shared enums mirrored from the Prisma schema (kept in sync manually for MVP).
export const ScoreReason = {
  CORRECT_ANSWER: "CORRECT_ANSWER",
  ROUND_BONUS: "ROUND_BONUS",
  REFERRAL_CREDIT: "REFERRAL_CREDIT",
  ADMIN_ADJUSTMENT: "ADMIN_ADJUSTMENT",
  QUEST_REWARD: "QUEST_REWARD",
  LEAGUE_REWARD: "LEAGUE_REWARD",
} as const;
export type ScoreReason = (typeof ScoreReason)[keyof typeof ScoreReason];

export const QuestType = {
  CHALLENGE: "CHALLENGE",
  ACTION: "ACTION",
} as const;
export type QuestType = (typeof QuestType)[keyof typeof QuestType];

export const QuestVerify = {
  NONE: "NONE",
  REFERRAL_SIGNUPS: "REFERRAL_SIGNUPS",
} as const;
export type QuestVerify = (typeof QuestVerify)[keyof typeof QuestVerify];

export const QuestState = {
  LOCKED: "LOCKED",
  COLLECTIBLE: "COLLECTIBLE",
  COLLECTED: "COLLECTED",
  EXPIRED: "EXPIRED",
} as const;
export type QuestState = (typeof QuestState)[keyof typeof QuestState];

export const RoundStatus = {
  IN_PROGRESS: "IN_PROGRESS",
  FINISHED: "FINISHED",
  ABANDONED: "ABANDONED",
} as const;
export type RoundStatus = (typeof RoundStatus)[keyof typeof RoundStatus];
