import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { KavenegarApi, KavenegarClient } from "kavenegar";

const SAMPLE_KEY = "kavenegar-sample-api-key";

/**
 * Sends transactional messages via Kavenegar's VerifyLookup (template) API — OTP codes,
 * the post-signup welcome message, and discount codes from collected prizes.
 * While the API key is the sample placeholder (or unset), runs in MOCK mode: messages
 * are logged instead of sent, so local dev works without credentials.
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly client: KavenegarClient | null;
  private readonly otpTemplate: string;
  private readonly welcomeTemplate: string;
  private readonly discountTemplate: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>("KAVENEGAR_API_KEY", "");
    this.otpTemplate = this.config.get<string>("KAVENEGAR_OTP_TEMPLATE", "quiz-otp");
    this.welcomeTemplate = this.config.get<string>("KAVENEGAR_WELCOME_TEMPLATE", "quiz-welcome");
    this.discountTemplate = this.config.get<string>("KAVENEGAR_DISCOUNT_TEMPLATE", "quiz-discount");
    const isReal = apiKey.length > 0 && apiKey !== SAMPLE_KEY;
    this.client = isReal ? KavenegarApi({ apikey: apiKey }) : null;
    if (!this.client) {
      this.logger.warn("Kavenegar in MOCK mode (sample/empty API key) — messages will be logged, not sent.");
    }
  }

  async sendOtp(phone: string, code: string): Promise<void> {
    return this.sendViaTemplate(phone, this.otpTemplate, `OTP for ${phone}: ${code}`, { token: code });
  }

  /** Sent once, right after a brand-new user completes their first sign-up. */
  async sendWelcome(phone: string, name?: string): Promise<void> {
    return this.sendViaTemplate(phone, this.welcomeTemplate, `Welcome SMS for ${phone} (${name ?? "player"})`, {
      token: name ?? "",
    });
  }

  /** Sent when a player collects a league reward and chooses the discount-code option. */
  async sendDiscountCode(phone: string, code: string, discountPercent: number): Promise<void> {
    return this.sendViaTemplate(
      phone,
      this.discountTemplate,
      `Discount code for ${phone}: ${code} (${discountPercent}%)`,
      { token: code, token2: String(discountPercent) },
    );
  }

  private async sendViaTemplate(
    phone: string,
    template: string,
    mockLogLine: string,
    tokens: { token: string; token2?: string; token3?: string },
  ): Promise<void> {
    if (!this.client) {
      this.logger.log(`[MOCK SMS] ${mockLogLine}`);
      return;
    }
    await new Promise<void>((resolve, reject) => {
      this.client!.VerifyLookup({ receptor: phone, template, ...tokens }, (response, status) => {
        if (status === 200) {
          resolve();
        } else {
          this.logger.error(`Kavenegar send failed (status ${status}): ${JSON.stringify(response)}`);
          reject(new Error(`Kavenegar VerifyLookup failed with status ${status}`));
        }
      });
    });
  }
}
