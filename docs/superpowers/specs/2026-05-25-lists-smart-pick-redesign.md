# Lists + Smart pick + Brutalist redesign

**Date:** 2026-05-25
**Status:** approved (brainstorm phase)
**Audience:** portfolio + the author + a small circle of friends running on the same instance

---

## Why

The watchlater app today works but stalls on three product debts:

1. **One flat kanban per user.** A single collection mixes "tech deep-dives", "lofi", "things I'll watch with my partner" — same lixão it was supposed to replace.
2. **No decision aid.** With 800+ cards in a column, the app helps you *organize* but not *choose*. The user still freezes at "what do I watch?".
3. **Amateurish first impression.** The landing is the user picker. For a portfolio piece visited by recruiters and friends, the first screen needs a real product story.

This sprint addresses all three with one cohesive move: **named Lists inside a collection + a Smart pick algorithm that ranks cards across factors + a Brutalist visual redesign anchored on a proper landing page.**

## Goals

- Let a user split a collection into named Lists, each with its own 3-column kanban.
- Replace the imported-playlist primitive with Lists so there's one mental model.
- Give the user a "what should I watch right now" button that returns a single video or a queue sized to a time slot, with the ranking factors visible.
- Replace the current landing/visual with a Brutalist-mono identity that propagates across all surfaces.

## Non-goals

- Public sharing of Lists outside the instance (later).
- Recommendation across users (e.g. "your friend watched X" — covered by the existing Suggestions feature; not extended here).
- Mobile-first redesign (the current desktop-first kanban stays, just restyled).
- Monetization, growth tooling, public sign-up flow.
- Tag-style multi-list membership for cards (explicitly rejected — one List per card).

## Scope

### 1. Lists

**Concept.** A List is a user-named group of cards inside a collection. Every card belongs to exactly one List. A List can be **manual** (created and named by the user) or **YouTube-sourced** (imported from a YouTube playlist; carries the `youtubePlaylistId` for re-sync).

This unifies the two existing primitives — `Playlist` and "loose cards" — into one model.

**Per-List kanban.** Each List has its own 3-column board (`WATCH_LATER` / `WATCHING` / `WATCHED`). Switching List switches the entire board view.

**Sidebar navigation.** Lists live in a left sidebar on `/watchlater/:userId`. The sidebar shows: pinned `default` List first, then user-created Lists, then YouTube-sourced Lists (different glyph). Per-List card count next to the name. Bottom of the sidebar has `+ NEW_LIST()` and `+ IMPORT_FROM_YT()`.

**Migration.** Each existing user gets an auto-created `default` List with all their previously-loose cards moved into it. Each existing `Playlist` becomes a List with `youtubePlaylistId` set; its cards keep their `listId`.

### 2. Smart pick

Two modes sharing the same scoring engine.

**Mode A — Tonight (single video).** Modal triggered by a `▸ SMART_PICK()` button in the top nav. The user picks a time slot from chips (`15m`, `30m`, `1h`, `2h+`); the engine returns the top-scoring card whose `durationSeconds` fits the slot. The card displays a `▸ matched:` line spelling out the factors that selected it (`old (47d) · fits 30m slot · new channel today`). Buttons: `▶ WATCH NOW` (opens YouTube, moves the card to `WATCHING`) and `↻ ANOTHER` (re-rolls, excluding the previous pick).

**Empty result.** If no card fits the slot (all candidates exceed `target * 1.1`), the modal shows a `[ no fit ]` state with the two shortest candidates listed and a hint to pick a larger slot.

