import { Injectable } from "@nestjs/common";
import { Prize } from "@prisma/client";

import { getWeekKey } from "../common/week-key";
import { LeaderboardService } from "../leaderboard/leaderboard.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PrizesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leaderboard: LeaderboardService,
  ) {}

  list(): Promise<Prize[]> {
    return this.prisma.prize.findMany({ orderBy: [{ weekScope: "desc" }, { rankFrom: "asc" }] });
  }

  /**
   * Preview which weekly prize(s) the caller would currently win at their live weekly rank.
   * Actual awarding happens in the Phase 5 weekly-close job.
   */
  async previewForUser(userId: string, weekKey = getWeekKey()) {
    const { rank, score } = await this.leaderboard.rankFor(userId, "weekly", weekKey);
    if (rank === null) {
      return { weekKey, rank: null, score, prizes: [] as Prize[] };
    }
    const prizes = await this.prisma.prize.findMany({
      where: { weekScope: true, rankFrom: { lte: rank }, rankTo: { gte: rank } },
      orderBy: { tier: "desc" },
    });
    return { weekKey, rank, score, prizes };
  }

  /** Prizes actually awarded to the caller (populated by the Phase 5 close job). */
  myAwards(userId: string) {
    return this.prisma.prizeAward.findMany({
      where: { userId },
      orderBy: { awardedAt: "desc" },
      include: { prize: true },
    });
  }
}
