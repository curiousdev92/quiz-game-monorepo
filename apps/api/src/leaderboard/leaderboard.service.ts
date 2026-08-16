import { Inject, Injectable, Logger } from "@nestjs/common";
import Redis from "ioredis";

import { getWeekKey, getPeriodKey } from "../common/week-key";
import { PrismaService } from "../prisma/prisma.service";
import { REDIS_CLIENT } from "../redis/redis.module";

export type LeaderboardScope = "overall" | "weekly";

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  score: number;
}

const OVERALL_KEY = "lb:overall";
const weekKeyRedis = (weekKey: string): string => `lb:week:${weekKey}`;
// Display names are read on every board render but change rarely — cache per user.
const nameKey = (userId: string): string => `lb:name:${userId}`;
const NAME_TTL_SECONDS = 600;

/**
 * Leaderboard cache in Redis sorted sets. The ScoreEvent ledger is the source of
 * truth; these ZSETs are a rebuildable projection (see rebuild()).
 *   lb:overall        ZSET userId -> total points
 *   lb:week:<weekKey> ZSET userId -> points that ISO week
 */
@Injectable()
export class LeaderboardService {
  private readonly logger = new Logger(LeaderboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  private key(scope: LeaderboardScope, weekKey: string): string {
    return scope === "overall" ? OVERALL_KEY : weekKeyRedis(weekKey);
  }

  /** Best-effort cache bump when points are awarded. Ledger stays authoritative if this fails. */
  async addPoints(userId: string, points: number, weekKey: string): Promise<void> {
    if (points === 0) return;
    try {
      await this.redis
        .multi()
        .zincrby(OVERALL_KEY, points, userId)
        .zincrby(weekKeyRedis(weekKey), points, userId)
        .exec();
    } catch (err) {
      this.logger.error(`Leaderboard cache update failed (rebuild will reconcile): ${String(err)}`);
    }
  }

  /** Top N with ranks, hydrated with a display name. weekKey defaults to the current week. */
  async top(
    scope: LeaderboardScope,
    weekKey: string | undefined,
    limit: number,
    offset: number,
  ): Promise<LeaderboardEntry[]> {
    const wk = weekKey ?? getWeekKey();
    const key = this.key(scope, wk);
    const raw = await this.redis.zrevrange(key, offset, offset + limit - 1, "WITHSCORES");
    if (raw.length === 0) return [];

    const ids: string[] = [];
    const scores: number[] = [];
    for (let i = 0; i < raw.length; i += 2) {
      ids.push(raw[i]);
      scores.push(Number(raw[i + 1]));
    }
    const names = await this.displayNames(ids);
    return ids.map((userId, i) => ({
      rank: offset + i + 1,
      userId,
      name: names.get(userId) ?? "Player",
      score: scores[i],
    }));
  }

  /** A single user's rank (1-based) and score, or null rank if they're not on the board. */
  async rankFor(
    userId: string,
    scope: LeaderboardScope,
    weekKey: string | undefined,
  ): Promise<{ rank: number | null; score: number }> {
    const wk = weekKey ?? getWeekKey();
    const key = this.key(scope, wk);
    const [rank, score] = await Promise.all([this.redis.zrevrank(key, userId), this.redis.zscore(key, userId)]);
    return { rank: rank === null ? null : rank + 1, score: score ? Number(score) : 0 };
  }

  /** A user's total points grouped by ScoreReason (source of truth = ledger). */
  async scoreBreakdown(
    userId: string,
  ): Promise<{ total: number; byReason: Array<{ reason: string; points: number }> }> {
    const rows = await this.prisma.scoreEvent.groupBy({
      by: ["reason"],
      where: { userId },
      _sum: { points: true },
    });
    const byReason = rows
      .map((r) => ({ reason: r.reason as string, points: r._sum.points ?? 0 }))
      .filter((r) => r.points !== 0)
      .sort((a, b) => b.points - a.points);
    const total = byReason.reduce((sum, r) => sum + r.points, 0);
    return { total, byReason };
  }

  /** Distinct leaderboard periods (days) that have scores, most recent first. */
  async listPeriods(): Promise<Array<{ periodKey: string; current: boolean }>> {
    const rows = await this.prisma.scoreEvent.groupBy({
      by: ["weekKey"],
      where: { user: { isAdmin: false } },
      _count: { _all: true },
    });
    const today = getPeriodKey();
    return rows
      .map((r) => r.weekKey)
      .sort((a, b) => (a < b ? 1 : -1)) // desc (YYYY-MM-DD sorts lexicographically)
      .map((periodKey) => ({ periodKey, current: periodKey === today }));
  }

  /** Rebuild every ZSET from the ScoreEvent ledger. Idempotent; safe to run anytime. */
  async rebuild(): Promise<{ overallUsers: number; weeks: number }> {
    // Admins are excluded from all competition — never project them into the cache.
    const [overall, weekly, existingWeekKeys] = await Promise.all([
      this.prisma.scoreEvent.groupBy({ by: ["userId"], where: { user: { isAdmin: false } }, _sum: { points: true } }),
      this.prisma.scoreEvent.groupBy({
        by: ["userId", "weekKey"],
        where: { user: { isAdmin: false } },
        _sum: { points: true },
      }),
      this.redis.keys("lb:week:*"),
    ]);

    const pipe = this.redis.multi();
    pipe.del(OVERALL_KEY);
    if (existingWeekKeys.length > 0) pipe.del(...existingWeekKeys);

    for (const row of overall) {
      const pts = row._sum.points ?? 0;
      if (pts !== 0) pipe.zadd(OVERALL_KEY, pts, row.userId);
    }
    const weeks = new Set<string>();
    for (const row of weekly) {
      const pts = row._sum.points ?? 0;
      weeks.add(row.weekKey);
      if (pts !== 0) pipe.zadd(weekKeyRedis(row.weekKey), pts, row.userId);
    }
    await pipe.exec();
    return { overallUsers: overall.length, weeks: weeks.size };
  }

  /**
   * Map userIds → display name (displayName or masked phone), cached in Redis so a public
   * board render doesn't hit Postgres for names every time. Cache misses fall back to a DB
   * read and backfill. Shared by the leagues standings path too. Names change rarely, so a
   * 10-minute TTL is a fine staleness bound.
   */
  async displayNames(ids: string[]): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    if (ids.length === 0) return result;

    let cached: (string | null)[];
    try {
      cached = await this.redis.mget(ids.map(nameKey));
    } catch {
      cached = ids.map(() => null);
    }

    const missing: string[] = [];
    ids.forEach((id, i) => {
      const hit = cached[i];
      if (hit != null) result.set(id, hit);
      else missing.push(id);
    });

    if (missing.length > 0) {
      const users = await this.prisma.user.findMany({
        where: { id: { in: missing } },
        select: { id: true, displayName: true, phone: true },
      });
      const pipe = this.redis.multi();
      for (const u of users) {
        const name = u.displayName ?? maskPhone(u.phone);
        result.set(u.id, name);
        pipe.set(nameKey(u.id), name, "EX", NAME_TTL_SECONDS);
      }
      try {
        await pipe.exec();
      } catch {
        // Best-effort cache; names are already in `result`.
      }
    }
    return result;
  }
}

/** 09123456789 -> 0912***89 (don't expose full numbers on a public board). */
function maskPhone(phone: string): string {
  if (phone.length <= 6) return phone;
  return `${phone.slice(0, 4)}***${phone.slice(-2)}`;
}
