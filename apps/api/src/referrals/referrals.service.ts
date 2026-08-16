import { randomBytes } from "node:crypto";

import { Injectable, Logger } from "@nestjs/common";
import { RoundStatus, ScoreReason } from "@prisma/client";

import { getWeekKey } from "../common/week-key";
import { GameConfigService } from "../game/game-config.service";
import { LeaderboardService } from "../leaderboard/leaderboard.service";
import { PrismaService } from "../prisma/prisma.service";

export interface MyReferral {
  code: string;
  uses: number;
  signups: number;
}

export interface InvitedUser {
  id: string;
  name: string;
  joinedAt: string;
  hasPlayed: boolean;
}

@Injectable()
export class ReferralsService {
  private readonly logger = new Logger(ReferralsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: GameConfigService,
    private readonly leaderboard: LeaderboardService,
  ) {}

  /** Find-or-create the caller's referral code (one per user). */
  async myReferral(userId: string): Promise<MyReferral> {
    let referral = await this.prisma.referral.findUnique({ where: { ownerUserId: userId } });
    if (!referral) {
      referral = await this.createWithUniqueCode(userId);
    }
    const signups = await this.prisma.referralAttribution.count({ where: { referralCode: referral.code } });
    return { code: referral.code, uses: referral.uses, signups };
  }

  /** The users this caller invited (referredById == me), with their activity status. */
  async invitedUsers(userId: string): Promise<InvitedUser[]> {
    const invitees = await this.prisma.user.findMany({
      where: { referredById: userId },
      select: {
        id: true,
        displayName: true,
        phone: true,
        createdAt: true,
        _count: { select: { rounds: { where: { status: RoundStatus.FINISHED } } } },
      },
      orderBy: { createdAt: "desc" },
    });
    return invitees.map((u) => ({
      id: u.id,
      name: u.displayName ?? maskPhone(u.phone),
      joinedAt: u.createdAt.toISOString(),
      hasPlayed: u._count.rounds > 0,
    }));
  }

  /**
   * Called after a user finishes a round. If this was their FIRST completed round and
   * they were referred, credit the referrer once (REFERRAL_CREDIT). Naturally idempotent:
   * only fires when finishedCount === 1.
   */
  async onRoundFinished(userId: string): Promise<void> {
    const cfg = await this.config.get();
    if (cfg.referralBonus <= 0) return;

    const finishedCount = await this.prisma.round.count({
      where: { userId, status: RoundStatus.FINISHED },
    });
    if (finishedCount !== 1) return; // credit only on the very first completion

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.referredById) return;

    // Admins are excluded from competition, so an admin referrer never earns credit.
    const referrer = await this.prisma.user.findUnique({
      where: { id: user.referredById },
      select: { isAdmin: true },
    });
    if (referrer?.isAdmin) return;

    const weekKey = getWeekKey();
    await this.prisma.scoreEvent.create({
      data: {
        userId: user.referredById,
        points: cfg.referralBonus,
        reason: ScoreReason.REFERRAL_CREDIT,
        weekKey,
      },
    });
    await this.leaderboard.addPoints(user.referredById, cfg.referralBonus, weekKey);
    this.logger.log(`Referral credit: ${cfg.referralBonus} pts to ${user.referredById} for invitee ${userId}`);
  }

  private async createWithUniqueCode(userId: string) {
    // Retry a few times on the (very unlikely) unique-code collision.
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = randomBytes(5).toString("hex").toUpperCase(); // 10 hex chars
      try {
        return await this.prisma.referral.create({ data: { ownerUserId: userId, code } });
      } catch (err) {
        // If the *owner* already has one (race), return it.
        const existing = await this.prisma.referral.findUnique({ where: { ownerUserId: userId } });
        if (existing) return existing;
        if (attempt === 4) throw err;
      }
    }
    throw new Error("Could not generate a unique referral code");
  }
}

/** 09123456789 -> 0912***89 (don't expose full numbers of invited users). */
function maskPhone(phone: string): string {
  if (phone.length <= 6) return phone;
  return `${phone.slice(0, 4)}***${phone.slice(-2)}`;
}
