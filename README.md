# Quiz Game

Phone-OTP trivia MVP. Players answer timed multiple-choice questions, earn points, and compete on
daily and all-time leaderboards, with leagues, referrals, prizes, and collectible quests. One admin
manages content and settings.

Monorepo (Turborepo + pnpm): **Next.js** web · **NestJS** API · **PostgreSQL** (Prisma) · **Redis** + **BullMQ**.

```
apps/api/         NestJS backend (REST + BullMQ worker)
apps/web/         Next.js frontend + admin UI
packages/shared/  DTOs, enums, week-key helper (imported as @quiz/shared)
```

## Quick start

Prereqs: Node 22+, pnpm 10+, Docker.

```bash
pnpm install
cp .env.example .env && cp .env.example apps/api/.env   # Prisma reads apps/api/.env
pnpm db:up            # start Postgres + Redis
pnpm db:generate      # Prisma client
pnpm db:migrate       # create tables
pnpm db:seed          # sample questions/leagues/prizes
pnpm dev              # web :3000 + api :4000
```

Health check: <http://localhost:4000/api/health> · Dev OTP code: `000000`

## Docs

| Doc                                          | What                                  |
| -------------------------------------------- | ------------------------------------- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack, layout, modules, conventions   |
| [docs/API.md](docs/API.md)                   | REST endpoint reference               |
| [docs/DATABASE.md](docs/DATABASE.md)         | Docker, migrate, seed, purge, inspect |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)     | Production deploy (Docker, env)       |
| [docs/DATA-MODEL.md](docs/DATA-MODEL.md)     | Prisma schema + ERD                   |
| [docs/PRODUCT.md](docs/PRODUCT.md)           | Product requirements                  |
