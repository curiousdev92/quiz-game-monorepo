import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { League, LeagueRewardStatus, Prisma, ScoreReason } from "@prisma/client";
import Redis from "ioredis";

import { getPeriodKey } from "../common/week-key";
import { LeaderboardService } from "../leaderboard/leaderboard.service";
import { PrismaService } from "../prisma/prisma.service";
import { REDIS_CLIENT } from "../redis/redis.module";
import { SmsService } from "../sms/sms.service";
import { OVERALL_GRAND_PRIZE, tierForRank } from "./reward-tiers";

export interface StandingRow {
  rank: number;
  userId: string;
  name: string;
  score: number;
}

export type LeagueWithMe = League & { myRank: number | null; myScore: number };

export interface ImportDiscountCodeRow {
  code?: unknown;
  type?: unknown;
  percent?: unknown;
  title?: unknown;
}

@Injectable()
export class LeaguesService {
  private readonly logger = new Logger(LeaguesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly leaderboard: LeaderboardService,
    private readonly sms: SmsService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  // -------------------------------------------------------------------------
  // Reads
  // -------------------------------------------------------------------------

  /**
   * Player view: live overall campaign + currently-active regular leagues + finished
   * regular leagues grouped by the overall campaign they belong to (for the previous-
   * leagues accordion). Every league is decorated with the caller's own rank + score.
   */
  async listForPlayer(userId: string): Promise<{
    overall: LeagueWithMe | null;
    current: LeagueWithMe[];
    previousGroups: Array<{ parent: LeagueWithMe | null; leagues: LeagueWithMe[] }>;
  }> {
    await this.freezeDueLeagues();
    const now = new Date();
    const [overall, regulars, overallsAll] = await Promise.all([
      this.prisma.league.findFirst({ where: { isOverall: true }, orderBy: { createdAt: "desc" } }),
      this.prisma.league.findMany({ where: { isOverall: false }, orderBy: { startsAt: "desc" } }),
      this.prisma.league.findMany({ where: { isOverall: true }, orderBy: { startsAt: "desc" } }),
    ]);
    const current = regulars.filter((l) => l.startsAt <= now && l.endsAt > now);
    const previousRegulars = regulars.filter((l) => l.endsAt <= now);

    const byParent = new Map<string | null, League[]>();
    for (const l of previousRegulars) {
      const key = l.parentLeagueId;
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key)!.push(l);
    }

    const finishedOveralls = overallsAll.filter((o) => o.endsAt <= now);
    const groups: Array<{ parent: League | null; leagues: League[] }> = [];
    for (const parent of finishedOveralls) {
      groups.push({ parent, leagues: byParent.get(parent.id) ?? [] });
      byParent.delete(parent.id);
    }
    // Anything left (no parent, or a dangling/non-overall parent) — one "ungrouped" bucket.
    const ungrouped = [...byParent.values()].flat();
    if (ungrouped.length > 0) groups.push({ parent: null, leagues: ungrouped });

    const toDecorate = [overall, ...current, ...groups.flatMap((g) => [g.parent, ...g.leagues])].filter(
      (l): l is League => l != null,
    );
    const decorated = await this.decorateWithMe(toDecorate, userId);
    const byId = new Map(decorated.map((d) => [d.id, d]));

    return {
      overall: overall ? (byId.get(overall.id) ?? null) : null,
      current: current.map((l) => byId.get(l.id)!),
      previousGroups: groups.map((g) => ({
        parent: g.parent ? (byId.get(g.parent.id) ?? null) : null,
        leagues: g.leagues.map((l) => byId.get(l.id)!),
      })),
    };
  }

  private async decorateWithMe(leagues: League[], userId: string): Promise<LeagueWithMe[]> {
    return Promise.all(
      leagues.map(async (l) => {
        const { rank, score } = await this.myRankIn(l, userId);
        return { ...l, myRank: rank, myScore: score };
      }),
    );
  }

  private async myRankIn(league: League, userId: string): Promise<{ rank: number | null; score: number }> {
    const rows = await this.rankedRowsCached(league);
    const row = rows.find((r) => r.userId === userId);
    return row ? { rank: row.rank, score: row.score } : { rank: null, score: 0 };
  }

  // -------------------------------------------------------------------------
  // Per-league round budget (players get a limited number of rounds per league)
  // -------------------------------------------------------------------------

