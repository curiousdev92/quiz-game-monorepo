import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Quest, QuestType, QuestVerify, ScoreReason } from "@prisma/client";
import Redis from "ioredis";

import { getWeekKey } from "../common/week-key";
import { LeaderboardService } from "../leaderboard/leaderboard.service";
import { LeaguesService } from "../leagues/leagues.service";
import { PrismaService } from "../prisma/prisma.service";
import { REDIS_CLIENT } from "../redis/redis.module";

// How long we remember that a player opened a quest's link (drives the dwell timer). Generous, self-cleaning.
const OPEN_TTL_SECONDS = 7 * 24 * 60 * 60;
const openKey = (userId: string, questId: string): string => `quest:open:${userId}:${questId}`;
import { CreateQuestDto } from "./dto/create-quest.dto";
import { UpdateQuestDto } from "./dto/update-quest.dto";
import { GameServiceClient } from "./game-service.client";

export type QuestState = "LOCKED" | "COLLECTIBLE" | "COLLECTED" | "EXPIRED";

// Only real gameplay points count toward a CHALLENGE target (not other quests/referrals/adjustments).
const GAMEPLAY_REASONS: ScoreReason[] = [ScoreReason.CORRECT_ANSWER, ScoreReason.ROUND_BONUS];

export interface QuestView {
  id: string;
  title: string;
  icon: string;
  description: string | null;
  type: QuestType;
  rewardScore: number;
  rewardRounds: number;
  actionUrl: string | null;
  verify: QuestVerify;
  // When true, the action button grants external shop access (calls redeem) instead of plain collect.
  shopAccess: boolean;
  deadline: string | null;
  state: QuestState;
  // Unified progress toward unlocking (CHALLENGE points, or ACTION referral signups). null = no meter.
  progress: number | null;
  goal: number | null;
  progressUnit: string | null; // 'pts' | 'friends'
  // Honor-system dwell gate. minDwellSeconds is the configured wait; dwellRemaining is seconds still to wait
  // before Collect unlocks (equals minDwellSeconds until the player opens the link; null = no dwell required).
  minDwellSeconds: number;
  dwellRemaining: number | null;
}

interface Eligibility {
  state: QuestState;
  progress: number | null;
  goal: number | null;
  unit: string | null;
  dwellRemaining: number | null;
}

