##### syntax=docker/dockerfile:1
# Build context = repo ROOT (needs pnpm workspace + lockfile).
#   docker build -f apps/api/Dockerfile -t quiz-api .
####
# ---- base: pnpm on Alpine (musl) ----
FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
# Prisma needs openssl + CA certs at runtime.
RUN apk add --no-cache openssl ca-certificates
WORKDIR /app
##
# ---- builder: install all deps, generate Prisma client, compile Nest ----
FROM base AS builder
COPY .npmrc pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter @quiz/api exec prisma generate
RUN pnpm --filter @quiz/api build
# Produce an isolated, hoisted, production-only node_modules for just @quiz/api
# (excludes devDependencies and every other workspace package's deps).
RUN pnpm --filter @quiz/api deploy --prod /app/deploy
# `deploy` reinstalls deps fresh, which re-runs @prisma/client's postinstall
# before prisma/schema.prisma exists in the deploy dir, leaving an empty stub
# client. Regenerate it now that the schema is in place.
RUN pnpm --filter @quiz/api exec prisma generate --schema=/app/deploy/prisma/schema.prisma

# ---- runtime ----
FROM base AS runtime
ENV NODE_ENV=production
COPY --chown=node:node --from=builder /app/deploy/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/deploy/package.json ./package.json
COPY --chown=node:node --from=builder /app/deploy/dist ./dist
COPY --chown=node:node --from=builder /app/deploy/prisma ./prisma
COPY --chown=node:node apps/api/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER node
EXPOSE 4000
# Set RUN_MIGRATIONS=true to run `prisma migrate deploy` on boot (else run it as a release step).
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/src/main.js"]
