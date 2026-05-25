# syntax=docker/dockerfile:1.7
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat \
 && corepack enable \
 && corepack prepare pnpm@9.12.0 --activate
WORKDIR /repo

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json .npmrc ./
COPY apps/web/package.json ./apps/web/
COPY packages/db/package.json ./packages/db/
COPY packages/youtube/package.json ./packages/youtube/
COPY packages/db/prisma ./packages/db/prisma
RUN pnpm install --frozen-lockfile

FROM base AS build
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /repo/node_modules ./node_modules
COPY . .
RUN pnpm --filter @watchlater/web build

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/web/.next ./apps/web/.next
COPY --from=build /repo/apps/web/public ./apps/web/public
COPY --from=build /repo/apps/web/package.json ./apps/web/
COPY --from=build /repo/apps/web/next.config.mjs ./apps/web/
WORKDIR /repo/apps/web
EXPOSE 7777
CMD ["pnpm", "exec", "next", "start", "-p", "7777"]
