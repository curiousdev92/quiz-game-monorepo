import { Injectable, Logger, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Prisma, User } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { SmsService } from "../sms/sms.service";
import { RequestOtpDto } from "./dto/request-otp.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";
import { OtpService, PendingAcquisition } from "./otp.service";

export interface JwtPayload {
  sub: string;
  phone: string;
}

export interface AuthResult {
  token: string;
  user: { id: string; phone: string; displayName: string | null; isAdmin: boolean; isNew: boolean };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly adminPhones: Set<string>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly otp: OtpService,
    private readonly sms: SmsService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {
    this.adminPhones = new Set(
      (this.config.get<string>("ADMIN_PHONES", "") ?? "")
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => AuthService.normalizePhone(p)),
    );
  }

  /** Canonicalize any accepted format to `09xxxxxxxxx`. */
  static normalizePhone(raw: string): string {
    const digits = raw.replace(/\D/g, "");
    const local = digits.replace(/^98/, "").replace(/^0/, ""); // strip country/trunk prefix -> 9xxxxxxxxx
    return `0${local}`;
  }

  async requestOtp(dto: RequestOtpDto): Promise<{ sent: true; ttlSeconds: number }> {
    const phone = AuthService.normalizePhone(dto.phone);

    // Login (the default intent) is only for existing users — unregistered phones
    // must sign up first. Signup creates the account on verify.
    if (dto.mode !== "signup") {
      const existing = await this.prisma.user.findUnique({ where: { phone }, select: { id: true } });
      if (!existing) {
        throw new NotFoundException("این شماره ثبت نشده است؛ لطفا ابتدا ثبت نام کنید.");
      }
    }

    // Throttle before sending — SMS costs money (see OtpService.assertWithinRateLimit).
    await this.otp.assertWithinRateLimit(phone);

    const acquisition: PendingAcquisition = {
      utmSource: dto.utmSource,
      utmMedium: dto.utmMedium,
      utmCampaign: dto.utmCampaign,
      referralCode: dto.referralCode,
      landingPath: dto.landingPath,
      fullName: dto.fullName?.trim() || undefined,
      age: dto.age,
    };
    const { code, ttlSeconds } = await this.otp.issue(phone, acquisition);
    await this.sms.sendOtp(phone, code);
    return { sent: true, ttlSeconds };
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<AuthResult> {
    const phone = AuthService.normalizePhone(dto.phone);
    const { ok, acquisition } = await this.otp.verify(phone, dto.code);
    if (!ok) {
      throw new UnauthorizedException("کد نامعتبر است یا منقضی شده");
    }

    const existing = await this.prisma.user.findUnique({ where: { phone } });
    let user = existing ?? (await this.createUser(phone, acquisition));
    const isNew = !existing;

    if (isNew) {
      // Best-effort — a welcome SMS failing shouldn't block the user's own login.
      this.sms
        .sendWelcome(phone, user.displayName ?? undefined)
        .catch((err) => this.logger.error(`Welcome SMS failed for ${phone}: ${String(err)}`));
    }

    // Promote to admin if this phone is allow-listed (and not already admin).
    if (this.adminPhones.has(phone) && !user.isAdmin) {
      user = await this.prisma.user.update({ where: { id: user.id }, data: { isAdmin: true } });
    }

    const token = await this.jwt.signAsync({ sub: user.id, phone: user.phone } satisfies JwtPayload);
    return {
      token,
      user: {
        id: user.id,
        phone: user.phone,
        displayName: user.displayName,
        isAdmin: user.isAdmin,
        isNew,
      },
    };
  }

  /** Create a user and capture acquisition + referral attribution in one transaction. */
  private async createUser(phone: string, acquisition: PendingAcquisition): Promise<User> {
    return this.prisma.$transaction(
      async (tx) => {
        // Resolve a valid referral code to its owner (if any) before creating the user.
        const referral = acquisition.referralCode
          ? await tx.referral.findUnique({ where: { code: acquisition.referralCode } })
          : null;

        const user = await tx.user.create({
          data: {
            phone,
            displayName: acquisition.fullName ?? null,
            age: acquisition.age ?? null,
            referredById: referral?.ownerUserId ?? null,
            acquisitionSource: {
              create: {
                utmSource: acquisition.utmSource,
                utmMedium: acquisition.utmMedium,
                utmCampaign: acquisition.utmCampaign,
                referralCode: acquisition.referralCode,
                landingPath: acquisition.landingPath,
              },
            },
          },
        });

        if (referral && referral.ownerUserId !== user.id) {
          await tx.referralAttribution.create({
            data: { referralCode: referral.code, newUserId: user.id },
          });
          await tx.referral.update({
            where: { id: referral.id },
            data: { uses: { increment: 1 } },
          });
          // Referral *scoring* (REFERRAL_CREDIT ScoreEvent) is deferred to Phase 4.
        }

        return user;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}