@Injectable()
export class QuestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leaderboard: LeaderboardService,
    private readonly leagues: LeaguesService,
    private readonly gameService: GameServiceClient,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  /** All active quests with this user's per-quest state + challenge progress. */
  async listForUser(userId: string): Promise<QuestView[]> {
    const now = new Date();
    const [quests, collections] = await Promise.all([
      this.prisma.quest.findMany({ where: { isActive: true }, orderBy: { createdAt: "asc" } }),
      this.prisma.questCollection.findMany({ where: { userId }, select: { questId: true } }),
    ]);
    const collected = new Set(collections.map((c) => c.questId));

    // Progress for all CHALLENGE quests in one pass would need per-quest windows; keep it simple & correct.
    const views: QuestView[] = [];
    for (const q of quests) {
      const e = await this.computeState(userId, q, collected.has(q.id), now);
      views.push({
        id: q.id,
        title: q.title,
        icon: q.icon,
        description: q.description,
        type: q.type,
        rewardScore: q.rewardScore,
        rewardRounds: q.rewardRounds,
        actionUrl: q.actionUrl,
        verify: q.verify,
        shopAccess: q.shopGameCode != null,
        deadline: q.deadline ? q.deadline.toISOString() : null,
        state: e.state,
        progress: e.progress,
        goal: e.goal,
        progressUnit: e.unit,
        minDwellSeconds: q.minDwellSeconds,
        dwellRemaining: e.dwellRemaining,
      });
    }
    return views;
  }

  /**
   * Record that the player opened an ACTION quest's link — starts the honor-system dwell timer.
   * First open wins (NX), so re-opening doesn't reset the countdown. Returns seconds still to wait.
   */
  async markOpened(userId: string, questId: string): Promise<{ collectibleInSeconds: number }> {
    const quest = await this.prisma.quest.findUnique({ where: { id: questId } });
    if (!quest || !quest.isActive) throw new NotFoundException("ماموریت پیدا نشد");
    if (quest.minDwellSeconds <= 0) return { collectibleInSeconds: 0 };

    const key = openKey(userId, questId);
    const nowIso = new Date().toISOString();
    // SET key NOW only if absent, keep the existing first-open time otherwise.
    await this.redis.set(key, nowIso, "EX", OPEN_TTL_SECONDS, "NX");
    const openedAt = (await this.redis.get(key)) ?? nowIso;
    return { collectibleInSeconds: this.dwellRemaining(quest, openedAt, new Date()) };
  }

  /** Seconds still to wait for a dwell-gated quest given its recorded open time (0 once satisfied). */
  private dwellRemaining(quest: Quest, openedAtIso: string | null, now: Date): number {
    if (quest.minDwellSeconds <= 0) return 0;
    if (!openedAtIso) return quest.minDwellSeconds; // not opened yet
    const elapsed = (now.getTime() - new Date(openedAtIso).getTime()) / 1000;
    return Math.max(0, Math.ceil(quest.minDwellSeconds - elapsed));
  }

  /** Collect a quest's reward. Validates eligibility, writes the ScoreEvent, bumps the leaderboard. */
  async collect(
    userId: string,
    questId: string,
  ): Promise<{ awardedScore: number; awardedRounds: number; state: QuestState }> {
    const quest = await this.prisma.quest.findUnique({ where: { id: questId } });
    if (!quest || !quest.isActive) throw new NotFoundException("ماموریت پیدا نشد");

    const already = await this.prisma.questCollection.findUnique({
      where: { userId_questId: { userId, questId } },
    });
    if (already) throw new BadRequestException("این ماموریت قبلا دریافت شده است");

    const now = new Date();
    if (quest.deadline && now > quest.deadline) throw new BadRequestException("مهلت این ماموریت به پایان رسیده است");
    if (quest.startsAt > now) throw new BadRequestException("این ماموریت هنوز فعال نشده است");

    const eligibility = await this.computeState(userId, quest, false, now);
    if (eligibility.state !== "COLLECTIBLE") {
      if (eligibility.dwellRemaining && eligibility.dwellRemaining > 0) {
        throw new BadRequestException(`ابتدا ماموریت را باز کنید و ${eligibility.dwellRemaining} ثانیه صبر کنید`);
      }
      throw new BadRequestException("این ماموریت هنوز باز نشده است");
    }

    return this.awardQuest(userId, quest, now);
  }

  /**
   * Redeem a shop-access ACTION quest: grant the player (by phone) access to the
   * external game SKU, then award the reward once. One-time — guarded by the
   * QuestCollection unique constraint. The external grant runs first, so we never
   * award points for a call the platform rejected.
   */
  async redeemShopAccess(
    userId: string,
    questId: string,
  ): Promise<{ awardedScore: number; awardedRounds: number; state: QuestState }> {
    const quest = await this.prisma.quest.findUnique({ where: { id: questId } });
    if (!quest || !quest.isActive) throw new NotFoundException("ماموریت پیدا نشد");
    if (!quest.shopGameCode || !quest.shopSkuKind || !quest.shopSkuId) {
      throw new BadRequestException("این ماموریت از نوع دسترسی فروشگاه نیست");
    }

    const already = await this.prisma.questCollection.findUnique({
      where: { userId_questId: { userId, questId } },
    });
    if (already) throw new BadRequestException("این ماموریت قبلا دریافت شده است");

    const now = new Date();
    if (quest.deadline && now > quest.deadline) throw new BadRequestException("مهلت این ماموریت به پایان رسیده است");
    if (quest.startsAt > now) throw new BadRequestException("این ماموریت هنوز فعال نشده است");

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { phone: true } });
    await this.gameService.grantShopAccess({
      gameCode: quest.shopGameCode,
      skuKind: quest.shopSkuKind,
      skuId: quest.shopSkuId,
      phone: user.phone,
    });

    return this.awardQuest(userId, quest, now);
  }

  /** Write the collection + reward ScoreEvent, bump the leaderboard, grant any rounds. */
  private async awardQuest(
    userId: string,
    quest: Quest,
    now: Date,
  ): Promise<{ awardedScore: number; awardedRounds: number; state: QuestState }> {
    const weekKey = getWeekKey();
    await this.prisma.$transaction(async (tx) => {
      await tx.questCollection.create({
        data: { userId, questId: quest.id, awardedScore: quest.rewardScore },
      });
      if (quest.rewardScore > 0) {
        await tx.scoreEvent.create({
          data: { userId, points: quest.rewardScore, reason: ScoreReason.QUEST_REWARD, weekKey },
        });
      }
    });

    // Reflect in the leaderboard cache (admins are excluded there anyway).
    if (quest.rewardScore > 0) {
      await this.leaderboard.addPoints(userId, quest.rewardScore, weekKey);
    }
    // Grant any extra playable rounds, attributed to the currently-active league.
    if (quest.rewardRounds > 0) {
      await this.leagues.grantRounds(userId, quest.rewardRounds, quest.id, now);
    }
    return { awardedScore: quest.rewardScore, awardedRounds: quest.rewardRounds, state: "COLLECTED" };
  }

  // --- Admin CRUD ---

  listAll(): Promise<Quest[]> {
    return this.prisma.quest.findMany({ orderBy: { createdAt: "desc" } });
  }

  create(dto: CreateQuestDto): Promise<Quest> {
    return this.prisma.quest.create({
      data: {
        title: dto.title,
        icon: dto.icon || undefined,
        description: dto.description,
        type: dto.type,
        rewardScore: dto.rewardScore,
        rewardRounds: dto.rewardRounds ?? 0,
        targetScore: dto.type === QuestType.CHALLENGE ? (dto.targetScore ?? 0) : null,
        actionUrl: dto.type === QuestType.ACTION ? (dto.actionUrl ?? null) : null,
        verify: dto.type === QuestType.ACTION ? (dto.verify ?? QuestVerify.NONE) : QuestVerify.NONE,
        verifyTarget:
          dto.type === QuestType.ACTION && dto.verify === QuestVerify.REFERRAL_SIGNUPS ? (dto.verifyTarget ?? 1) : null,
        // Dwell gate only makes sense for honor-system ACTION quests; force 0 otherwise.
        minDwellSeconds:
          dto.type === QuestType.ACTION && (dto.verify ?? QuestVerify.NONE) === QuestVerify.NONE
            ? (dto.minDwellSeconds ?? 0)
            : 0,
        // Shop-access fields (ACTION only): all three set together or none.
        shopGameCode: dto.type === QuestType.ACTION ? (dto.shopGameCode ?? null) : null,
        shopSkuKind: dto.type === QuestType.ACTION ? (dto.shopSkuKind ?? null) : null,
        shopSkuId: dto.type === QuestType.ACTION ? (dto.shopSkuId ?? null) : null,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateQuestDto): Promise<Quest> {
    await this.ensureExists(id);
    return this.prisma.quest.update({
      where: { id },
      data: {
        title: dto.title,
        icon: dto.icon,
        description: dto.description,
        type: dto.type,
        rewardScore: dto.rewardScore,
        rewardRounds: dto.rewardRounds,
        targetScore: dto.targetScore,
        actionUrl: dto.actionUrl,
        verify: dto.verify,
        verifyTarget: dto.verifyTarget,
        minDwellSeconds: dto.minDwellSeconds,
        shopGameCode: dto.shopGameCode,
        shopSkuKind: dto.shopSkuKind,
        shopSkuId: dto.shopSkuId,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
        isActive: dto.isActive,
      },
    });
  }

  /** Soft delete — deactivate so past collections keep their FK. */
  async deactivate(id: string): Promise<Quest> {
    await this.ensureExists(id);
    return this.prisma.quest.update({ where: { id }, data: { isActive: false } });
  }

  private async ensureExists(id: string): Promise<void> {
    const q = await this.prisma.quest.findUnique({ where: { id }, select: { id: true } });
    if (!q) throw new NotFoundException("ماموریت پیدا نشد");
  }

  private async computeState(userId: string, quest: Quest, isCollected: boolean, now: Date): Promise<Eligibility> {
    if (isCollected) return { state: "COLLECTED", progress: null, goal: null, unit: null, dwellRemaining: null };
    if (quest.deadline && now > quest.deadline)
      return { state: "EXPIRED", progress: null, goal: null, unit: null, dwellRemaining: null };

    const notStarted = quest.startsAt > now;

    if (quest.type === QuestType.CHALLENGE) {
      const goal = quest.targetScore ?? 0;
      const progress = notStarted ? 0 : await this.challengeProgress(userId, quest, now);
      return {
        state: progress >= goal && !notStarted ? "COLLECTIBLE" : "LOCKED",
        progress,
        goal,
        unit: "pts",
        dwellRemaining: null,
      };
    }

    // ACTION
    if (notStarted) return { state: "LOCKED", progress: null, goal: null, unit: null, dwellRemaining: null };
    if (quest.verify === QuestVerify.REFERRAL_SIGNUPS) {
      const goal = quest.verifyTarget ?? 1;
      const progress = await this.referralSignups(userId);
      return {
        state: progress >= goal ? "COLLECTIBLE" : "LOCKED",
        progress,
        goal,
        unit: "friends",
        dwellRemaining: null,
      };
    }

    // verify === NONE → honor-system, optionally gated by a dwell timer after opening the link.
    if (quest.minDwellSeconds > 0) {
      const openedAt = await this.redis.get(openKey(userId, quest.id));
      const remaining = this.dwellRemaining(quest, openedAt, now);
      return {
        state: remaining === 0 ? "COLLECTIBLE" : "LOCKED",
        progress: null,
        goal: null,
        unit: null,
        dwellRemaining: remaining,
      };
    }
    return { state: "COLLECTIBLE", progress: null, goal: null, unit: null, dwellRemaining: null };
  }

  /** Number of invited users who actually signed in (referredById set) — i.e. real signups. */
  private referralSignups(userId: string): Promise<number> {
    return this.prisma.user.count({ where: { referredById: userId } });
  }

  /** Gameplay points the user earned inside the quest's active window [startsAt, min(now, deadline)]. */
  private async challengeProgress(userId: string, quest: Quest, now: Date): Promise<number> {
    const upper = quest.deadline && quest.deadline < now ? quest.deadline : now;
    const agg = await this.prisma.scoreEvent.aggregate({
      where: {
        userId,
        reason: { in: GAMEPLAY_REASONS },
        createdAt: { gte: quest.startsAt, lte: upper },
      },
      _sum: { points: true },
    });
    return agg._sum.points ?? 0;
  }
}
