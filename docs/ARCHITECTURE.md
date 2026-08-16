# Architecture

## Stack

- **apps/api** — NestJS 11, Prisma 6, Postgres, Redis, BullMQ worker. Global prefix `/api`,
  `ValidationPipe(whitelist + transform)`, CORS.
- **apps/web** — Next.js 16 App Router, React 19, Tailwind v4, client-rendered. Typed fetch client
  in `src/lib/api.ts`; auth (token + user in localStorage) in `src/lib/auth`.
- **packages/shared** — DTOs, enums, `getWeekKey()`. Enums mirror the Prisma enums (kept in sync manually).

## Backend layout (`apps/api/src/`)

| Module                  | Responsibility                                                  |
| ----------------------- | --------------------------------------------------------------- |
| `prisma/`, `redis/`     | Infra. `RedisModule` is `@Global`, token `REDIS_CLIENT`.        |
| `health/`               | `GET /api/health` → `{status, db, redis}`.                      |
| `auth/`, `sms/`         | Phone-OTP login, JWT guards, Kavenegar SMS (mocked in dev).     |
| `game/`                 | Round lifecycle, question paging, scoring, `GameConfig`.        |
| `leaderboard/`          | Overall + daily boards backed by Redis ZSETs.                   |
| `leagues/`              | Daily-period leagues, round allowance, rewards, discount codes. |
| `referrals/`, `prizes/` | Referral codes/credit, prize preview & awards.                  |
| `quests/`               | Collectible challenges/actions (incl. referral milestones).     |
| `jobs/`                 | BullMQ daily close cron.                                        |
| `admin/`                | Dashboard stats, question/quest CRUD, imports, fulfillment.     |

Feature modules are wired in `app.module.ts`.

## Core conventions

- **Ledger + cache.** `ScoreEvent` (append-only) is the source of truth; Redis sorted sets
  (`lb:overall`, `lb:week:<key>`) are a rebuildable cache. Rebuild reconciles.
- **Periods are daily.** `getPeriodKey()` / `previousPeriodKey()` in `common/week-key.ts` return
  `YYYY-MM-DD` (UTC). The DB column is still named `weekKey` but holds a day. Tiered Bronze/Silver/Gold
  leagues are retired.
- **Active league.** A round counts against the regular league whose `[startsAt, endsAt)` window
  contains now, else the live `isOverall` campaign. Per-league round cap =
  `League.roundAllowance` + `RoundGrant`s; quests grant extra rounds.
- **Admins play but never compete.** `GameService` skips ScoreEvents / leaderboard / bonuses /
  enrollment when the player `isAdmin`; they are absent from all boards, leagues, and prizes.
- **Auth.** Login rejects unregistered phones (must sign up first); signup creates the user on
  OTP verify. `ADMIN_PHONES` (env) auto-promotes to admin. `AdminGuard` protects `admin/*`.

## Frontend

- `src/app/` App Router pages: `/login`, `/` (intro), `/play` (countdown → timed round →
  green/red feedback → results), `/leagues`, `/quests`, `/me` (profile), `/admin`.
- `src/lib/api.ts` — `apiBase()` derives the API host from `window.location.hostname` when
  `NEXT_PUBLIC_API_URL` is loopback, so LAN devices work without config.
- Error handling: route `error.tsx` / `global-error.tsx` / `not-found.tsx` boundaries; client errors
  surface as `react-hot-toast` toasts via `src/lib/toast.ts`. User-facing API messages are Persian.

## Environment

- `pnpm dev` runs both apps (web :3000, api :4000). Preview servers in `.claude/launch.json`.
- Copy `.env.example` → `.env` **and** `apps/api/.env`. OTP mocked (`OTP_MOCK_CODE=000000`).
- CORS: `main.ts` allows `CORS_ORIGIN` (comma list) plus any localhost/private-LAN origin.
- See [DATABASE.md](DATABASE.md) for Docker / migrate / seed / purge.
