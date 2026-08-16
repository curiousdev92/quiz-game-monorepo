import { Injectable, Logger } from "@nestjs/common";
import { PrizeAwardStatus } from "@prisma/client";

import { isoWeekRange, previousIsoWeekKey } from "../common/iso-week";
import { PrismaService } from "../prisma/prisma.service";

export interface CloseResult {
  weekKey: string;
  awardsCreated: number;
}

/** ISO week key for the week that ended before `now` (default: last week). */
export function previousWeekKey(now: Date = new Date()): string {
  return previousIsoWeekKey(now);
}

/**
 * Closes an ISO week: awards weekly prizes (PrizeAward) from that week's overall ranking.
 * Idempotent — re-running upserts awards without duplication.
 * NOTE: leaderboards/leagues are daily now, but prizes stay WEEKLY.
 */
@Injectable()
export class WeeklyCloseService {
  private readonly logger = new Logger(WeeklyCloseService.name);

  constructor(private readonly prisma: PrismaService) {}

  async close(weekKey: string): Promise<CloseResult> {
    this.logger.log(`Closing week ${weekKey}…`);
    const awardsCreated = await this.awardPrizes(weekKey);
    this.logger.log(`Week ${weekKey} closed: ${awardsCreated} awards`);
    return { weekKey, awardsCreated };
  }

  /** Award weekly prizes to users whose rank (over that ISO week) falls in [rankFrom, rankTo]. */
  private async awardPrizes(weekKey: string): Promise<number> {
    const prizes = await this.prisma.prize.findMany({ where: { weekScope: true } });
    if (prizes.length === 0) return 0;

    // Rank by points earned within the ISO-week date window (scores are stamped with a daily key now).
    const { start, end } = isoWeekRange(weekKey);
    const ranking = await this.prisma.scoreEvent.groupBy({
      by: ["userId"],
      where: { user: { isAdmin: false }, createdAt: { gte: start, lt: end } },
      _sum: { points: true },
    });
    ranking.sort((a, b) => (b._sum.points ?? 0) - (a._sum.points ?? 0));

    let awards = 0;
    for (let i = 0; i < ranking.length; i++) {
      const rank = i + 1;
      const userId = ranking[i].userId;
      for (const prize of prizes) {
        if (rank >= prize.rankFrom && rank <= prize.rankTo) {
          await this.prisma.prizeAward.upsert({
            where: { userId_prizeId_weekKey: { userId, prizeId: prize.id, weekKey } },
            create: { userId, prizeId: prize.id, weekKey, status: PrizeAwardStatus.PENDING },
            update: {},
          });
          awards++;
        }
      }
    }
    return awards;
  }
}
