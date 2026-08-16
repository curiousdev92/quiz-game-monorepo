import { ValidationPipe, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";

import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Nest's default JSON body limit (100kb) is too small for bulk question
  // imports (CSV/Excel, thousands of rows) — raise it.
  app.useBodyParser("json", { limit: "20mb" });
  app.useBodyParser("urlencoded", { limit: "20mb", extended: true });
  const config = app.get(ConfigService);

  app.setGlobalPrefix("api");
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // Allow the web frontend origin(s). CORS_ORIGIN is a comma-separated list; in
  // dev it defaults to the Next app on :3000. (NEXT_PUBLIC_API_URL is the API's
  // own URL, so it must NOT be used here.)
  const allowList = (config.get<string>("CORS_ORIGIN") ?? "http://localhost:3000")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  // Private/loopback hosts so the app is reachable from other devices on the LAN
  // in dev (any port). Matches localhost, 127.x, 10.x, 192.168.x, 172.16–31.x.
  const lanHost =
    /^https?:\/\/(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/;

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Non-browser clients (curl, mobile apps) send no Origin — allow them.
      if (!origin || allowList.includes(origin) || lanHost.test(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin not allowed by CORS: ${origin}`));
    },
    credentials: true,
  });

  const port = config.get<number>("API_PORT", 4000);
  await app.listen(port);
  Logger.log(`API listening on http://localhost:${port}/api`, "Bootstrap");
}

void bootstrap();
