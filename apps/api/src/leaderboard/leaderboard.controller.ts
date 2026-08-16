import { Controller, Get, Query, UseGuards } from "@nestjs/common";

import { JwtPayload } from "../auth/auth.service";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { getWeekKey } from "../common/week-key";
import { LeaderboardQueryDto } from "./dto/leaderboard-query.dto";
import { LeaderboardService } from "./leaderboard.service";

@Controller("leaderboard")
export class LeaderboardController {
  constructor(private readonly leaderboard: LeaderboardService) {}

  /** List leaderboard periods (days) that have scores — for the "previous leagues" browser. */
  @Get("periods")
  periods() {
    return this.leaderboard.listPeriods();
  }

  /** Public ranked board. ?scope=overall|weekly&weekKey=&limit=&offset= */
  @Get()
  async list(@Query() q: LeaderboardQueryDto) {
    const entries = await this.leaderboard.top(q.scope, q.weekKey, q.limit, q.offset);
    return { scope: q.scope, weekKey: q.scope === "weekly" ? (q.weekKey ?? getWeekKey()) : null, entries };
  }

  /** The authenticated user's own rank + score. */
  @Get("me")
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: JwtPayload, @Query() q: LeaderboardQueryDto) {
    const { rank, score } = await this.leaderboard.rankFor(user.sub, q.scope, q.weekKey);
    return { scope: q.scope, weekKey: q.scope === "weekly" ? (q.weekKey ?? getWeekKey()) : null, rank, score };
  }

  /** The authenticated user's total points broken down by score category. */
  @Get("me/breakdown")
  @UseGuards(JwtAuthGuard)
  breakdown(@CurrentUser() user: JwtPayload) {
    return this.leaderboard.scoreBreakdown(user.sub);
  }
}
