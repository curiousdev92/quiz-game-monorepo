import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { AdminLeaderboardController } from "./admin-leaderboard.controller";
import { LeaderboardController } from "./leaderboard.controller";
import { LeaderboardService } from "./leaderboard.service";

@Module({
  imports: [AuthModule], // JwtAuthGuard for the /me and admin routes
  controllers: [LeaderboardController, AdminLeaderboardController],
  providers: [LeaderboardService],
  exports: [LeaderboardService], // GameService bumps the cache on each award
})
export class LeaderboardModule {}
