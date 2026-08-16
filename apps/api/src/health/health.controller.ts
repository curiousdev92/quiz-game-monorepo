import { Controller, Get, Inject } from "@nestjs/common";
import Redis from "ioredis";

import { PrismaService } from "../prisma/prisma.service";
import { REDIS_CLIENT } from "../redis/redis.module";

@Controller("health")
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  @Get()
  async check(): Promise<{ status: string; db: boolean; redis: boolean }> {
    const [db, redis] = await Promise.all([
      this.prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
      this.redis
        .ping()
        .then((r) => r === "PONG")
        .catch(() => false),
    ]);
    return { status: db && redis ? "ok" : "degraded", db, redis };
  }
}
