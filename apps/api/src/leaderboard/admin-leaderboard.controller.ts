import { Controller, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";

import { AdminGuard } from "../auth/admin.guard";
import { LeaderboardService } from "./leaderboard.service";

/** Rebuilds the Redis leaderboard cache from the ScoreEvent ledger. */
@Controller("admin/leaderboard")
@UseGuards(AdminGuard)
export class AdminLeaderboardController {
  constructor(private readonly leaderboard: LeaderboardService) {}

  @Post("rebuild")
  @HttpCode(HttpStatus.OK)
  rebuild() {
    return this.leaderboard.rebuild();
  }
}
