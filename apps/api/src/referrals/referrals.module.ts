import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { GameConfigService } from "../game/game-config.service";
import { LeaderboardModule } from "../leaderboard/leaderboard.module";
import { ReferralsController } from "./referrals.controller";
import { ReferralsService } from "./referrals.service";

@Module({
  imports: [AuthModule, LeaderboardModule],
  controllers: [ReferralsController],
  providers: [ReferralsService, GameConfigService],
  exports: [ReferralsService],
})
export class ReferralsModule {}
