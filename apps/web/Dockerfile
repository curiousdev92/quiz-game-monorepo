
## #syntax=docker/dockerfile:1
# Build context = repo ROOT.
#   docker build -f apps/web/Dockerfile --build-arg NEXT_PUBLIC_API_URL=https://quiz.example.com/api -t quiz-web .
##
# NOTE: NEXT_PUBLIC_API_URL is inlined at BUILD time — it must be passed as a
# build-arg. Changing it later requires rebuilding the image.

FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /app

# ---- builder ----
FROM base AS builder
COPY .npmrc pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
COPY . .
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @quiz/web build

# ---- runtime: self-contained standalone server ----
FROM base AS runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
# standalone bundles a minimal server + traced node_modules (incl. workspace deps).
COPY --chown=node:node --from=builder /app/apps/web/.next/standalone ./
COPY --chown=node:node --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --chown=node:node --from=builder /app/apps/web/public ./apps/web/public

USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
