# YouTube Watch Later

**Organize. Track. Finish.**

[watchlater.daviduarte.com.br](https://watchlater.daviduarte.com.br)

---

## Why this project exists

YouTube's built-in Watch Later is a graveyard. Mine had 800+ videos in it before I gave up on it: no folders, no progress tracking, no way to tell a *"watch tonight"* video from a *"someday-maybe"* one, no search, no filters. Once a video lands there, you never see it again.

I wanted something closer to how I actually think about videos I save — some are in a queue, some I'm already watching across multiple sessions, some I finished and want to keep around. So I built a kanban for it.

Each card is a YouTube video pulled from the YouTube Data API. You drag it across **Watch Later → Watching → Watched**. You can filter by duration when you only have 10 minutes to spare, import a whole playlist at once, search across your backlog, and share videos with other users on the same instance.

## Preview

<p align="center">
  <img src="docs/landing.png" alt="Landing — pick a collection" width="49%" />
  <img src="docs/login.png" alt="Per-collection login" width="49%" />
</p>

## Features

- **Kanban board** — three columns (`WATCH_LATER`, `WATCHING`, `WATCHED`) with drag-and-drop reordering and a persistent `order` field per card.
- **YouTube ingestion, server-side** — paste a video URL or an entire playlist URL; the NestJS backend talks to the YouTube Data API and hydrates title, thumbnail and duration. The API key never leaves the server.
- **Background re-sync** — a NestJS cron sweeps every imported playlist every 6h, refreshing titles/durations and removing cards for videos that were deleted on YouTube.
- **Filters that matter** — full-text title search plus min/max duration and date ranges, composed server-side into a single Prisma `where`.
- **Multi-user collections** — every collection is password-protected and isolated; a "Tech talks" board lives separately from "Cooking" without juggling accounts.
- **Peer suggestions** — recommend a video to another user; they can accept it into their Watch Later or dismiss it.
- **Virtualized lists** — `react-window` keeps the board smooth past a thousand cards per column.
- **JWT auth** — stateless, per-collection sessions, signed with a strong secret enforced at boot.

## Running locally

Requirements:

- Node.js 20+
- pnpm 9+
- PostgreSQL 14+ (or use the `docker-compose` setup below)
- A [YouTube Data API v3](https://console.cloud.google.com/apis/library/youtube.googleapis.com) key

### 1. Install everything (single command)

```bash
pnpm install
```

This installs both apps and both shared packages from the monorepo root.

### 2. Configure env

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Fill `apps/api/.env`:

```env
DATABASE_URL="postgresql://watchlater:watchlater_dev@localhost:5432/watchlater?schema=public"
JWT_SECRET="generate-with-openssl-rand-base64-64"
YOUTUBE_API_KEY="your-youtube-data-api-v3-key"
FRONTEND_URL="http://localhost:7777"
PORT=4000
PLAYLIST_RESYNC_ENABLED=true
```

Fill `apps/web/.env`:

```env
NEXT_PUBLIC_API_BASE_URL="http://localhost:4000"
PORT=7777
```

### 3. Database

```bash
pnpm db:push
```

### 4. Run

```bash
pnpm dev
```

Turborepo brings up both apps in parallel: API on `http://localhost:4000`, web on `http://localhost:7777`.

### Or just `docker compose up`

```bash
JWT_SECRET=$(openssl rand -base64 64) YOUTUBE_API_KEY=your-key docker compose up
```

Starts Postgres, the API and the web in one go.

## Deploy

The intended deployment is a **split**: the Next.js app on **Vercel** (free, CDN, preview deploys) and the NestJS API + Postgres on a VPS running **Easypanel** (single VPS, no marginal cost).

### Web → Vercel

1. Import the repo as a new Vercel project.
2. Set **Root Directory** to `apps/web`. Vercel auto-detects the monorepo from `pnpm-workspace.yaml`, and `apps/web/vercel.json` pins the install / build commands so the shared packages are linked correctly.
3. Add environment variable:
   - `NEXT_PUBLIC_API_BASE_URL` → public URL of the API (e.g. `https://api.watchlater.daviduarte.com.br`).
4. Add the production domain (`watchlater.daviduarte.com.br`) under Project → Domains.

### API image → GHCR

Every push to `main` (and every `v*.*.*` tag) triggers `.github/workflows/api-image.yml`, which builds `apps/api/Dockerfile` and publishes the image to **GitHub Container Registry**:

```
ghcr.io/yuhtin/youtube-watchlater-api:latest
ghcr.io/yuhtin/youtube-watchlater-api:sha-<short>
ghcr.io/yuhtin/youtube-watchlater-api:v1.2.3      # on tag push
```

No secrets to configure — the workflow uses `GITHUB_TOKEN` with `packages: write` to authenticate.

After the first successful run, set the package visibility under  *Repo → Packages → youtube-watchlater-api → Package settings*. **Public** = Easypanel can pull anonymously; **Private** = configure GHCR credentials in Easypanel (recommended for portfolio repos).

### API + Postgres → Easypanel

In your Easypanel project, create two services:

| Service     | Type                              | Notes                                                                                                                               |
| ----------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `postgres`  | Built-in **Postgres** template    | Easypanel provisions credentials and exposes them as a service URL. Copy the connection string for the API.                         |
| `api`       | **App** → Source = Docker Image   | Image: `ghcr.io/yuhtin/youtube-watchlater-api:latest`. Exposed port: `4000`. Enable auto-redeploy on image update (Easypanel supports webhooks from GHCR). |

If the GHCR package is **private**, add a GitHub PAT (`read:packages` scope) under *Easypanel → Settings → Registries* before creating the `api` service.

Environment variables on the `api` service:

```env
DATABASE_URL=<from the postgres service>
JWT_SECRET=<openssl rand -base64 64>
YOUTUBE_API_KEY=<your YouTube Data API v3 key>
FRONTEND_URL=https://watchlater.daviduarte.com.br
PORT=4000
PLAYLIST_RESYNC_ENABLED=true
```

Then attach a domain (e.g. `api.watchlater.daviduarte.com.br`) to the `api` service and Easypanel handles HTTPS via Let's Encrypt.

**One-time migration step** after the first deploy:

```bash
# from your local machine, pointing DATABASE_URL at the Easypanel Postgres
pnpm db:push
```

(Or use `prisma migrate deploy` if you commit migrations.)

> If you'd rather have Easypanel build from source instead of pulling from GHCR, point the `api` service at the repo with **Dockerfile path** `apps/api/Dockerfile` and **build context** = repo root. The CI workflow becomes optional in that case.

### Securing the YouTube API key

Even though `YOUTUBE_API_KEY` is now server-only, restrict the key in Google Cloud Console by **HTTP referrer** or **IP address** so a leaked key can't be replayed from anywhere.

## Stack

- Next.js 15 (App Router, Turbopack)
- React 19
- TypeScript end-to-end
- Tailwind CSS v4
- `@dnd-kit` (drag and drop)
- `react-window` (virtualized lists)
- Radix UI primitives
- NestJS 11
- `@nestjs/schedule` (cron)
- Prisma 6 + PostgreSQL
- Passport JWT + bcrypt
- Turborepo + pnpm workspaces

## What's built

| Module        | What it ships                                                                          |
| ------------- | -------------------------------------------------------------------------------------- |
| Landing       | Public picker showing every collection on the instance, with avatar and card count     |
| Login         | Per-collection password screen, JWT minted on success                                  |
| Kanban board  | Drag-and-drop across three columns, virtualized, with persistent order                 |
| Filters       | Server-side title search + duration / date ranges                                      |
| Playlists     | Import a YouTube playlist as a single card that expands into its videos                |
| YouTube proxy | NestJS-side `/youtube/*` endpoints — videos, playlists, playlist items. Key never client-side. |
| Re-sync cron  | Every 6h, refreshes titles/durations and prunes deleted videos from imported playlists |
| Suggestions   | Send a video to another collection; they accept it into their Watch Later or dismiss   |
| Auth          | NestJS + Passport JWT, bcrypt password hashing, refuse-to-boot on missing secret       |

## Architecture: hybrid monorepo

The repo is a **Turborepo + pnpm** monorepo. Two apps, three shared packages.

```text
youtube-watchlater/
├── apps/
│   ├── api/                NestJS 11 — REST API + scheduled jobs
│   │   ├── src/
│   │   │   ├── auth/       JWT login + Passport strategy
│   │   │   ├── card/       CRUD, filtering, reorder
│   │   │   ├── playlist/   Imported YouTube playlist rows
│   │   │   ├── suggestion/ Peer-to-peer recommendations
│   │   │   ├── user/       Accounts & collections
│   │   │   ├── youtube/    Server-side YT Data API proxy
│   │   │   ├── cron/       @nestjs/schedule — playlist re-sync
│   │   │   ├── prisma/     Shared Prisma client wrapper
│   │   │   └── main.ts
│   │   └── Dockerfile
│   │
│   └── web/                Next.js 15 — App Router UI
│       ├── src/
│       │   ├── app/
│       │   │   ├── page.tsx                       Landing — pick a collection
│       │   │   ├── login/[userId]/page.tsx        Per-collection login
│       │   │   └── watchlater/[userId]/page.tsx   The kanban board
│       │   ├── components/
│       │   │   ├── KanbanBoard.tsx
│       │   │   ├── DroppableColumn.tsx
│       │   │   ├── SortableItem.tsx
│       │   │   ├── FilterBar.tsx
│       │   │   ├── CreateUserModal.tsx
│       │   │   └── ui/                            Radix primitives
│       │   └── auth/                              Client-side JWT helpers
│       └── Dockerfile
│
├── packages/
│   ├── db/                 Prisma schema + generated client (consumed by api)
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   └── src/index.ts
│   │
│   └── youtube/            Server-side YouTube Data API wrapper
│       └── src/
│           ├── client.ts   YouTubeClient + YouTubeApiError
│           └── parse.ts    parseDuration / parseVideoId / parsePlaylistId
│
├── docker-compose.yml
├── turbo.json
├── pnpm-workspace.yaml
└── package.json            Root scripts + tooling
```

### Data flow

```text
                 Browser (Next.js 15)
                 ┌────────────────────────────────┐
                 │  • Kanban (@dnd-kit)            │
                 │  • Virtualized lists            │
                 │  • Pastes a YouTube URL         │
                 └──────────────┬─────────────────┘
                                │
                          JWT (per collection)
                                │
                                ▼
                 ┌────────────────────────────────┐
                 │   NestJS 11 (apps/api)         │
                 │  /youtube/videos/:id           │ ──┐
                 │  /youtube/playlists/:id        │   │
                 │  /youtube/playlists/:id/items  │   │  YOUTUBE_API_KEY
                 │  /cards, /playlists, /users,   │   │  (server-only)
                 │   /auth, /suggestions          │   │
                 │  cron PlaylistResyncService    │   │
                 └────┬───────────────────────┬───┘   │
                      │                       │       │
                      │ Prisma                │       ▼
                      ▼              ┌────────────────────────────┐
                  PostgreSQL          │  youtube.googleapis.com   │
                                      └────────────────────────────┘
```

The deliberate split: **the browser never talks to YouTube anymore.** The `YOUTUBE_API_KEY` is server-only (no `NEXT_PUBLIC_` prefix). The web app posts a YouTube URL to the API and gets back hydrated card data; the API key never sits in the bundle.

## Why I built it this way

A few decisions worth calling out:

- **NestJS handles HTTP + cron in the same app.** Splitting into a separate worker would have been overkill — the cron is a single service, and reusing the same Prisma client and `YoutubeService` was free.
- **`packages/youtube` is a tiny client, not a full SDK.** It only exposes what the app needs (`getVideo`, `getPlaylist`, `getPlaylistItems`, plus duration / URL parsing). Both the HTTP module and the cron consume it.
- **Per-collection auth, not per-account.** Each "user" is really a *collection* with a password. I wanted to be able to share a board with someone without giving them my account, and to keep my "study" board out of view when I open my "casual" one.
- **`react-window` + `@dnd-kit`.** Combining virtualization with drag-and-drop is fiddly — overscan has to be high enough that the drag target stays mounted as the list scrolls.
- **Three columns, not freeform tags.** A kanban is a forcing function. Tags let me defer the decision; columns force me to actually move a video toward "watched."

## Roadmap

| Idea                       | Why                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------ |
| Real landing page          | Today the landing *is* the user picker; the project needs a product story up front   |
| Beyond kanban              | Shelves by topic, a "Tonight" queue, calendar-style watch plans                      |
| Study plans                | Chain videos into a sequenced learning path with checkpoints                         |
| Smart recommendations      | Surface what to watch next from *your own backlog* based on duration and freshness   |
| Gamification               | Streaks, watch goals, hours-watched and channels-covered stats                       |
| Lists inside a collection  | Named playlists *within* a collection, not just three fixed columns                  |
| Notifications              | Push when a suggestion arrives or the cron deletes one of your cards                 |

## Limitations

- The kanban shape is opinionated. If you want shelves, folders or a flat list, you'd have to fork the columns logic.
- Suggestions don't have a notification system yet — you only see incoming ones when you open the inbox.
- No mobile-first redesign yet — the kanban works on phones but is clearly desktop-first.

## License

MIT
