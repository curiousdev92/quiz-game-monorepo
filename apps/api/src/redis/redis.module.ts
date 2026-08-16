import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

import { buildRedisOptions } from "./redis.config";

export const REDIS_CLIENT = "REDIS_CLIENT";

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Redis =>
        new Redis({
          ...buildRedisOptions(config),
          maxRetriesPerRequest: null,
        }),
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
