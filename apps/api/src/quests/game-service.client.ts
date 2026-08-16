import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

const ACCESS_PATH = "/api/v1/apps/games/shop/access/service";
// Timeout so a slow/hung external platform doesn't pin our request thread.
const TIMEOUT_MS = 10_000;

export interface ShopAccessGrant {
  gameCode: string;
  skuKind: string;
  skuId: string;
  /** The player identifier the external platform keys access by — our users are phone-based. */
  phone: string;
}

/**
 * Thin server-side proxy for the game platform's shop-access API. The service key
 * is a secret and never leaves the backend. Configured via:
 *   GAME_SERVICE_BASE_URL  origin of the platform (e.g. https://platform.example.com)
 *   GAME_SERVICE_KEY       value for the X-Game-Service-Key header
 */
@Injectable()
export class GameServiceClient {
  private readonly logger = new Logger(GameServiceClient.name);

  constructor(private readonly config: ConfigService) {}

  /** Grant a player access to a SKU. Throws ServiceUnavailable on any non-OK / network / config error. */
  async grantShopAccess(grant: ShopAccessGrant): Promise<void> {
    const baseUrl = this.config.get<string>("GAME_SERVICE_BASE_URL");
    const key = this.config.get<string>("GAME_SERVICE_KEY");
    if (!baseUrl || !key) {
      this.logger.error("GAME_SERVICE_BASE_URL / GAME_SERVICE_KEY not configured");
      throw new ServiceUnavailableException("سرویس دسترسی در دسترس نیست");
    }

    const url = new URL(ACCESS_PATH, baseUrl);
    url.searchParams.set("game_code", grant.gameCode);
    url.searchParams.set("sku_kind", grant.skuKind);
    url.searchParams.set("sku_id", grant.skuId);
    url.searchParams.set("phone", grant.phone);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { "X-Game-Service-Key": key },
        signal: controller.signal,
      });
      if (!res.ok) {
        // Log the status/body for ops, but never surface upstream detail (or the key) to the client.
        const body = await res.text().catch(() => "");
        this.logger.error(`Shop-access grant failed (${res.status}) for ${grant.gameCode}/${grant.skuId}: ${body}`);
        throw new ServiceUnavailableException("دریافت دسترسی ناموفق بود؛ بعدا دوباره تلاش کنید");
      }
    } catch (err) {
      if (err instanceof ServiceUnavailableException) throw err;
      this.logger.error(`Shop-access request error: ${String(err)}`);
      throw new ServiceUnavailableException("ارتباط با سرویس دسترسی برقرار نشد");
    } finally {
      clearTimeout(timer);
    }
  }
}
