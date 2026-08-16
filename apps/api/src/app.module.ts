import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AdminModule } from "./admin/admin.module";
import { AuthModule } from "./auth/auth.module";
import { GameModule } from "./game/game.module";
import { HealthController } from "./health/health.controller";
import { JobsModule } from "./jobs/jobs.module";
import { LeaderboardModule } from "./leaderboard/leaderboard.module";
import { LeaguesModule } from "./leagues/leagues.module";
import { PrismaModule } from "./prisma/prisma.module";
import { PrizesModule } from "./prizes/prizes.module";
import { QuestsModule } from "./quests/quests.module";
import { RedisModule } from "./redis/redis.module";
import { ReferralsModule } from "./referrals/referrals.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RedisModule,
    AuthModule,
    GameModule,
    LeaderboardModule,
    ReferralsModule,
    PrizesModule,
    AdminModule,
    JobsModule,
    QuestsModule,
    LeaguesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
