#!/bin/sh
set -e

# Optionally apply pending migrations before boot. Prefer running this as a
# one-off release step in prod; enable here for simple single-instance deploys.
if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
  echo "[entrypoint] Applying migrations (prisma migrate deploy)…"
  ./node_modules/.bin/prisma migrate deploy --schema=prisma/schema.prisma
fi

exec "$@"
