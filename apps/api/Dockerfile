# syntax=docker/dockerfile:1.7
FROM node:20-alpine AS base
RUN apk add --no-cache openssl libc6-compat \
 && corepack enable \
 && corepack prepare pnpm@9.12.0 --activate
WORKDIR /repo

# Single-stage build: pnpm's symlink layout doesn't survive a partial
# COPY of /repo/node_modules across stages.
FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json .npmrc ./
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/
COPY packages/youtube/package.json ./packages/youtube/
COPY packages/db/prisma ./packages/db/prisma
RUN pnpm install --frozen-lockfile

COPY apps/api ./apps/api
COPY packages ./packages
RUN pnpm --filter @watchlater/db generate
RUN pnpm --filter @watchlater/db build
RUN pnpm --filter @watchlater/youtube build
RUN pnpm --filter @watchlater/api build
RUN pnpm prune --prod --ignore-scripts

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps ./apps
COPY --from=build /repo/packages ./packages
COPY --from=build /repo/package.json /repo/pnpm-workspace.yaml ./
WORKDIR /repo/apps/api
EXPOSE 4000
CMD ["node", "dist/main.js"]