  /**
   * The league a round played *now* counts against: a regular league whose window
   * contains `now` (most recently started wins), else the overall campaign if live.
   */
  async getActiveLeague(now: Date = new Date()): Promise<League | null> {
    const regular = await this.prisma.league.findFirst({
      where: { isOverall: false, startsAt: { lte: now }, endsAt: { gt: now } },
      orderBy: { startsAt: "desc" },
    });
    if (regular) return regular;
    return this.prisma.league.findFirst({
      where: { isOverall: true, startsAt: { lte: now }, endsAt: { gt: now } },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Public, non-sensitive view of the currently-live league — for the intro-page
   * countdown shown to logged-out users. Returns only title + window, or null when
   * no league is live right now (UI hides the counter).
   */
  async activePublic(now: Date = new Date()): Promise<{ title: string; startsAt: Date; endsAt: Date } | null> {
    const league = await this.getActiveLeague(now);
    if (!league) return null;
    return { title: league.title, startsAt: league.startsAt, endsAt: league.endsAt };
  }

  /** How many rounds this user may still play in the currently-active league. */
  async roundBudget(
    userId: string,
    now: Date = new Date(),
  ): Promise<{ league: League | null; allowance: number; used: number; remaining: number }> {
    const league = await this.getActiveLeague(now);
    if (!league) return { league: null, allowance: 0, used: 0, remaining: 0 };

    const [used, grants] = await Promise.all([
      this.prisma.round.count({ where: { userId, leagueId: league.id } }),
      this.prisma.roundGrant.aggregate({ where: { userId, leagueId: league.id }, _sum: { amount: true } }),
    ]);
    const allowance = league.roundAllowance + (grants._sum.amount ?? 0);
    return { league, allowance, used, remaining: Math.max(0, allowance - used) };
  }

  /** Grant extra rounds to a user, attributed to the active league. Returns the grant (or null if no league). */
  async grantRounds(userId: string, amount: number, questId?: string, now: Date = new Date()) {
    if (amount <= 0) return null;
    const league = await this.getActiveLeague(now);
    if (!league) return null;
    return this.prisma.roundGrant.create({
      data: { userId, leagueId: league.id, amount, questId: questId ?? null },
    });
  }

  async standings(leagueId: string, limit: number, offset: number): Promise<StandingRow[]> {
    const league = await this.prisma.league.findUnique({ where: { id: leagueId } });
    if (!league) throw new NotFoundException("لیگ پیدا نشد");
    const rows = await this.rankedRowsCached(league);
    return rows.slice(offset, offset + limit);
  }

  /**
   * All players ranked for a league's window. Counts every ScoreEvent reason, including
   * LEAGUE_REWARD — a league's own rewards are only created once *it* freezes (a one-shot
   * snapshot after this runs), so including reward points here is never self-referential;
   * it's exactly how collectible points rolled forward from a previous league (or manually
   * collected) show up in whichever league is active right now.
   */
  private async rankedRows(league: League): Promise<StandingRow[]> {
    // An overall campaign counts everything within its own window PLUS everything within
    // each of its child leagues' windows — so scores still roll up even if a child's dates
    // don't sit entirely inside the campaign's own (e.g. the child was backfilled/misaligned).
    const windows = [{ gte: league.startsAt, lt: league.endsAt }];
    if (league.isOverall) {
      const children = await this.prisma.league.findMany({
        where: { parentLeagueId: league.id },
        select: { startsAt: true, endsAt: true },
      });
      windows.push(...children.map((c) => ({ gte: c.startsAt, lt: c.endsAt })));
    }

    const where: Prisma.ScoreEventWhereInput = {
      user: { isAdmin: false },
      OR: windows.map((w) => ({ createdAt: w })),
    };

    const sums = await this.prisma.scoreEvent.groupBy({ by: ["userId"], where, _sum: { points: true } });
    sums.sort((a, b) => (b._sum.points ?? 0) - (a._sum.points ?? 0));

    const names = await this.leaderboard.displayNames(sums.map((s) => s.userId));
    return sums.map((s, i) => ({
      rank: i + 1,
      userId: s.userId,
      name: names.get(s.userId) ?? "Player",
      score: s._sum.points ?? 0,
    }));
  }

  private standingsKey(leagueId: string): string {
    return `league:rows:${leagueId}`;
  }

  /**
   * Read-through cache of rankedRows(). GET /leagues aggregates ScoreEvent once *per league*
   * on every load — this collapses that to at most one groupBy per league per TTL. A closed
   * league's window is immutable, so its standings cache long; a live league's cache briefly.
   * Freeze uses the uncached rankedRows() so the reward snapshot is always authoritative.
   */
  private async rankedRowsCached(league: League): Promise<StandingRow[]> {
    const key = this.standingsKey(league.id);
    try {
      const hit = await this.redis.get(key);
      if (hit) return JSON.parse(hit) as StandingRow[];
    } catch {
      // Cache read failed — fall through to a fresh aggregate (correctness over cache).
    }
    const rows = await this.rankedRows(league);
    const closed = league.frozenAt != null || league.endsAt.getTime() <= Date.now();
    try {
      await this.redis.set(key, JSON.stringify(rows), "EX", closed ? 3600 : 30);
    } catch {
      // Best-effort cache; ignore write failures.
    }
    return rows;
  }

  // -------------------------------------------------------------------------
  // Freeze → generate per-player rewards
  // -------------------------------------------------------------------------

  /** Freeze any league whose window has ended and isn't frozen yet (lazy, called on reads). */
  async freezeDueLeagues(): Promise<void> {
    const due = await this.prisma.league.findMany({
      where: { frozenAt: null, endsAt: { lte: new Date() } },
      select: { id: true },
    });
    for (const l of due) await this.freeze(l.id);
  }

  /**
   * Freeze a league: lock ranks and create each player's LeagueReward. Idempotent.
   * Freezing always ends the league right now — even if triggered early, before its
   * scheduled `endsAt` — so it immediately moves out of "current" and into "previous".
   */
  async freeze(leagueId: string): Promise<{ frozen: boolean; rewardsCreated: number }> {
    const league = await this.prisma.league.findUnique({ where: { id: leagueId } });
    if (!league) throw new NotFoundException("لیگ پیدا نشد");
    if (league.frozenAt) return { frozen: true, rewardsCreated: 0 };

    const now = new Date();
    if (league.endsAt > now) {
      league.endsAt = now;
      await this.prisma.league.update({ where: { id: leagueId }, data: { endsAt: now } });
    }

    const rows = await this.rankedRows(league);
    let created = 0;

    for (const row of rows) {
      if (league.isOverall) {
        // Overall/campaign: only rank 1 gets the PS5.
        if (row.rank !== 1) break;
        await this.upsertReward(leagueId, row.userId, row.rank, {
          basePoints: 0,
          physicalPrize: OVERALL_GRAND_PRIZE,
        });
        created++;
      } else {
        const tier = tierForRank(row.rank);
        if (!tier) continue;
        await this.upsertReward(leagueId, row.userId, row.rank, {
          basePoints: tier.basePoints,
          physicalPrize: tier.physicalPrize ?? null,
          optionPoints: tier.optional?.points ?? null,
          optionDiscountPercent: tier.optional?.discountPercent ?? null,
        });
        created++;
      }
    }

    await this.prisma.league.update({ where: { id: leagueId }, data: { frozenAt: new Date() } });
    // Drop any live-window cache so the next read recomputes the final (now-immutable) standings.
    await this.redis.del(this.standingsKey(leagueId)).catch(() => undefined);
    this.logger.log(`Froze league ${league.title} — ${created} rewards`);
    return { frozen: true, rewardsCreated: created };
  }

  private upsertReward(
    leagueId: string,
    userId: string,
    rank: number,
    data: {
      basePoints: number;
      physicalPrize?: string | null;
      optionPoints?: number | null;
      optionDiscountPercent?: number | null;
    },
  ) {
    return this.prisma.leagueReward.upsert({
      where: { leagueId_userId: { leagueId, userId } },
      create: { leagueId, userId, rank, ...data },
      update: {}, // never overwrite an existing (already-frozen) reward
    });
  }

  // -------------------------------------------------------------------------
  // Player rewards
  // -------------------------------------------------------------------------

  async myRewards(userId: string) {
    await this.freezeDueLeagues();
    return this.prisma.leagueReward.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { league: { select: { title: true } } },
    });
  }

  /**
   * Auto-collect any pending reward from a *finished* league that has no points-vs-discount
   * choice to make (a plain `basePoints` payout) — called when a player starts a round, so
   * leftover collectible scores from previous leagues roll straight into whichever league is
   * active now, instead of sitting unclaimed. Rewards with an optional discount are left for
   * the player to collect manually (a silent pick would take away their choice + skip the SMS).
   */
  async autoCollectPendingRewards(userId: string): Promise<void> {
    await this.freezeDueLeagues();
    const pending = await this.prisma.leagueReward.findMany({
      where: { userId, status: LeagueRewardStatus.PENDING, optionPoints: null, optionDiscountPercent: null },
    });
    if (pending.length === 0) return;

    const weekKey = getPeriodKey();
    let total = 0;
    await this.prisma.$transaction(async (tx) => {
      for (const reward of pending) {
        await tx.leagueReward.update({
          where: { id: reward.id },
          data: { status: LeagueRewardStatus.COLLECTED, chosenOption: "POINTS", collectedAt: new Date() },
        });
        if (reward.basePoints > 0) {
          await tx.scoreEvent.create({
            data: { userId, points: reward.basePoints, reason: ScoreReason.LEAGUE_REWARD, weekKey },
          });
          total += reward.basePoints;
        }
      }
    });

    if (total > 0) await this.leaderboard.addPoints(userId, total, weekKey);
  }

  /** Collect a reward: apply the optional choice, credit points to the overall board, assign a code. */
  async collectReward(
    userId: string,
    rewardId: string,
    choice?: "POINTS" | "DISCOUNT",
  ): Promise<{ awardedPoints: number; physicalPrize: string | null; discountCode: string | null }> {
    const reward = await this.prisma.leagueReward.findUnique({ where: { id: rewardId } });
    if (!reward || reward.userId !== userId) throw new NotFoundException("پاداش پیدا نشد");
    if (reward.status === LeagueRewardStatus.COLLECTED) throw new BadRequestException("این پاداش قبلا دریافت شده است");

    const hasOption = reward.optionPoints != null || reward.optionDiscountPercent != null;
    let points = reward.basePoints;
    let discountCode: string | null = null;
    let chosen: string | null = null;

    const weekKey = getPeriodKey();
    await this.prisma.$transaction(async (tx) => {
      if (hasOption) {
        if (choice === "POINTS") {
          points += reward.optionPoints ?? 0;
          chosen = "POINTS";
        } else if (choice === "DISCOUNT") {
          discountCode = await this.assignCode(tx, reward.optionDiscountPercent!, userId);
          chosen = "DISCOUNT";
        } else {
          throw new BadRequestException("امتیاز یا کد تخفیف را انتخاب کنید");
        }
      }

      await tx.leagueReward.update({
        where: { id: rewardId },
        data: {
          status: LeagueRewardStatus.COLLECTED,
          chosenOption: chosen,
          discountCode,
          collectedAt: new Date(),
        },
      });
      if (points > 0) {
        await tx.scoreEvent.create({
          data: { userId, points, reason: ScoreReason.LEAGUE_REWARD, weekKey },
        });
      }
    });

    if (points > 0) await this.leaderboard.addPoints(userId, points, weekKey);

    if (discountCode) {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { phone: true } });
      if (user) {
        // Best-effort — the reward is already collected regardless of SMS delivery.
        this.sms
          .sendDiscountCode(user.phone, discountCode, reward.optionDiscountPercent!)
          .catch((err) => this.logger.error(`Discount-code SMS failed for ${user.phone}: ${String(err)}`));
      }
    }

