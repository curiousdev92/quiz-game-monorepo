import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { LeaderboardModule } from "../leaderboard/leaderboard.module";
import { PrizesController } from "./prizes.controller";
import { PrizesService } from "./prizes.service";

@Module({
  imports: [AuthModule, LeaderboardModule],
  controllers: [PrizesController],
  providers: [PrizesService],
})
export class PrizesModule {}
