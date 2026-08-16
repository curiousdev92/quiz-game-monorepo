import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { LeaderboardModule } from "../leaderboard/leaderboard.module";
import { SmsModule } from "../sms/sms.module";
import { AdminLeaguesController, AdminDiscountCodesController } from "./admin-leagues.controller";
import { LeaguesController, PublicLeaguesController } from "./leagues.controller";
import { LeaguesService } from "./leagues.service";

@Module({
  imports: [AuthModule, LeaderboardModule, SmsModule],
  controllers: [PublicLeaguesController, LeaguesController, AdminLeaguesController, AdminDiscountCodesController],
  providers: [LeaguesService],
  exports: [LeaguesService],
})
export class LeaguesModule {}
