import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { LeaderboardModule } from "../leaderboard/leaderboard.module";
import { LeaguesModule } from "../leagues/leagues.module";
import { AdminQuestsController } from "./admin-quests.controller";
import { GameServiceClient } from "./game-service.client";
import { QuestsController } from "./quests.controller";
import { QuestsService } from "./quests.service";

@Module({
  imports: [AuthModule, LeaderboardModule, LeaguesModule],
  controllers: [QuestsController, AdminQuestsController],
  providers: [QuestsService, GameServiceClient],
})
export class QuestsModule {}
