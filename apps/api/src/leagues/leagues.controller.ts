import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from "@nestjs/common";

import { JwtPayload } from "../auth/auth.service";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CollectRewardDto } from "./dto/league.dto";
import { LeaguesService } from "./leagues.service";

/** Public league routes (no auth) — safe subset for the logged-out intro page. */
@Controller("leagues")
export class PublicLeaguesController {
  constructor(private readonly leagues: LeaguesService) {}

  /** The currently-live league's title + window (or null), for the intro-page countdown. */
  @Get("active")
  active() {
    return this.leagues.activePublic();
  }
}

@Controller("leagues")
@UseGuards(JwtAuthGuard)
export class LeaguesController {
  constructor(private readonly leagues: LeaguesService) {}

  /** Overall campaign + active + finished leagues (grouped by campaign), decorated with my rank/score. */
  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.leagues.listForPlayer(user.sub);
  }

  /** Ranked standings for a league window. */
  @Get(":id/standings")
  async standings(@Param("id") id: string, @Query("limit") limit?: string, @Query("offset") offset?: string) {
    const entries = await this.leagues.standings(id, limit ? Number(limit) : 50, offset ? Number(offset) : 0);
    return { leagueId: id, entries };
  }

  /** The caller's league rewards (collectible + collected). */
  @Get("rewards/me")
  myRewards(@CurrentUser() user: JwtPayload) {
    return this.leagues.myRewards(user.sub);
  }

  /** Collect a reward (with optional points-vs-discount choice). */
  @Post("rewards/:id/collect")
  @HttpCode(HttpStatus.OK)
  collect(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body() dto: CollectRewardDto) {
    return this.leagues.collectReward(user.sub, id, dto.choice);
  }
}