**Mode B — Queue (dedicated page).** `/watchlater/:userId/queue`. The user sets a target time with a slider (15m → 3h) and a scope (`all lists` or a specific List). The engine assembles a queue using a **greedy fill**: pick the highest-scoring eligible card, subtract its duration from the remaining time, repeat. Stop when no remaining candidate fits the remaining time within the `target * 1.1` ceiling, or when the queue reaches 4 items. Each item has an `↻ swap` button that replaces just that item (re-scored against the same target with the other items' video IDs in `keepVideoIds`). `▶ START QUEUE` opens the first card and walks through them as they finish. `↻ REROLL ALL` regenerates from scratch with the same time + scope settings.

**Scoring engine.** Server-side, deterministic, no ML. Each candidate card gets:

```
score = w_age * age_score
      + w_fit * duration_fit_score
      + w_cont * continuation_score
      + w_div * diversity_score
```

Default weights (sum to 1.0):

| Factor              | Weight | What                                                                                                        |
| ------------------- | -----: | ----------------------------------------------------------------------------------------------------------- |
| `age_score`         |   0.30 | `min(daysSinceAdded / 90, 1)` — older means higher.                                                         |
| `duration_fit_score`|   0.35 | `1 - abs(duration - target) / target`, clamped to `[0, 1]`. Hard reject if `duration > target * 1.1` (single-pick) or if it pushes the queue over `target * 1.1` (queue). |
| `continuation_score`|   0.25 | `1` if the card belongs to a YouTube-sourced List that already has any `WATCHING` card. `0` otherwise.       |
| `diversity_score`   |   0.10 | `1` if no card already in the queue/recent pick shares the same `channelId`. `0` otherwise.                  |

Only cards with status `WATCH_LATER` or `WATCHING` are eligible. `WATCHED` is excluded.

Weights are exported as a named constant `DEFAULT_SMART_PICK_WEIGHTS` from `apps/api/src/smart-pick/weights.ts`. Structured this way so they can be lifted to per-user settings later without an API rewrite.

### 3. Landing + Visual

**New landing.** A real marketing/identity page at `/`. Replaces the current user picker, which moves to `/collections`. Sections (single scroll):
- Hero (headline, sub, CTA `▶ OPEN_BOARD()` + secondary `LIVE_DEMO()`).
- One-line problem statement.
- Three screenshots/mockups of the board, smart pick, queue.
- A clear "made by Davi Duarte" footer with social links (mirrors the author block in the README).

**Brutalist mono identity.** Cream/off-white base (`#f5f1e8`), near-black foreground (`#0a0a0a`), single red accent (`#dc2626`). Type system: Inter Black (900) for display, JetBrains Mono for UI/labels, system sans for body. Borders: 1.5px–2px solid black, never rounded above 4px. No soft shadows; only flat colored offsets (`box-shadow: 4px 4px 0 #dc2626`). Lowercase headlines. Aesthetic references: Gumroad, Bambu Studio, hacker-aesthetic personal sites.

Surfaces redesigned in this style:
- Landing
- Login per collection
- Watchlater board (kanban + sidebar)
- Smart pick (modal + queue page)
- All modals (settings, create user, suggestions inbox)

## Data model deltas

```diff
+ model List {
+   id                String   @id @default(uuid())
+   name              String
+   userId            String
+   order             Int      @default(0)
+   isDefault         Boolean  @default(false)
+   youtubePlaylistId String?
+   thumbnailUrl      String?
+   createdAt         DateTime @default(now())
+   updatedAt         DateTime @updatedAt
+   user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
+   cards             Card[]
+
+   @@unique([userId, name])
+   @@map("lists")
+ }

  model Card {
    id              String     @id @default(uuid())
    videoId         String
    title           String
    url             String
    thumbnailUrl    String
    status          ColumnType @default(WATCH_LATER)
    order           Int        @default(0)
    userId          String
-   playlistId      String?
+   listId          String
    durationSeconds Int?
+   channelId       String?
+   channelTitle    String?
    addedAt         DateTime   @default(now())
    updatedAt       DateTime   @default(now()) @updatedAt

    user     User      @relation(fields: [userId], references: [id])
-   playlist Playlist? @relation(fields: [playlistId], references: [id])
+   list     List      @relation(fields: [listId], references: [id])

    @@unique([videoId, userId])
    @@map("cards")
  }

- model Playlist { ... }    // dropped — migrated into List rows
```

**Migration steps** (one SQL migration):
1. Create `lists` table.
2. For every distinct `userId`, insert a `(userId, "default", isDefault=true)` row.
3. Insert one `lists` row per existing `playlists` row, copying `title→name`, setting `youtubePlaylistId=playlists.playlistId` and `thumbnailUrl`.
4. Add `listId`, `channelId`, `channelTitle` to `cards` (nullable initially).
5. Backfill `cards.listId`: cards with `playlistId` get the corresponding new List id; cards without get the user's default List id.
6. Backfill `channelId`/`channelTitle` is best-effort — the next `playlist-resync` cron run populates them via the YouTube API for YouTube-sourced cards; manually-added cards stay null until the user edits/refreshes them.
7. Drop the FK to `playlists`, drop the `playlists` table, drop `cards.playlistId`.
8. Make `cards.listId` `NOT NULL` and add the new FK.

## API surface

### New / changed

```
GET    /lists                          → List[]
POST   /lists                          body: { name }                     → List
PATCH  /lists/:id                      body: { name?, order? }            → List
PATCH  /lists/:id/cards/status         body: { status: ColumnType }       → { updatedCount: number }
DELETE /lists/:id                      cards move to default List         → { ok: true }
POST   /lists/import                   body: { url }  YT playlist import  → List (replaces POST /playlists)

POST   /smart-pick/tonight             body: { timeMinutes, listId?, excludeVideoIds? }
                                       → { card, reasons: string[] }

POST   /smart-pick/queue               body: { timeMinutes, listId? }
                                       → { cards: Card[], reasons: string[][] }

POST   /smart-pick/queue/swap          body: { keepVideoIds: string[], timeMinutes, listId? }
                                       → { card, reasons: string[] }
```

### Removed

```
POST   /playlists                  →  use POST /lists/import
GET    /playlists                  →  covered by GET /lists (filter youtubePlaylistId != null)
GET    /playlists/:id              →  GET /lists/:id
GET    /playlists/:id/status       →  derived client-side from list.cards (already cheap)
PATCH  /playlists/:id/status       →  PATCH /lists/:id/cards/status  body: { status: ColumnType }
DELETE /playlists/:id              →  DELETE /lists/:id
```

The cron in `apps/api/src/cron/playlist-resync.service.ts` is updated to iterate `lists` where `youtubePlaylistId is not null`.

The new `channelId`/`channelTitle` fields are populated by the existing YouTube proxy endpoints (`/youtube/videos/:id` already pulls the snippet; the controller just persists those two fields when the result is later turned into a Card).

## UI surfaces

Mockups for reference (saved during brainstorm, in `.superpowers/brainstorm/`):
- `visual-direction.html` — landing comparison (3 directions, C selected)
- `brutalist-screens.html` — board with Lists sidebar + Smart pick modal + Queue page

**Board view (`/watchlater/:userId`).** Sidebar (180px) on the left with Lists; main board on the right with the 3 kanban columns of the selected List. Top nav has the `▸ SMART_PICK()` button.

**Smart pick modal.** Triggered from `SMART_PICK()`. Time-slot chips, single video card with reasons, `WATCH NOW` / `ANOTHER`.

**Queue page (`/watchlater/:userId/queue`).** Numbered list of cards, per-item `swap`, scope toggle (`all lists` vs current List), time slider, `START QUEUE` / `REROLL ALL`.

**Landing (`/`).** Single-scroll marketing page, ends with CTA to `/collections`.

**Collections picker (`/collections`).** What used to be `/`. Same content, restyled.

## Risks and open questions

- **Channel diversity needs `channelId`.** For existing cards we don't have it. Diversity contribution will be effectively 0 for older cards until the user re-watches/refreshes them, or the next playlist re-sync populates them for YouTube-sourced cards. This is acceptable — diversity is the smallest weight (0.10) — but should be called out in the spec.
- **Default List deletion.** A user must always have at least one List. The `default` List has `isDefault=true` and `DELETE /lists/:id` rejects with 400 if `isDefault`.
- **Migration on Easypanel.** The deploy uses `prisma db push` today; this spec requires a real migration to avoid data loss. Switching to `prisma migrate deploy` is a prerequisite for shipping.
- **Brutalist contrast on dark mode.** The current app is dark-themed; the new identity is cream. There is no dark mode in v1. Users who care can come later.
- **API breaking change.** The `/playlists/*` removal is a breaking change for the existing client. Both client and server ship together — clients aren't external — so this is acceptable.

## Implementation order (suggested for the plan phase)

1. **Schema + migration.** Land the `List` model and the safe multi-step migration first. Server still compiles and runs against the new schema while exposing the old API shape via shims if needed (or all at once if we're willing to do a coordinated client+server release — which we are).
2. **API: Lists CRUD.** `/lists/*` endpoints. Update `playlist-resync` cron to iterate Lists.
3. **API: Smart pick.** Scoring engine in `apps/api/src/smart-pick/`. Two endpoints + the queue/swap.
4. **Client: Lists wiring.** Sidebar component, list switching, "new list" / "import from YT" modals replacing the existing playlist flow. The kanban itself is unchanged structurally — it just reads `listId`-scoped data.
5. **Client: Smart pick.** Modal + queue page. Hooks into the new endpoints.
6. **Visual: Brutalist redesign.** New design tokens (CSS variables + Tailwind config), restyle every surface. Done after the structural work to avoid restyling things we then move.
7. **Landing page.** New `/` page; move user picker to `/collections`.

## Out of scope reminder

- No public sharing.
- No mobile-first work.
- No tag-based multi-list cards.
- No new auth model.
- No `WATCHED` exclusion toggle — `WATCHED` is always excluded from Smart pick.
