# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

**Turborepo + pnpm monorepo.** All commands run from the repo root unless noted.

```
apps/
  api/        NestJS 11 — REST API + cron (port 4000)
  web/        Next.js 15 App Router (port 7777)
packages/
  db/         Prisma schema + generated client (consumed by apps/api)
  youtube/    Server-side YouTube Data API wrapper (consumed by apps/api)
```

`pnpm-workspace.yaml` covers `apps/*` and `packages/*`. Workspace deps are referenced via `workspace:*` (e.g. `@watchlater/db`, `@watchlater/youtube`).

## Commands

Always use **pnpm**, never npm or yarn. Lockfile is `pnpm-lock.yaml`.

### Root (Turborepo)

- `pnpm install` — install everything in one go.
- `pnpm dev` — runs api + web in parallel (Turborepo `dev` task; both apps' `dev` scripts).
- `pnpm build` — full monorepo build.
- `pnpm lint` / `pnpm test` — fan out across packages.
- `pnpm db:push` / `pnpm db:generate` — proxy to `@watchlater/db`'s Prisma scripts.

### apps/api (cd apps/api)

- `pnpm dev` — `nest start --watch`.
- `pnpm build` / `pnpm start:prod`.
- `pnpm test` — Jest (config inline in `package.json`, `rootDir: src`, `*.spec.ts`).
- Single test: `pnpm test path/to/file.spec.ts` or `pnpm test -t "name"`.

### apps/web (cd apps/web)

- `pnpm dev` — `next dev --turbopack -p 7777`.
- `pnpm build` / `pnpm start` (start uses port 8080).
- `pnpm lint` — `next lint`. No test runner configured.
- `pnpm typecheck` — `tsc --noEmit`.

### Docker

- `docker compose up` boots Postgres + api + web. Requires `JWT_SECRET` and `YOUTUBE_API_KEY` in the environment (or `.env` next to compose).

## Environment

| Variable                     | Where         | Notes                                                        |
| ---------------------------- | ------------- | ------------------------------------------------------------ |
| `DATABASE_URL`               | `apps/api`    | PostgreSQL connection string                                 |
| `JWT_SECRET`                 | `apps/api`    | **Required** — api refuses to boot if missing                |
| `YOUTUBE_API_KEY`            | `apps/api`    | **Required** — server-side YT Data API key (never `NEXT_PUBLIC_`) |
| `FRONTEND_URL`               | `apps/api`    | CORS origin                                                  |
| `PORT`                       | `apps/api`    | Default 4000                                                 |
| `PLAYLIST_RESYNC_ENABLED`    | `apps/api`    | `false` to disable the every-6h cron                         |
| `NEXT_PUBLIC_API_BASE_URL`   | `apps/web`    | Points at the NestJS api                                     |
| `PORT`                       | `apps/web`    | Default 7777 for dev                                         |

**Security invariant:** YouTube API access is server-side only. Never reintroduce `NEXT_PUBLIC_YOUTUBE_API_KEY` — the browser must hit `/youtube/*` on the NestJS api instead.

## Architecture

### Domain model (`packages/db/prisma/schema.prisma`)

- `User` owns `Card`s, `List`s, and both sides of `Suggestion`.
- `Card.status` is `ColumnType` enum: `WATCH_LATER` / `WATCHING` / `WATCHED`. `order: Int` is the kanban position within a column. `channelId`/`channelTitle` are populated server-side from the YouTube snippet.
- `List` is a user-named group of cards. One card per list (`Card.listId` is NOT NULL). `isDefault: true` marks the auto-created "default" List per user (it cannot be renamed or deleted). `youtubePlaylistId` (nullable) marks Lists that came from a YouTube import — the cron uses this to know what to re-sync.
- `Suggestion` lets one user recommend a video to another; `accepted` is tri-state.

The old `Playlist` model is gone — collapsed into `List` with `youtubePlaylistId` set. See migration `20260525000000_lists_and_channels`.

Prisma generates into the standard `node_modules/.prisma/client` (no custom `output` path — pnpm gets confused otherwise). The `@watchlater/db` package re-exports `* from "@prisma/client"`, so consumer code imports types/enums/PrismaClient from `@watchlater/db`.

### Server modules (`apps/api/src/`)

Module-per-domain: `auth/`, `user/`, `card/`, `list/`, `smart-pick/`, `suggestion/`, `youtube/`, `cron/`, plus a shared `prisma/` module (global, exports `PrismaService`).

**Smart pick** — `apps/api/src/smart-pick/scoring.ts` holds the pure `scoreCard(card, ctx)` function. Weights live in `weights.ts` as `DEFAULT_SMART_PICK_WEIGHTS` constants. The service composes scoring + persistence and exposes `tonight` (single top-scoring pick) and `queue` (greedy fill within `target * 1.1` ceiling, max 4 items). Ineligible if `duration > target * 1.1`. `WATCHED` cards are excluded from candidates.

**Auth conventions** (preserve when adding endpoints):
- `@UseGuards(JwtAuthGuard)` for protected routes. Strategy attaches `{ userId, username }` to `req.user`.
- Controllers return `{ statusCode: 4xx, message: ... }` objects on auth mismatches instead of throwing — keep this pattern when extending the same controllers.
- A handful of `/cards/*` endpoints are intentionally public (e.g. `count/:userId`, `global/:videoId`).

**YouTube module:** `YoutubeController` exposes `GET /youtube/videos/:id`, `GET /youtube/playlists/:id`, `GET /youtube/playlists/:id/items`. `YoutubeService.getVideo` checks the `Card` table first as a free cache; only falls through to `@watchlater/youtube` on miss.

**Cron:** `apps/api/src/cron/playlist-resync.service.ts` runs every 6h (toggleable via `PLAYLIST_RESYNC_ENABLED`). Iterates `lists` where `youtubePlaylistId is not null`, refreshes titles/durations/channels, removes cards whose videos were deleted on YouTube.

### Client (`apps/web/src/`)

App Router:
- `app/page.tsx` — marketing landing at `/`.
- `app/collections/page.tsx` — collection picker (was the old `/`).
- `app/login/[userId]/page.tsx` — per-collection login.
- `app/watchlater/[userId]/page.tsx` — the kanban board.
- `app/watchlater/[userId]/queue/page.tsx` — Smart pick queue page.
- `components/Sidebar.tsx` — Lists nav (left of board).
- `components/{CreateListModal,ImportPlaylistModal,SmartPickModal}.tsx` — modals for the new flows.
- `components/{KanbanBoard,SortableItem,DroppableColumn}.tsx` — `@dnd-kit` board primitives.
- `components/FilterBar.tsx` — drives the server-side filters.
- `components/ui/` — shadcn-style Radix primitives.
- `auth/auth.tsx`, `auth/utility.ts` — JWT storage + `apiRequest` fetch helper.

**Visual identity:** Brutalist mono. Tokens declared in both `tailwind.config.ts` AND `globals.css` (`@theme` block for Tailwind v4). Palette: `paper` (#f5f1e8), `ink` (#0a0a0a), `accent` (#dc2626). Fonts: Inter (display, weight 900) + JetBrains Mono (UI / labels). Conventions: lowercase headlines, 1.5–2px ink borders, no rounded corners above 4px, only colored offset shadows (`shadow-brutal-red`).

**Important:** the client must not contain any direct `fetch` to `youtube.googleapis.com` or any reference to a YT API key. All YouTube data flows through `apiRequest('/youtube/...')`.

**List scoping:** card fetches in `watchlater/[userId]/page.tsx` must include `&listId=${activeListId}` (the Sidebar's selection). A `useEffect` watching `activeListId` re-triggers `fetchColumns`.

Virtualization: card lists use `react-window` with intentionally large overscan (see commits `5c8381a`, `408a136`) — be careful changing overscan/list height math, it's tuned for the kanban layout.
