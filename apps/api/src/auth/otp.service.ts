import { randomInt } from "node:crypto";

import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

import { REDIS_CLIENT } from "../redis/redis.module";

/** Acquisition data captured at request-otp time, stashed until the user verifies. */
export interface PendingAcquisition {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  referralCode?: string;
  landingPath?: string;
  // Registration profile captured at request-otp time, applied when the user is first created.
  fullName?: string;
  age?: number;
}

/**
 * OTP lifecycle backed by Redis with a TTL. Two keys per phone:
 *   otp:code:<phone>    -> the code
 *   otp:pending:<phone> -> JSON acquisition payload (attached on first verify)
 * Both expire together after OTP_TTL_SECONDS.
 */
@Injectable()
export class OtpService {
  private readonly ttlSeconds: number;
  private readonly mockCode: string;
  private readonly cooldownSeconds: number;
  private readonly maxPerHour: number;

  constructor(
    private readonly config: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {
    // ConfigService returns raw env strings, so coerce explicitly.
    this.ttlSeconds = Number(this.config.get("OTP_TTL_SECONDS", 300));
    this.mockCode = this.config.get<string>("OTP_MOCK_CODE", "");
    // Abuse guards: min seconds between sends, and max sends per phone per hour.
    this.cooldownSeconds = Number(this.config.get("OTP_COOLDOWN_SECONDS", 60));
    this.maxPerHour = Number(this.config.get("OTP_MAX_PER_HOUR", 5));
  }

  private codeKey(phone: string): string {
    return `otp:code:${phone}`;
  }

  private pendingKey(phone: string): string {
    return `otp:pending:${phone}`;
  }

  private cooldownKey(phone: string): string {
    return `otp:cooldown:${phone}`;
  }

  private rateKey(phone: string): string {
    return `otp:rate:${phone}`;
  }

  /**
   * Guard the SMS-sending path: enforce a per-phone cooldown between sends and an
   * hourly cap. Throws 429 (Persian) when exceeded. SMS costs money — this stops a
   * retry storm or malicious flood from running up the bill. Redis-backed, no deps.
   */
  async assertWithinRateLimit(phone: string): Promise<void> {
    if (this.cooldownSeconds > 0) {
      const acquired = await this.redis.set(this.cooldownKey(phone), "1", "EX", this.cooldownSeconds, "NX");
      if (acquired === null) {
        const ttl = await this.redis.ttl(this.cooldownKey(phone));
        throw new HttpException(`لطفا ${Math.max(1, ttl)} ثانیه دیگر دوباره تلاش کنید`, HttpStatus.TOO_MANY_REQUESTS);
      }
    }
    if (this.maxPerHour > 0) {
      const count = await this.redis.incr(this.rateKey(phone));
      if (count === 1) await this.redis.expire(this.rateKey(phone), 3600);
      if (count > this.maxPerHour) {
        throw new HttpException(
          "تعداد درخواستها بیش از حد مجاز است؛ یک ساعت دیگر دوباره تلاش کنید",
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }
  }

  /** Generate + store a code (and pending acquisition), returning the code. */
  async issue(phone: string, acquisition: PendingAcquisition): Promise<{ code: string; ttlSeconds: number }> {
    const code = this.mockCode || String(randomInt(0, 1_000_000)).padStart(6, "0");
    await this.redis
      .multi()
      .set(this.codeKey(phone), code, "EX", this.ttlSeconds)
      .set(this.pendingKey(phone), JSON.stringify(acquisition), "EX", this.ttlSeconds)
      .exec();
    return { code, ttlSeconds: this.ttlSeconds };
  }

  /** Verify a submitted code. On success, consumes both keys and returns the pending acquisition. */
  async verify(phone: string, code: string): Promise<{ ok: boolean; acquisition: PendingAcquisition }> {
    const stored = await this.redis.get(this.codeKey(phone));
    if (!stored || stored !== code) {
      return { ok: false, acquisition: {} };
    }
    const pendingRaw = await this.redis.get(this.pendingKey(phone));
    await this.redis.del(this.codeKey(phone), this.pendingKey(phone));
    const acquisition = pendingRaw ? (JSON.parse(pendingRaw) as PendingAcquisition) : {};
    return { ok: true, acquisition };
  }
}
