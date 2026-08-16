# Database

Postgres 16 + Redis 7 run in Docker (`docker-compose.yml`). Prisma owns the schema and migrations
(`apps/api/prisma/`). Prisma reads `apps/api/.env` — keep `DATABASE_URL` there.

Default local connection: `postgresql://quiz:quiz@localhost:5432/quiz`

All commands run from the repo root unless noted.

## Docker up / down

```bash
pnpm db:up            # start Postgres + Redis (detached)
pnpm db:down          # stop containers, KEEP data (volumes persist)
docker compose ps     # see status
docker compose logs -f postgres   # tail logs
```

## Migrate & seed

```bash
pnpm db:generate      # regenerate Prisma client (after schema edits)
pnpm db:migrate       # apply/create migrations (prisma migrate dev)
pnpm db:seed          # insert sample questions/leagues/prizes (idempotent)
```

## Inspect / preview the data

```bash
pnpm db:studio        # Prisma Studio GUI → http://localhost:5555 (browse & edit tables)
```

Or via psql inside the container:

```bash
docker exec -it quiz-postgres psql -U quiz -d quiz
# then:  \dt        list tables
#        \d "User"  describe a table
#        SELECT count(*) FROM "User";
#        \q         quit
```

## Purge the database

Pick the level of destruction you need.

**Reset data + re-run migrations & seed (keeps the container/volume):**

```bash
pnpm --filter @quiz/api exec prisma migrate reset
# drops schema, re-applies all migrations, runs the seed. Prompts for confirmation.
```

**Nuke everything, including the Docker volumes (Postgres + Redis data):**

```bash
pnpm db:down -v       # stop and delete named volumes (quiz-pgdata, quiz-redisdata)
```

**Flush only Redis** (leaderboard ZSET cache, OTP codes — rebuildable from the ledger):

```bash
docker exec -it quiz-redis redis-cli FLUSHALL
```

### Re-establish after a purge

After `pnpm db:down -v` (fresh volumes), bring it back up:

```bash
pnpm db:up
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

After `prisma migrate reset` nothing extra is needed — it already migrated and seeded. Rebuild the
Redis leaderboard cache anytime with the admin endpoint `POST /api/admin/leaderboard/rebuild`.
