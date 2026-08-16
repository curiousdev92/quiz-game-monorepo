# CLAUDE.md — Project map

Phone-OTP trivia MVP. Turborepo (pnpm) monorepo. This is the map so you don't re-scan the tree —
follow the links for detail instead of duplicating it here.

```
apps/api/         NestJS 11 backend (REST + BullMQ worker), Prisma, Redis
apps/web/         Next.js 16 / React 19 frontend + admin UI
packages/shared/  DTOs, enums, getWeekKey() — imported as @quiz/shared
```

## Where things live

- **Architecture, modules, conventions** → [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **REST endpoints** → [docs/API.md](docs/API.md)
- **Docker / migrate / seed / purge / inspect** → [docs/DATABASE.md](docs/DATABASE.md)
- **Production deployment** → [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- **Prisma schema + ERD** → [docs/DATA-MODEL.md](docs/DATA-MODEL.md) (schema itself: `apps/api/prisma/schema.prisma`)
- **Product requirements** → [docs/PRODUCT.md](docs/PRODUCT.md)
- **Setup & quick start** → [README.md](README.md)

## Non-obvious facts (read before editing)

- `ScoreEvent` (append-only) is the source of truth; Redis ZSETs are a rebuildable cache.
- "Periods" are **daily**: `common/week-key.ts` returns `YYYY-MM-DD`; the DB column is still named
  `weekKey` but holds a day. Tiered leagues are retired (`League`/`LeagueMembership` vestigial).
- Admins can play to preview but **never** score, rank, or win — `GameService` skips their events.
- Auth: login rejects unregistered phones (must sign up first); `ADMIN_PHONES` env auto-promotes admins.
- User-facing API error/validation messages are **Persian**; the web app is RTL and toasts client errors.
- Shared enums (`packages/shared/src/index.ts`) mirror Prisma enums — keep them in sync manually.

## Dev

`pnpm db:up` → `pnpm db:generate` → `pnpm db:migrate` → `pnpm db:seed` → `pnpm dev` (web :3000, api :4000).
Copy `.env.example` → `.env` **and** `apps/api/.env`. OTP mocked (`OTP_MOCK_CODE=000000`).
Preview servers in `.claude/launch.json` (names: `web`, `api`).
