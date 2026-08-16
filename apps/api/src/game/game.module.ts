import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { LeaderboardModule } from "../leaderboard/leaderboard.module";
import { LeaguesModule } from "../leagues/leagues.module";
import { ReferralsModule } from "../referrals/referrals.module";
import { AdminGameController } from "./admin-game.controller";
import { GameConfigService } from "./game-config.service";
import { GameController } from "./game.controller";
import { GameService } from "./game.service";

@Module({
  // JwtAuthGuard + leaderboard/referral side-effects on play; LeaguesModule for the per-league round cap
  imports: [AuthModule, LeaderboardModule, ReferralsModule, LeaguesModule],
  controllers: [GameController, AdminGameController],
  providers: [GameService, GameConfigService],
})
export class GameModule {}
