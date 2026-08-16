# Deployment

Handoff guide for running the quiz app in production. See [ARCHITECTURE.md](ARCHITECTURE.md) for
how the pieces fit and [DATABASE.md](DATABASE.md) for DB operations.

## Topology

Four services behind a TLS-terminating reverse proxy:

| Service      | What                 | Port | Notes                                                                                                                               |
| ------------ | -------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **web**      | Next.js (standalone) | 3000 | Static frontend + admin.                                                                                                            |
| **api**      | NestJS               | 4000 | Prefix `/api`. Health: `GET /api/health`. **Runs the BullMQ worker + weekly-close cron in-process — no separate worker to deploy.** |
| **postgres** | PostgreSQL 16        | 5432 | Source of truth.                                                                                                                    |
| **redis**    | Redis 7              | 6379 | **Must persist** — holds the BullMQ queue, OTP codes, and leaderboard cache.                                                        |

Proxy routing: `/` → web:3000, `/api` → api:4000 (or split subdomains). Set
`client_max_body_size` ≥ **20 MB** (bulk question import).

The weekly-close cron is `5 0 * * 1` **UTC** (Mon 00:05). Multiple API replicas are safe (BullMQ
dedupes the repeatable job); they share one Redis.

## Requirements

- **Node 22+**, **pnpm 10** (via corepack). Docker images use `node:22-alpine` (musl). The api image
  builds a pruned, production-only `node_modules` via `pnpm deploy --prod` (needs
  `inject-workspace-packages=true` in `.npmrc`, already set) and Prisma's `schema.prisma` declares
  `binaryTargets = ["native", "linux-musl-openssl-3.0.x"]` to match musl. The web image has no native
  deps, so it needs neither.
- **PostgreSQL 16**, **Redis 7** (persistent).
- **Kavenegar** SMS account: the server's egress IP must be whitelisted, and the template names in
  env must match **approved** templates.

## Environment variables

Full reference: [.env.production.example](../.env.production.example). Highlights:

| Var                                           | Service | Notes                                                                              |
| --------------------------------------------- | ------- | ---------------------------------------------------------------------------------- |
| `DATABASE_URL`                                | api     | Full Postgres URL (supports `?sslmode=require`).                                   |
| `REDIS_HOST`/`REDIS_PORT`                     | api     | Or `REDIS_URL` (a `rediss://` URL enables TLS).                                    |
| `REDIS_USERNAME`/`REDIS_PASSWORD`/`REDIS_TLS` | api     | For managed/authenticated Redis.                                                   |
| `JWT_SECRET`                                  | api     | 🔒 strong random (e.g. `openssl rand -hex 32`).                                    |
| `OTP_MOCK_CODE`                               | api     | **Must be empty in prod** — a value makes OTP a fixed code.                        |
| `KAVENEGAR_API_KEY` + `*_TEMPLATE`            | api     | 🔒 real key; whitelisted IP; approved templates.                                   |
| `ADMIN_PHONES`                                | api     | Comma list auto-promoted to admin.                                                 |
| `CORS_ORIGIN`                                 | api     | The **public web origin(s)**, comma-separated.                                     |
| `GAME_SERVICE_BASE_URL` + `GAME_SERVICE_KEY`  | api     | 🔒 external game platform for shop-access quests; key stays server-side. Optional. |
| `NEXT_PUBLIC_API_URL`                         | web     | ⚠️ **Build-time** — inlined into the bundle; rebuild the image to change it.       |

## Option A — Docker (recommended)

Dockerfiles build from the **repo root** (they need the pnpm workspace):

- [apps/api/Dockerfile](../apps/api/Dockerfile) — installs deps, `prisma generate`, `nest build`.
  Entrypoint runs `prisma migrate deploy` when `RUN_MIGRATIONS=true`.
- [apps/web/Dockerfile](../apps/web/Dockerfile) — builds the Next standalone server. Pass
  `--build-arg NEXT_PUBLIC_API_URL=...`.

Full stack via [docker-compose.prod.yml](../docker-compose.prod.yml):

```bash
cp .env.production.example .env.production   # fill in real values
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Or build images individually:

```bash
docker build -f apps/api/Dockerfile -t quiz-api .
docker build -f apps/web/Dockerfile --build-arg NEXT_PUBLIC_API_URL=https://quiz.example.com/api -t quiz-web .
```

## Option B — Bare Node (process manager)

```bash
pnpm install --frozen-lockfile
pnpm --filter @quiz/api exec prisma generate
NEXT_PUBLIC_API_URL=https://quiz.example.com/api pnpm build   # turbo: shared → api + web
pnpm --filter @quiz/api exec prisma migrate deploy            # release step

# run (under pm2/systemd):
node apps/api/dist/main.js                     # api  (:4000)
node apps/web/.next/standalone/apps/web/server.js   # web (:3000, set HOSTNAME=0.0.0.0)
```

For the standalone web server, also ensure `apps/web/.next/static` and `apps/web/public` sit next to
`server.js` in the standalone tree (the Dockerfile does this copy for you).

## Database

Migrations use **`prisma migrate deploy`** (never `migrate dev` in prod). It's wired into the API
container entrypoint (`RUN_MIGRATIONS=true`) for single-instance deploys; for multiple replicas run
it once as a release step instead. Seeding is optional (sample content) — real content is loaded via
the admin panel. Rebuild the Redis leaderboard cache anytime: `POST /api/admin/leaderboard/rebuild`.

## Pre-flight checklist

- [ ] `JWT_SECRET` is a fresh strong secret (not `change-me-in-production`).
- [ ] `OTP_MOCK_CODE` is **empty**.
- [ ] Real `KAVENEGAR_API_KEY`; server IP whitelisted; templates approved. **Rotate the key that
      currently sits in `apps/api/.env`.**
- [ ] `CORS_ORIGIN` = the public web origin; `NEXT_PUBLIC_API_URL` set at **build** time.
- [ ] Postgres + Redis use strong passwords and persistent volumes; Redis auth enabled.
- [ ] Reverse proxy TLS + `client_max_body_size ≥ 20m`.
- [ ] `prisma migrate deploy` runs on release.
