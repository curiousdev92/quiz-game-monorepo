import { ConfigService } from "@nestjs/config";
import type { RedisOptions } from "ioredis";

/**
 * Build ioredis connection options from env, usable by both the shared Redis client
 * and BullMQ. Supports managed Redis (password + TLS):
 *
 *   REDIS_URL       full connection string, e.g. rediss://:pass@host:6379 (wins if set)
 *   REDIS_HOST      host (default "localhost")
 *   REDIS_PORT      port (default 6379)
 *   REDIS_USERNAME  optional ACL username
 *   REDIS_PASSWORD  optional auth password
 *   REDIS_TLS       "true" to connect over TLS (or use a rediss:// URL)
 */
export function buildRedisOptions(config: ConfigService): RedisOptions {
  const url = config.get<string>("REDIS_URL");
  if (url) {
    const u = new URL(url);
    const opts: RedisOptions = {
      host: u.hostname,
      port: Number(u.port || 6379),
    };
    if (u.username) opts.username = decodeURIComponent(u.username);
    if (u.password) opts.password = decodeURIComponent(u.password);
    if (u.protocol === "rediss:") opts.tls = {};
    return opts;
  }

  const opts: RedisOptions = {
    host: config.get<string>("REDIS_HOST", "localhost"),
    port: Number(config.get("REDIS_PORT", 6379)),
  };
  const username = config.get<string>("REDIS_USERNAME");
  const password = config.get<string>("REDIS_PASSWORD");
  if (username) opts.username = username;
  if (password) opts.password = password;
  if (String(config.get("REDIS_TLS", "")).toLowerCase() === "true") opts.tls = {};
  return opts;
}