    return { awardedPoints: points, physicalPrize: reward.physicalPrize, discountCode };
  }

  private async assignCode(tx: Prisma.TransactionClient, percent: number, userId: string): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = await tx.discountCode.findFirst({
        where: { percent, assignedToUserId: null },
        orderBy: { id: "asc" },
      });
      if (!candidate) throw new BadRequestException(`کد تخفیف ${percent}٪ باقی نمانده است؛ لطفا به مدیر اطلاع دهید`);
      const res = await tx.discountCode.updateMany({
        where: { id: candidate.id, assignedToUserId: null },
        data: { assignedToUserId: userId, assignedAt: new Date() },
      });
      if (res.count === 1) return candidate.code;
    }
    throw new BadRequestException("اختصاص کد تخفیف ممکن نشد، دوباره تلاش کنید");
  }

  // -------------------------------------------------------------------------
  // Admin
  // -------------------------------------------------------------------------

  listAll() {
    return this.prisma.league.findMany({ orderBy: [{ isOverall: "desc" }, { startsAt: "desc" }] });
  }

  async create(data: {
    title: string;
    startsAt: string;
    endsAt: string;
    isOverall?: boolean;
    roundAllowance?: number;
    parentLeagueId?: string;
  }) {
    const parentLeagueId = await this.resolveParent(data.isOverall ?? false, data.parentLeagueId);
    return this.prisma.league.create({
      data: {
        title: data.title,
        startsAt: new Date(data.startsAt),
        endsAt: new Date(data.endsAt),
        isOverall: data.isOverall ?? false,
        roundAllowance: data.roundAllowance ?? undefined,
        parentLeagueId,
      },
    });
  }

  async update(
    id: string,
    data: {
      title?: string;
      startsAt?: string;
      endsAt?: string;
      isOverall?: boolean;
      roundAllowance?: number;
      parentLeagueId?: string | null;
    },
  ) {
    const existing = await this.prisma.league.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("لیگ پیدا نشد");
    const isOverall = data.isOverall ?? existing.isOverall;
    const parentLeagueId =
      data.parentLeagueId === undefined
        ? undefined
        : data.parentLeagueId === null
          ? null
          : await this.resolveParent(isOverall, data.parentLeagueId);
    return this.prisma.league.update({
      where: { id },
      data: {
        title: data.title,
        startsAt: data.startsAt ? new Date(data.startsAt) : undefined,
        endsAt: data.endsAt ? new Date(data.endsAt) : undefined,
        isOverall: data.isOverall,
        roundAllowance: data.roundAllowance,
        parentLeagueId,
      },
    });
  }

  /** Overall leagues can't have a parent; a regular league's parent must itself be an overall league. */
  private async resolveParent(isOverall: boolean, parentLeagueId?: string): Promise<string | null> {
    if (isOverall || !parentLeagueId) return null;
    const parent = await this.prisma.league.findUnique({ where: { id: parentLeagueId } });
    if (!parent) throw new BadRequestException("لیگ والد پیدا نشد");
    if (!parent.isOverall) throw new BadRequestException("لیگ والد باید یک کمپین کلی باشد");
    return parentLeagueId;
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.league.delete({ where: { id } });
  }

  /** Rewards for a league (admin fulfillment view). */
  leagueRewards(leagueId: string) {
    return this.prisma.leagueReward.findMany({
      where: { leagueId },
      orderBy: { rank: "asc" },
      include: { user: { select: { phone: true, displayName: true } } },
    });
  }

  /**
   * Bulk-import discount codes from an Excel/CSV sheet (rows already normalized client-side).
   * Validates each row; inserts the valid ones (dedup on the unique `code`) and returns
   * per-row errors for the rest.
   */
  async importDiscountCodes(
    rows: ImportDiscountCodeRow[],
  ): Promise<{ created: number; failed: number; errors: Array<{ row: number; message: string }> }> {
    const errors: Array<{ row: number; message: string }> = [];
    const valid: Array<{ code: string; type: string; percent: number; title: string }> = [];
    const seenCodes = new Set<string>();

    rows.forEach((r, i) => {
      const rowNum = i + 1;
      const code = typeof r.code === "string" ? r.code.trim() : "";
      if (!code) return void errors.push({ row: rowNum, message: "کد خالی است" });
      if (seenCodes.has(code)) return void errors.push({ row: rowNum, message: `کد تکراری «${code}» در فایل` });

      const type = typeof r.type === "string" ? r.type.trim() : "";
      if (!type) return void errors.push({ row: rowNum, message: "نوع تخفیف خالی است" });

      const percent = Number(r.percent);
      if (!Number.isInteger(percent) || percent < 0 || percent > 100) {
        return void errors.push({ row: rowNum, message: "درصد تخفیف باید عددی بین ۰ تا ۱۰۰ باشد" });
      }

      const title = typeof r.title === "string" ? r.title.trim() : "";
      if (!title) return void errors.push({ row: rowNum, message: "عنوان تخفیف خالی است" });

      seenCodes.add(code);
      valid.push({ code, type, percent, title });
    });

    let created = 0;
    if (valid.length > 0) {
      const res = await this.prisma.discountCode.createMany({ data: valid, skipDuplicates: true });
      created = res.count;
    }
    return { created, failed: errors.length, errors };
  }

  async discountStats() {
    const rows = await this.prisma.discountCode.groupBy({
      by: ["type", "percent"],
      _count: { _all: true },
    });
    const used = await this.prisma.discountCode.groupBy({
      by: ["type", "percent"],
      where: { assignedToUserId: { not: null } },
      _count: { _all: true },
    });
    const usedMap = new Map(used.map((u) => [`${u.type}:${u.percent}`, u._count._all]));
    return rows
      .map((r) => ({
        type: r.type,
        percent: r.percent,
        total: r._count._all,
        used: usedMap.get(`${r.type}:${r.percent}`) ?? 0,
      }))
      .sort((a, b) => a.type.localeCompare(b.type) || a.percent - b.percent);
  }

  private async ensureExists(id: string): Promise<void> {
    const l = await this.prisma.league.findUnique({ where: { id }, select: { id: true } });
    if (!l) throw new NotFoundException("لیگ پیدا نشد");
  }
}
