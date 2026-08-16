/**
 * Fixed rank→reward table applied to EVERY regular (non-overall) league when it freezes.
 * The overall/campaign league instead awards only the PS5 to rank 1 (see OVERALL_GRAND_PRIZE).
 */
export interface RewardTier {
  rankFrom: number;
  rankTo: number;
  basePoints: number; // always credited on collect
  physicalPrize?: string; // e.g. "Tablet"
  optional?: { points: number; discountPercent: number }; // player picks points OR a discount code
}

export const LEAGUE_REWARD_TIERS: RewardTier[] = [
  { rankFrom: 1, rankTo: 1, basePoints: 5000, physicalPrize: "Tablet" },
  { rankFrom: 2, rankTo: 2, basePoints: 2500, physicalPrize: "Tablet" },
  { rankFrom: 3, rankTo: 3, basePoints: 2000, physicalPrize: "Tablet" },
  { rankFrom: 4, rankTo: 4, basePoints: 1500, physicalPrize: "Tablet" },
  { rankFrom: 5, rankTo: 5, basePoints: 1000, physicalPrize: "Tablet" },
  { rankFrom: 6, rankTo: 20, basePoints: 1000 },
  { rankFrom: 21, rankTo: 50, basePoints: 500 },
  { rankFrom: 51, rankTo: 200, basePoints: 250, optional: { points: 200, discountPercent: 50 } },
  { rankFrom: 201, rankTo: 500, basePoints: 100, optional: { points: 100, discountPercent: 25 } },
  { rankFrom: 501, rankTo: 1000, basePoints: 0, optional: { points: 100, discountPercent: 10 } },
];

export function tierForRank(rank: number): RewardTier | null {
  return LEAGUE_REWARD_TIERS.find((t) => rank >= t.rankFrom && rank <= t.rankTo) ?? null;
}

/** The overall/campaign league's sole reward: PS5 to rank 1. */
export const OVERALL_GRAND_PRIZE = "PlayStation 5";
