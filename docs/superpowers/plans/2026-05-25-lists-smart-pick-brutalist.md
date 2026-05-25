# Lists + Smart pick + Brutalist redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Lists (named groups inside a collection), a server-side Smart pick engine (Tonight modal + Queue page), and a Brutalist-mono visual redesign with a real landing page.

**Architecture:** Server-side scoring on NestJS reading from a new `List` table that subsumes the old `Playlist` model. The web client keeps Next.js App Router but gets a sidebar for Lists, a smart-pick modal, a dedicated `/queue` page, and a new visual identity. One Prisma migration handles the schema change end-to-end.

**Tech Stack:** NestJS 11 · Prisma 6 · Postgres 16 · Next.js 15 (App Router, Turbopack) · React 19 · Tailwind v4 · `@dnd-kit` · `react-window` · Jest (API). No new runtime deps.

**Spec:** [`docs/superpowers/specs/2026-05-25-lists-smart-pick-redesign.md`](../specs/2026-05-25-lists-smart-pick-redesign.md)

---

## Conventions for every task

- The API uses Jest. Every API task writes a failing spec first.
- The web app has no test runner — verify with `pnpm --filter @watchlater/web typecheck` and, for UI changes, a screenshot via Playwright Chrome (`mcp__plugin_playwright_playwright__browser_take_screenshot`) at the relevant URL.
- After every task: `git commit` with a conventional-commits style message. **Never** use `Co-Authored-By: Claude`.
- All file paths in this plan are absolute from repo root.

---

## Phase 1 — Schema + migration

### Task 1.1: Switch the workflow from `prisma db push` to `prisma migrate`

The spec calls out that this project currently uses `db push`. Lists migration must be a real migration so prod data survives. Switch the tooling first.

**Files:**
- Modify: `packages/db/package.json`
- Modify: `package.json` (root)

- [ ] **Step 1: Update package scripts**

In `packages/db/package.json`, change the `push` script and add `migrate:dev`/`migrate:deploy`/`migrate:status` (they already exist — verify they still match):

```json
"scripts": {
  "build": "tsc",
  "dev": "tsc --watch --preserveWatchOutput",
  "generate": "prisma generate",
  "push": "prisma db push",
  "migrate:dev": "prisma migrate dev",
  "migrate:deploy": "prisma migrate deploy",
  "migrate:status": "prisma migrate status",
  "studio": "prisma studio",
  "postinstall": "prisma generate"
}
```

In root `package.json`, replace the `db:push` shortcut and add a `db:migrate` one:

```json
"db:migrate": "pnpm --filter @watchlater/db migrate:deploy",
"db:migrate:dev": "pnpm --filter @watchlater/db migrate:dev",
"db:push": "pnpm --filter @watchlater/db push"
```

Keep `db:push` for emergency local resets but the dev/deploy path is now `db:migrate*`.

- [ ] **Step 2: Verify nothing broke**

Run: `pnpm --filter @watchlater/db migrate:status`
Expected: prints the existing migration history (the `prisma/migrations/` directory already has 8 migrations).

- [ ] **Step 3: Commit**

```bash
git add packages/db/package.json package.json
git commit -m "chore(db): wire prisma migrate scripts at root"
```

---

### Task 1.2: Add `List` model, channel fields, drop `Playlist` (schema)

**Files:**
- Modify: `packages/db/prisma/schema.prisma`

- [ ] **Step 1: Edit `packages/db/prisma/schema.prisma`**

Replace the `Playlist` model and the relevant lines of `Card` and `User` with:

```prisma
model User {
  id                  String       @id @default(uuid())
  username            String       @unique
  password            String
  imageUrl            String?
  createdAt           DateTime     @default(now())
  updatedAt           DateTime     @updatedAt
  cards               Card[]
  lists               List[]
  sentSuggestions     Suggestion[] @relation("SentSuggestions")
  receivedSuggestions Suggestion[] @relation("ReceivedSuggestions")
}

model List {
  id                String   @id @default(uuid())
  name              String
  userId            String
  order             Int      @default(0)
  isDefault         Boolean  @default(false)
  youtubePlaylistId String?
  thumbnailUrl      String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  user  User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  cards Card[]

  @@unique([userId, name])
  @@map("lists")
}

model Card {
  id              String     @id @default(uuid())
  videoId         String
  title           String
  url             String
  thumbnailUrl    String
  status          ColumnType @default(WATCH_LATER)
  order           Int        @default(0)
  userId          String
  listId          String
  durationSeconds Int?
  channelId       String?
  channelTitle    String?
  addedAt         DateTime   @default(now())
  updatedAt       DateTime   @default(now()) @updatedAt

  user User @relation(fields: [userId], references: [id])
  list List @relation(fields: [listId], references: [id])

  @@unique([videoId, userId])
  @@map("cards")
}
```

Delete the existing `model Playlist { ... }` block entirely.

- [ ] **Step 2: Generate but DO NOT run a migration yet**

We need to write the migration SQL by hand to control the data-preserving order. Skip `prisma migrate dev` for now.

Run: `pnpm --filter @watchlater/db generate`
Expected: prints "Generated Prisma Client" — no error about missing migration.

- [ ] **Step 3: Commit (schema only)**

```bash
git add packages/db/prisma/schema.prisma
git commit -m "feat(db): introduce List model, deprecate Playlist, add channel fields"
```

---

### Task 1.3: Write the data-preserving migration

**Files:**
- Create: `packages/db/prisma/migrations/20260525000000_lists_and_channels/migration.sql`

- [ ] **Step 1: Create the migration file**

Make the directory: `mkdir -p packages/db/prisma/migrations/20260525000000_lists_and_channels`

Write `packages/db/prisma/migrations/20260525000000_lists_and_channels/migration.sql`:

```sql
-- 1. Create the lists table
CREATE TABLE "lists" (
    "id"                TEXT NOT NULL,
    "name"              TEXT NOT NULL,
    "userId"            TEXT NOT NULL,
    "order"             INTEGER NOT NULL DEFAULT 0,
    "isDefault"         BOOLEAN NOT NULL DEFAULT false,
    "youtubePlaylistId" TEXT,
    "thumbnailUrl"      TEXT,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lists_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "lists_userId_name_key" ON "lists"("userId", "name");

ALTER TABLE "lists" ADD CONSTRAINT "lists_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. Add the new card fields (nullable for backfill)
ALTER TABLE "cards"
    ADD COLUMN "listId"       TEXT,
    ADD COLUMN "channelId"    TEXT,
    ADD COLUMN "channelTitle" TEXT;

-- 3. Create a "default" List for every user
INSERT INTO "lists" ("id", "name", "userId", "isDefault", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'default', "id", true, NOW(), NOW()
FROM "User";

-- 4. Convert existing playlists into Lists
INSERT INTO "lists" ("id", "name", "userId", "youtubePlaylistId", "thumbnailUrl", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "title", "userId", "playlistId", "thumbnailUrl", "createdAt", "updatedAt"
FROM "playlists";

-- 5. Backfill cards.listId
--    Cards with a playlistId → matching new List by (userId, youtubePlaylistId=playlists.playlistId)
UPDATE "cards" c
SET "listId" = l."id"
FROM "playlists" p
JOIN "lists" l
  ON l."userId" = p."userId"
 AND l."youtubePlaylistId" = p."playlistId"
WHERE c."playlistId" = p."id";

--    Remaining loose cards → user's default List
UPDATE "cards" c
SET "listId" = l."id"
FROM "lists" l
WHERE c."userId" = l."userId"
  AND l."isDefault" = true
  AND c."listId" IS NULL;

-- 6. Make listId NOT NULL, add FK, drop the old playlist FK + column
ALTER TABLE "cards" ALTER COLUMN "listId" SET NOT NULL;

ALTER TABLE "cards" ADD CONSTRAINT "cards_listId_fkey"
    FOREIGN KEY ("listId") REFERENCES "lists"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "cards" DROP CONSTRAINT IF EXISTS "cards_playlistId_fkey";
ALTER TABLE "cards" DROP COLUMN "playlistId";

-- 7. Drop the playlists table
DROP TABLE "playlists";
```

- [ ] **Step 2: Mark this migration as the new baseline**

Prisma needs to know this migration is "applied" when run against a fresh DB. The `migration_lock.toml` already exists. No extra step — the file's mere presence enrolls it on next `migrate dev`/`deploy`.

- [ ] **Step 3: Apply the migration against the local dev database**

If you have a local Postgres with old data, take a snapshot first:
```bash
pg_dump -h localhost -U <youruser> -d <yourdb> -Fc -f /tmp/pre-migration.dump
```

Run: `pnpm --filter @watchlater/db migrate:dev --name lists_and_channels`
Expected: Prisma applies the new migration, reports "All migrations have been successfully applied". Verify with `pnpm --filter @watchlater/db studio` that:
- `lists` table exists with one row per user named `default`
- Old playlists became Lists with `youtubePlaylistId` set
- Every `cards` row has a non-null `listId`

If the migration errors out, drop the local DB (`dropdb` then `createdb`) and re-run.

- [ ] **Step 4: Commit**

```bash
git add packages/db/prisma/migrations/20260525000000_lists_and_channels/migration.sql
git commit -m "feat(db): migrate playlists into lists, add channel fields"
```

---

## Phase 2 — API: Lists CRUD

### Task 2.1: Scaffold the `list` Nest module

**Files:**
- Create: `apps/api/src/list/list.module.ts`
- Create: `apps/api/src/list/list.service.ts`
- Create: `apps/api/src/list/list.controller.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Create empty service/controller/module stubs**

`apps/api/src/list/list.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ListService {
    constructor(private readonly prisma: PrismaService) { }
}
```

`apps/api/src/list/list.controller.ts`:

```ts
import { Controller, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ListService } from './list.service';

@UseGuards(JwtAuthGuard)
@Controller('lists')
export class ListController {
    constructor(private readonly listService: ListService) { }
}
```

`apps/api/src/list/list.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { YoutubeModule } from '../youtube/youtube.module';
import { ListController } from './list.controller';
import { ListService } from './list.service';

@Module({
    imports: [AuthModule, YoutubeModule],
    controllers: [ListController],
    providers: [ListService],
    exports: [ListService],
})
export class ListModule { }
```

- [ ] **Step 2: Register the module**

In `apps/api/src/app.module.ts`, import and add `ListModule` to the `imports` array.

- [ ] **Step 3: Verify the app still boots**

Run: `pnpm --filter @watchlater/api build`
Expected: no compile errors.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/list apps/api/src/app.module.ts
git commit -m "feat(api): scaffold list module"
```

---

### Task 2.2: `ListService.findAllByUser` (TDD)

**Files:**
- Create: `apps/api/src/list/list.service.spec.ts`
- Modify: `apps/api/src/list/list.service.ts`

- [ ] **Step 1: Write the failing test**

`apps/api/src/list/list.service.spec.ts`:

```ts
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ListService } from './list.service';

describe('ListService', () => {
    let service: ListService;
    let prisma: { list: { findMany: jest.Mock } };

    beforeEach(async () => {
        prisma = { list: { findMany: jest.fn() } };
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ListService,
                { provide: PrismaService, useValue: prisma },
            ],
        }).compile();
        service = module.get(ListService);
    });

    describe('findAllByUser', () => {
        it('returns the user\'s lists ordered with default first, then by order', async () => {
            prisma.list.findMany.mockResolvedValue([
                { id: '1', name: 'default', isDefault: true, order: 0, cards: [] },
                { id: '2', name: 'tech', isDefault: false, order: 1, cards: [] },
            ]);

            const result = await service.findAllByUser('user-1');

            expect(prisma.list.findMany).toHaveBeenCalledWith({
                where: { userId: 'user-1' },
                orderBy: [{ isDefault: 'desc' }, { order: 'asc' }, { createdAt: 'asc' }],
                include: {
                    _count: { select: { cards: true } },
                },
            });
            expect(result).toHaveLength(2);
        });
    });
});
```

- [ ] **Step 2: Run test, verify FAIL**

Run: `pnpm --filter @watchlater/api test -- list.service.spec.ts`
Expected: FAIL — `service.findAllByUser is not a function`.

- [ ] **Step 3: Implement**

Add to `apps/api/src/list/list.service.ts`:

```ts
async findAllByUser(userId: string) {
    return this.prisma.list.findMany({
        where: { userId },
        orderBy: [{ isDefault: 'desc' }, { order: 'asc' }, { createdAt: 'asc' }],
        include: {
            _count: { select: { cards: true } },
        },
    });
}
```

- [ ] **Step 4: Run test, verify PASS**

Run: `pnpm --filter @watchlater/api test -- list.service.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/list/list.service.ts apps/api/src/list/list.service.spec.ts
git commit -m "feat(api): list.findAllByUser"
```

---

### Task 2.3: `ListService.create` (manual list)

**Files:**
- Modify: `apps/api/src/list/list.service.ts`
- Modify: `apps/api/src/list/list.service.spec.ts`

- [ ] **Step 1: Add failing test**

Append to `list.service.spec.ts` inside the `describe('ListService', ...)`:

```ts
describe('create', () => {
    it('creates a list with order = max(existing) + 1', async () => {
        prisma.list = { ...prisma.list, aggregate: jest.fn(), create: jest.fn() } as any;
        (prisma.list as any).aggregate.mockResolvedValue({ _max: { order: 3 } });
        (prisma.list as any).create.mockResolvedValue({
            id: 'new', name: 'chill', userId: 'u1', order: 4, isDefault: false,
        });

        const result = await service.create('u1', { name: 'chill' });

        expect((prisma.list as any).create).toHaveBeenCalledWith({
            data: { name: 'chill', userId: 'u1', order: 4 },
        });
        expect(result.name).toBe('chill');
    });

    it('rejects empty names', async () => {
        await expect(service.create('u1', { name: '' })).rejects.toThrow();
    });
});
```

- [ ] **Step 2: Run, verify FAIL**

Run: `pnpm --filter @watchlater/api test -- list.service.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Add to `list.service.ts`:

```ts
import { BadRequestException } from '@nestjs/common';

// inside class
async create(userId: string, dto: { name: string }) {
    const name = dto.name?.trim();
    if (!name) {
        throw new BadRequestException('List name is required');
    }

    const { _max } = await this.prisma.list.aggregate({
        where: { userId },
        _max: { order: true },
    });

    return this.prisma.list.create({
        data: { name, userId, order: (_max.order ?? -1) + 1 },
    });
}
```

(Update the imports in the spec's `useValue: prisma` accordingly — the test already declares `aggregate` and `create`.)

- [ ] **Step 4: Run, verify PASS**

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/list/list.service.ts apps/api/src/list/list.service.spec.ts
git commit -m "feat(api): list.create"
```

---

### Task 2.4: `ListService.rename` and `ListService.reorder`

**Files:**
- Modify: `apps/api/src/list/list.service.ts`
- Modify: `apps/api/src/list/list.service.spec.ts`

- [ ] **Step 1: Add failing tests**

```ts
describe('update', () => {
    beforeEach(() => {
        (prisma as any).list.findFirst = jest.fn();
        (prisma as any).list.update = jest.fn();
    });

    it('renames a list when owner matches', async () => {
        (prisma as any).list.findFirst.mockResolvedValue({ id: 'l1', userId: 'u1', isDefault: false });
        (prisma as any).list.update.mockResolvedValue({ id: 'l1', name: 'renamed', userId: 'u1' });

        await service.update('u1', 'l1', { name: 'renamed' });

        expect((prisma as any).list.update).toHaveBeenCalledWith({
            where: { id: 'l1' },
            data: { name: 'renamed' },
        });
    });

    it('refuses to rename the default list', async () => {
        (prisma as any).list.findFirst.mockResolvedValue({ id: 'l1', userId: 'u1', isDefault: true });
        await expect(service.update('u1', 'l1', { name: 'x' })).rejects.toThrow(/default/i);
    });

    it('throws NotFound when the list isn\'t owned by the user', async () => {
        (prisma as any).list.findFirst.mockResolvedValue(null);
        await expect(service.update('u1', 'l1', { name: 'x' })).rejects.toThrow();
    });
});
```

- [ ] **Step 2: Run, verify FAIL**

- [ ] **Step 3: Implement**

```ts
import { ForbiddenException, NotFoundException } from '@nestjs/common';

async update(userId: string, listId: string, dto: { name?: string; order?: number }) {
    const list = await this.prisma.list.findFirst({
        where: { id: listId, userId },
    });
    if (!list) throw new NotFoundException('List not found');

    if (dto.name !== undefined) {
        const name = dto.name.trim();
        if (!name) throw new BadRequestException('Name cannot be empty');
        if (list.isDefault) throw new ForbiddenException('Cannot rename the default list');
    }

    return this.prisma.list.update({
        where: { id: listId },
        data: {
            ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
            ...(dto.order !== undefined ? { order: dto.order } : {}),
        },
    });
}
```

- [ ] **Step 4: Run, verify PASS**

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(api): list.update (rename + reorder)"
```

---

### Task 2.5: `ListService.delete` (cards → default)

**Files:**
- Modify: `apps/api/src/list/list.service.ts`
- Modify: `apps/api/src/list/list.service.spec.ts`

- [ ] **Step 1: Add failing tests**

```ts
describe('delete', () => {
    beforeEach(() => {
        (prisma as any).list.findFirst = jest.fn();
        (prisma as any).list.delete = jest.fn();
        (prisma as any).card = { updateMany: jest.fn() };
        (prisma as any).$transaction = jest.fn(async (fn: any) => fn(prisma));
    });

    it('refuses to delete the default list', async () => {
        (prisma as any).list.findFirst.mockResolvedValue({ id: 'l1', userId: 'u1', isDefault: true });
        await expect(service.delete('u1', 'l1')).rejects.toThrow(/default/i);
    });

    it('moves cards to the default list, then deletes the list', async () => {
        (prisma as any).list.findFirst
            .mockResolvedValueOnce({ id: 'l1', userId: 'u1', isDefault: false })
            .mockResolvedValueOnce({ id: 'default-l', userId: 'u1', isDefault: true });

        await service.delete('u1', 'l1');

        expect((prisma as any).card.updateMany).toHaveBeenCalledWith({
            where: { listId: 'l1', userId: 'u1' },
            data: { listId: 'default-l' },
        });
        expect((prisma as any).list.delete).toHaveBeenCalledWith({ where: { id: 'l1' } });
    });
});
```

- [ ] **Step 2: Run, verify FAIL**

- [ ] **Step 3: Implement**

```ts
async delete(userId: string, listId: string) {
    const list = await this.prisma.list.findFirst({ where: { id: listId, userId } });
    if (!list) throw new NotFoundException('List not found');
    if (list.isDefault) throw new ForbiddenException('Cannot delete the default list');

    const defaultList = await this.prisma.list.findFirst({
        where: { userId, isDefault: true },
    });
    if (!defaultList) {
        throw new NotFoundException('Default list missing — data is inconsistent');
    }

    await this.prisma.$transaction(async (tx) => {
        await tx.card.updateMany({
            where: { listId, userId },
            data: { listId: defaultList.id },
        });
        await tx.list.delete({ where: { id: listId } });
    });

    return { ok: true as const };
}
```

- [ ] **Step 4: Run, verify PASS**

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(api): list.delete moves cards to default before drop"
```

---

### Task 2.6: `ListService.importFromYoutube`

**Files:**
- Modify: `apps/api/src/list/list.service.ts`
- Modify: `apps/api/src/list/list.service.spec.ts`

- [ ] **Step 1: Add failing test**

```ts
describe('importFromYoutube', () => {
    let youtube: { getPlaylist: jest.Mock; getPlaylistItems: jest.Mock };
    beforeEach(() => {
        youtube = {
            getPlaylist: jest.fn(),
            getPlaylistItems: jest.fn(),
        };
        (service as any).youtube = youtube;
        (prisma as any).list.findFirst = jest.fn();
        (prisma as any).list.create = jest.fn();
        (prisma as any).list.aggregate = jest.fn().mockResolvedValue({ _max: { order: 0 } });
        (prisma as any).card = {
            createMany: jest.fn(),
            findFirst: jest.fn().mockResolvedValue(null),
        };
        (prisma as any).$transaction = jest.fn(async (fn: any) => fn(prisma));
    });

    it('creates a list + cards from a YouTube playlist URL', async () => {
        youtube.getPlaylist.mockResolvedValue({
            playlistId: 'PL123', title: 'Rust Talks', thumbnailUrl: 'thumb',
        });
        youtube.getPlaylistItems.mockResolvedValue([
            { videoId: 'v1', title: 'a', thumbnailUrl: 't', durationSeconds: 600, url: 'u1', channelId: 'c1', channelTitle: 'C1' },
            { videoId: 'v2', title: 'b', thumbnailUrl: 't', durationSeconds: 900, url: 'u2', channelId: 'c1', channelTitle: 'C1' },
        ]);
        (prisma as any).list.findFirst.mockResolvedValue(null);
        (prisma as any).list.create.mockResolvedValue({
            id: 'l-new', name: 'Rust Talks', userId: 'u1', youtubePlaylistId: 'PL123',
        });

        const result = await service.importFromYoutube('u1', 'PL123');

        expect(youtube.getPlaylist).toHaveBeenCalledWith('PL123');
        expect((prisma as any).list.create).toHaveBeenCalled();
        expect((prisma as any).card.createMany).toHaveBeenCalled();
        expect(result.id).toBe('l-new');
    });

    it('rejects when the user already imported that playlist', async () => {
        (prisma as any).list.findFirst.mockResolvedValue({ id: 'existing', youtubePlaylistId: 'PL123' });
        await expect(service.importFromYoutube('u1', 'PL123')).rejects.toThrow(/already/i);
    });
});
```

- [ ] **Step 2: Run, verify FAIL**

- [ ] **Step 3: Implement**

```ts
// Inject YoutubeService in the constructor:
// constructor(private readonly prisma: PrismaService, private readonly youtube: YoutubeService) {}

import { ConflictException } from '@nestjs/common';
import { YoutubeService } from '../youtube/youtube.service';

async importFromYoutube(userId: string, playlistId: string) {
    const existing = await this.prisma.list.findFirst({
        where: { userId, youtubePlaylistId: playlistId },
    });
    if (existing) {
        throw new ConflictException('Playlist already imported');
    }

    const meta = await this.youtube.getPlaylist(playlistId);
    if (!meta) throw new NotFoundException('YouTube playlist not found');

    const items = await this.youtube.getPlaylistItems(playlistId);

    const { _max } = await this.prisma.list.aggregate({
        where: { userId },
        _max: { order: true },
    });

    return this.prisma.$transaction(async (tx) => {
        const list = await tx.list.create({
            data: {
                name: meta.title,
                userId,
                order: (_max.order ?? -1) + 1,
                youtubePlaylistId: meta.playlistId,
                thumbnailUrl: meta.thumbnailUrl,
            },
        });

        if (items.length > 0) {
            await tx.card.createMany({
                data: items.map((v, i) => ({
                    videoId: v.videoId,
                    title: v.title,
                    url: v.url,
                    thumbnailUrl: v.thumbnailUrl,
                    durationSeconds: v.durationSeconds,
                    channelId: v.channelId ?? null,
                    channelTitle: v.channelTitle ?? null,
                    userId,
                    listId: list.id,
                    order: i,
                })),
                skipDuplicates: true,
            });
        }

        return list;
    });
}
```

Note: this depends on `YouTubeVideo` carrying `channelId`/`channelTitle` — extended in Task 3.1.

- [ ] **Step 4: Run, verify PASS**

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(api): list.importFromYoutube"
```

---

### Task 2.7: `ListService.bulkUpdateCardStatus`

**Files:**
- Modify: `apps/api/src/list/list.service.ts`
- Modify: `apps/api/src/list/list.service.spec.ts`

- [ ] **Step 1: Add failing test**

```ts
describe('bulkUpdateCardStatus', () => {
    it('updates every card of the list to the given status', async () => {
        (prisma as any).list.findFirst = jest.fn().mockResolvedValue({ id: 'l1', userId: 'u1' });
        (prisma as any).card.updateMany = jest.fn().mockResolvedValue({ count: 7 });

        const result = await service.bulkUpdateCardStatus('u1', 'l1', 'WATCHED');

        expect((prisma as any).card.updateMany).toHaveBeenCalledWith({
            where: { listId: 'l1', userId: 'u1' },
            data: { status: 'WATCHED' },
        });
        expect(result.updatedCount).toBe(7);
    });
});
```

- [ ] **Step 2: Run, FAIL**
- [ ] **Step 3: Implement**

```ts
async bulkUpdateCardStatus(userId: string, listId: string, status: ColumnType) {
    const list = await this.prisma.list.findFirst({ where: { id: listId, userId } });
    if (!list) throw new NotFoundException('List not found');

    const res = await this.prisma.card.updateMany({
        where: { listId, userId },
        data: { status },
    });
    return { updatedCount: res.count };
}
```

Add import: `import { ColumnType } from '@watchlater/db';`

- [ ] **Step 4: Run, PASS**
- [ ] **Step 5: Commit**

```bash
git commit -am "feat(api): list.bulkUpdateCardStatus"
```

---

### Task 2.8: `ListController` — wire all endpoints

**Files:**
- Modify: `apps/api/src/list/list.controller.ts`

- [ ] **Step 1: Replace the controller body**

```ts
import { Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ColumnType } from '@watchlater/db';
import { parsePlaylistId } from '@watchlater/youtube';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ListService } from './list.service';

@UseGuards(JwtAuthGuard)
@Controller('lists')
export class ListController {
    constructor(private readonly listService: ListService) { }

    @Get()
    findAll(@Req() req: any) {
        return this.listService.findAllByUser(req.user.userId);
    }

    @Post()
    create(@Body() body: { name: string }, @Req() req: any) {
        return this.listService.create(req.user.userId, { name: body.name });
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() body: { name?: string; order?: number }, @Req() req: any) {
        return this.listService.update(req.user.userId, id, body);
    }

    @Patch(':id/cards/status')
    bulkStatus(@Param('id') id: string, @Body() body: { status: ColumnType }, @Req() req: any) {
        return this.listService.bulkUpdateCardStatus(req.user.userId, id, body.status);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @Req() req: any) {
        return this.listService.delete(req.user.userId, id);
    }

    @Post('import')
    async importFromYoutube(@Body() body: { url: string }, @Req() req: any) {
        const playlistId = parsePlaylistId(body.url);
        if (!playlistId) throw new NotFoundException('Invalid playlist URL');
        return this.listService.importFromYoutube(req.user.userId, playlistId);
    }
}
```

- [ ] **Step 2: Build and confirm no compile errors**

Run: `pnpm --filter @watchlater/api build`

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(api): list controller endpoints"
```

---

### Task 2.9: Update `CardService` to be `listId`-scoped

**Files:**
- Modify: `apps/api/src/card/card.service.ts`
- Modify: `apps/api/src/card/card.controller.ts`

The current code references `playlistId` on cards. Replace those references with `listId`. Also: a card created without an explicit `listId` must land in the user's default List.

- [ ] **Step 1: Read the file**

Read `apps/api/src/card/card.service.ts` end to end before editing.

- [ ] **Step 2: Replace `playlistId` with `listId`**

Every `playlistId` reference becomes `listId`. Update query shapes accordingly.

In `card.service.ts`, the `create` method must default the `listId`:

```ts
async create(data: any) {
    let listId = data.listId;
    if (!listId) {
        const defaultList = await this.prisma.list.findFirst({
            where: { userId: data.userId, isDefault: true },
        });
        if (!defaultList) throw new Error('Default list missing');
        listId = defaultList.id;
    }
    // ... rest unchanged, but use `listId` instead of `playlistId`
}
```

In `card.controller.ts`, every method body that referenced `playlistId` updates the same way. The `GET /cards` endpoint also accepts an optional `listId` query param now.

- [ ] **Step 3: Update existing card tests if any**

Run: `pnpm --filter @watchlater/api test`
Expected: all green.

- [ ] **Step 4: Commit**

```bash
git commit -am "refactor(api): card service is listId-scoped"
```

---

### Task 2.10: Delete `PlaylistModule`, update `app.module`

**Files:**
- Delete: `apps/api/src/playlist/` (whole directory)
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Delete the directory**

Run:
```bash
git rm -r apps/api/src/playlist
```

- [ ] **Step 2: Remove `PlaylistModule` from `apps/api/src/app.module.ts`**

Delete the import line and the entry in the `imports: []` array.

- [ ] **Step 3: Build**

Run: `pnpm --filter @watchlater/api build`
Expected: no compile errors. If there are, they reveal lingering `PlaylistService` references — fix them.

- [ ] **Step 4: Commit**

```bash
git commit -am "refactor(api): drop PlaylistModule (subsumed by ListModule)"
```

---

### Task 2.11: Update `playlist-resync` cron to iterate Lists

**Files:**
- Modify: `apps/api/src/cron/playlist-resync.service.ts`
- Modify: `apps/api/src/cron/cron.module.ts` (rename file optionally)

- [ ] **Step 1: Edit the cron service**

Replace every `playlist` reference with `list where youtubePlaylistId != null`:

```ts
@Cron(CronExpression.EVERY_6_HOURS)
async resyncAll() {
    if (process.env.PLAYLIST_RESYNC_ENABLED === 'false') return;

    const lists = await this.prisma.list.findMany({
        where: { youtubePlaylistId: { not: null } },
        select: { id: true, youtubePlaylistId: true, userId: true, name: true },
    });

    for (const list of lists) {
        try {
            await this.resyncOne(list.id, list.youtubePlaylistId!, list.userId);
        } catch (err) {
            if (err instanceof YouTubeApiError && err.status === 404) {
                this.logger.warn(`Playlist ${list.youtubePlaylistId} (list ${list.name}) was deleted on YouTube — skipping`);
            } else {
                this.logger.error(`Failed to resync list ${list.id}: ${err instanceof Error ? err.message : String(err)}`);
            }
        }
    }
}

private async resyncOne(listId: string, youtubePlaylistId: string, userId: string) {
    const remoteItems = await this.youtube.getPlaylistItems(youtubePlaylistId);
    const remoteIds = new Set(remoteItems.map((v) => v.videoId));

    const localCards = await this.prisma.card.findMany({
        where: { listId, userId },
        select: { id: true, videoId: true, title: true, durationSeconds: true, thumbnailUrl: true, channelId: true },
    });

    for (const card of localCards) {
        if (!remoteIds.has(card.videoId)) {
            await this.prisma.card.delete({ where: { id: card.id } });
            continue;
        }
        const remote = remoteItems.find((v) => v.videoId === card.videoId)!;
        const needsUpdate =
            remote.title !== card.title ||
            remote.durationSeconds !== card.durationSeconds ||
            remote.thumbnailUrl !== card.thumbnailUrl ||
            (remote.channelId && remote.channelId !== card.channelId);

        if (needsUpdate) {
            await this.prisma.card.update({
                where: { id: card.id },
                data: {
                    title: remote.title,
                    durationSeconds: remote.durationSeconds,
                    thumbnailUrl: remote.thumbnailUrl,
                    channelId: remote.channelId ?? null,
                    channelTitle: remote.channelTitle ?? null,
                },
            });
        }
    }
}
```

- [ ] **Step 2: Build**

Run: `pnpm --filter @watchlater/api build`

- [ ] **Step 3: Commit**

```bash
git commit -am "refactor(api): cron iterates Lists, backfills channelId/title"
```

---

## Phase 3 — packages/youtube: expose channel fields

### Task 3.1: Add `channelId` and `channelTitle` to `YouTubeVideo`

**Files:**
- Modify: `packages/youtube/src/client.ts`

- [ ] **Step 1: Update the interface and the snippet pickers**

```ts
export interface YouTubeVideo {
    videoId: string;
    title: string;
    thumbnailUrl: string;
    durationSeconds: number;
    url: string;
    channelId?: string;
    channelTitle?: string;
}
```

In every place that constructs a `YouTubeVideo` (inside `getVideo`, `getVideosByIds`, `getPlaylistItems` via `getVideosByIds`), include:

```ts
channelId: item.snippet.channelId,
channelTitle: item.snippet.channelTitle,
```

The YouTube `snippet` already returns these — no extra API call needed.

- [ ] **Step 2: Build the package**

Run: `pnpm --filter @watchlater/youtube build`

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(youtube): expose channelId and channelTitle"
```

---

## Phase 4 — API: Smart pick

### Task 4.1: Scaffold smart-pick module + weights

**Files:**
- Create: `apps/api/src/smart-pick/weights.ts`
- Create: `apps/api/src/smart-pick/smart-pick.module.ts`
- Create: `apps/api/src/smart-pick/smart-pick.service.ts`
- Create: `apps/api/src/smart-pick/smart-pick.controller.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Create the weights file**

`apps/api/src/smart-pick/weights.ts`:

```ts
export interface SmartPickWeights {
    age: number;
    fit: number;
    continuation: number;
    diversity: number;
}

export const DEFAULT_SMART_PICK_WEIGHTS: SmartPickWeights = {
    age: 0.30,
    fit: 0.35,
    continuation: 0.25,
    diversity: 0.10,
};
```

- [ ] **Step 2: Create the stubs**

`apps/api/src/smart-pick/smart-pick.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SmartPickService {
    constructor(private readonly prisma: PrismaService) { }
}
```

`apps/api/src/smart-pick/smart-pick.controller.ts`:

```ts
import { Controller, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SmartPickService } from './smart-pick.service';

@UseGuards(JwtAuthGuard)
@Controller('smart-pick')
export class SmartPickController {
    constructor(private readonly smartPick: SmartPickService) { }
}
```

`apps/api/src/smart-pick/smart-pick.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SmartPickController } from './smart-pick.controller';
import { SmartPickService } from './smart-pick.service';

@Module({
    imports: [AuthModule],
    controllers: [SmartPickController],
    providers: [SmartPickService],
})
export class SmartPickModule { }
```

Register in `app.module.ts`.

- [ ] **Step 3: Build**

Run: `pnpm --filter @watchlater/api build`

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/smart-pick apps/api/src/app.module.ts
git commit -m "feat(api): scaffold smart-pick module + weights"
```

---

### Task 4.2: Scoring engine (`scoreCard`)

**Files:**
- Create: `apps/api/src/smart-pick/scoring.ts`
- Create: `apps/api/src/smart-pick/scoring.spec.ts`

- [ ] **Step 1: Write the failing test**

`apps/api/src/smart-pick/scoring.spec.ts`:

```ts
import { scoreCard, type ScoreContext, type ScoreInput } from './scoring';
import { DEFAULT_SMART_PICK_WEIGHTS } from './weights';

const baseCtx = (overrides: Partial<ScoreContext> = {}): ScoreContext => ({
    targetSeconds: 1800,
    now: new Date('2026-05-25T00:00:00Z'),
    weights: DEFAULT_SMART_PICK_WEIGHTS,
    pickedChannelIds: new Set(),
    listsWithActiveSession: new Set(),
    ...overrides,
});

const card = (over: Partial<ScoreInput> = {}): ScoreInput => ({
    id: 'c1',
    durationSeconds: 1500,
    addedAt: new Date('2026-05-23T00:00:00Z'),
    listId: 'l1',
    channelId: 'ch1',
    listYoutubePlaylistId: null,
    ...over,
});

describe('scoreCard', () => {
    it('rejects cards that exceed target * 1.1', () => {
        const result = scoreCard(card({ durationSeconds: 2200 }), baseCtx({ targetSeconds: 1800 }));
        expect(result.eligible).toBe(false);
    });

    it('scores older cards higher when other factors are tied', () => {
        const a = scoreCard(card({ addedAt: new Date('2025-12-01') }), baseCtx());
        const b = scoreCard(card({ addedAt: new Date('2026-05-24') }), baseCtx());
        expect(a.score).toBeGreaterThan(b.score);
    });

    it('bumps continuation when the list has a WATCHING card and youtubePlaylistId is set', () => {
        const ctx = baseCtx({
            listsWithActiveSession: new Set(['l1']),
        });
        const withSession = scoreCard(card({ listYoutubePlaylistId: 'PL1' }), ctx);
        const withoutSession = scoreCard(card({ listYoutubePlaylistId: 'PL1' }), baseCtx());
        expect(withSession.score).toBeGreaterThan(withoutSession.score);
    });

    it('penalises a card whose channelId already appeared in the picked set', () => {
        const ctx = baseCtx({ pickedChannelIds: new Set(['ch1']) });
        const same = scoreCard(card({ channelId: 'ch1' }), ctx);
        const different = scoreCard(card({ channelId: 'ch2' }), ctx);
        expect(different.score).toBeGreaterThan(same.score);
    });

    it('emits a list of human-readable reasons matching the dominant factors', () => {
        const result = scoreCard(card({ addedAt: new Date('2025-11-01') }), baseCtx({ targetSeconds: 1800 }));
        expect(result.reasons).toEqual(expect.arrayContaining([expect.stringMatching(/old/i)]));
    });
});
```

- [ ] **Step 2: Run, FAIL**

- [ ] **Step 3: Implement scoring**

`apps/api/src/smart-pick/scoring.ts`:

```ts
import type { SmartPickWeights } from './weights';

const DAY = 1000 * 60 * 60 * 24;
const MAX_AGE_DAYS = 90;
const DURATION_OVERSHOOT_RATIO = 1.1;

export interface ScoreInput {
    id: string;
    durationSeconds: number | null;
    addedAt: Date;
    listId: string;
    channelId: string | null;
    listYoutubePlaylistId: string | null;
}

export interface ScoreContext {
    targetSeconds: number;
    now: Date;
    weights: SmartPickWeights;
    pickedChannelIds: Set<string>;
    listsWithActiveSession: Set<string>; // listIds that have at least one WATCHING card
}

export interface ScoreResult {
    eligible: boolean;
    score: number;
    reasons: string[];
}

export function scoreCard(card: ScoreInput, ctx: ScoreContext): ScoreResult {
    const duration = card.durationSeconds ?? Infinity;
    if (duration > ctx.targetSeconds * DURATION_OVERSHOOT_RATIO) {
        return { eligible: false, score: 0, reasons: [] };
    }

    const ageDays = (ctx.now.getTime() - card.addedAt.getTime()) / DAY;
    const ageScore = Math.min(ageDays / MAX_AGE_DAYS, 1);

    const fitScore = Math.max(
        0,
        1 - Math.abs(duration - ctx.targetSeconds) / ctx.targetSeconds,
    );

    const continuationScore =
        card.listYoutubePlaylistId && ctx.listsWithActiveSession.has(card.listId) ? 1 : 0;

    const diversityScore =
        card.channelId && ctx.pickedChannelIds.has(card.channelId) ? 0 : 1;

    const score =
        ctx.weights.age * ageScore +
        ctx.weights.fit * fitScore +
        ctx.weights.continuation * continuationScore +
        ctx.weights.diversity * diversityScore;

    const reasons: string[] = [];
    if (ageScore >= 0.5) reasons.push(`old (${Math.floor(ageDays)}d)`);
    if (fitScore >= 0.7) reasons.push(`fits ${Math.round(ctx.targetSeconds / 60)}m slot`);
    if (continuationScore > 0) reasons.push('continues active series');
    if (diversityScore > 0 && card.channelId) reasons.push('new channel');

    return { eligible: true, score, reasons };
}
```

- [ ] **Step 4: Run, PASS**

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/smart-pick/scoring.ts apps/api/src/smart-pick/scoring.spec.ts
git commit -m "feat(api): smart-pick scoring engine"
```

---

### Task 4.3: `tonight` endpoint

**Files:**
- Modify: `apps/api/src/smart-pick/smart-pick.service.ts`
- Create: `apps/api/src/smart-pick/smart-pick.service.spec.ts`
- Modify: `apps/api/src/smart-pick/smart-pick.controller.ts`

- [ ] **Step 1: Test the service method**

```ts
// apps/api/src/smart-pick/smart-pick.service.spec.ts
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { SmartPickService } from './smart-pick.service';

describe('SmartPickService.tonight', () => {
    let service: SmartPickService;
    let prisma: any;

    beforeEach(async () => {
        prisma = {
            card: { findMany: jest.fn() },
        };
        const mod = await Test.createTestingModule({
            providers: [SmartPickService, { provide: PrismaService, useValue: prisma }],
        }).compile();
        service = mod.get(SmartPickService);
    });

    it('returns null + a hint if no card fits the target', async () => {
        prisma.card.findMany.mockResolvedValue([
            { id: 'c1', durationSeconds: 5400, addedAt: new Date('2025-01-01'), listId: 'l1', channelId: null, list: { youtubePlaylistId: null }, title: 't', url: 'u', thumbnailUrl: 't', videoId: 'v1' },
        ]);

        const result = await service.tonight('u1', { timeMinutes: 15 });

        expect(result.card).toBeNull();
        expect(result.shortest).toHaveLength(1);
    });

    it('picks the highest-scoring eligible card', async () => {
        prisma.card.findMany.mockResolvedValue([
            { id: 'fresh', durationSeconds: 1200, addedAt: new Date('2026-05-24'), listId: 'l1', channelId: 'c1', list: { youtubePlaylistId: null }, title: 'fresh', url: 'u', thumbnailUrl: 't', videoId: 'v1' },
            { id: 'old',   durationSeconds: 1200, addedAt: new Date('2025-11-01'), listId: 'l1', channelId: 'c2', list: { youtubePlaylistId: null }, title: 'old',   url: 'u', thumbnailUrl: 't', videoId: 'v2' },
        ]);

        const result = await service.tonight('u1', { timeMinutes: 20 });

        expect(result.card?.id).toBe('old');
        expect(result.reasons).toEqual(expect.arrayContaining([expect.any(String)]));
    });
});
```

- [ ] **Step 2: Implement**

```ts
// apps/api/src/smart-pick/smart-pick.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_SMART_PICK_WEIGHTS } from './weights';
import { scoreCard, type ScoreInput, type ScoreContext } from './scoring';

interface TonightInput {
    timeMinutes: number;
    listId?: string;
    excludeVideoIds?: string[];
}

@Injectable()
export class SmartPickService {
    constructor(private readonly prisma: PrismaService) { }

    async tonight(userId: string, input: TonightInput) {
        const targetSeconds = input.timeMinutes * 60;
        const cards = await this.loadCandidates(userId, input.listId, input.excludeVideoIds);

        const ctx = await this.buildContext(userId, targetSeconds, new Set());

        const scored = cards
            .map((c) => ({ card: c, result: scoreCard(this.toScoreInput(c), ctx) }))
            .filter((s) => s.result.eligible)
            .sort((a, b) => b.result.score - a.result.score);

        if (scored.length === 0) {
            const shortest = [...cards]
                .filter((c) => c.durationSeconds != null)
                .sort((a, b) => (a.durationSeconds ?? 0) - (b.durationSeconds ?? 0))
                .slice(0, 2);
            return { card: null, shortest, reasons: [] as string[] };
        }

        const top = scored[0];
        return { card: top.card, reasons: top.result.reasons, shortest: [] };
    }

    private async loadCandidates(userId: string, listId?: string, excludeVideoIds?: string[]) {
        return this.prisma.card.findMany({
            where: {
                userId,
                ...(listId ? { listId } : {}),
                status: { in: ['WATCH_LATER', 'WATCHING'] },
                ...(excludeVideoIds?.length ? { videoId: { notIn: excludeVideoIds } } : {}),
            },
            include: { list: { select: { youtubePlaylistId: true } } },
        });
    }

    private async buildContext(userId: string, targetSeconds: number, pickedChannelIds: Set<string>): Promise<ScoreContext> {
        const watching = await this.prisma.card.findMany({
            where: { userId, status: 'WATCHING' },
            select: { listId: true },
            distinct: ['listId'],
        });
        return {
            targetSeconds,
            now: new Date(),
            weights: DEFAULT_SMART_PICK_WEIGHTS,
            pickedChannelIds,
            listsWithActiveSession: new Set(watching.map((c) => c.listId)),
        };
    }

    private toScoreInput(c: any): ScoreInput {
        return {
            id: c.id,
            durationSeconds: c.durationSeconds,
            addedAt: c.addedAt,
            listId: c.listId,
            channelId: c.channelId ?? null,
            listYoutubePlaylistId: c.list?.youtubePlaylistId ?? null,
        };
    }
}
```

- [ ] **Step 3: Run service tests, PASS**

- [ ] **Step 4: Wire the controller**

```ts
// smart-pick.controller.ts
@Post('tonight')
tonight(@Body() body: { timeMinutes: number; listId?: string; excludeVideoIds?: string[] }, @Req() req: any) {
    return this.smartPick.tonight(req.user.userId, body);
}
```

Add the `Body, Post, Req` imports.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/smart-pick
git commit -m "feat(api): smart-pick tonight endpoint"
```

---

### Task 4.4: `queue` endpoint (greedy fill)

**Files:**
- Modify: `apps/api/src/smart-pick/smart-pick.service.ts`
- Modify: `apps/api/src/smart-pick/smart-pick.service.spec.ts`
- Modify: `apps/api/src/smart-pick/smart-pick.controller.ts`

- [ ] **Step 1: Test**

```ts
describe('SmartPickService.queue', () => {
    // reuse the prisma mock from above
    it('greedy-fills the queue staying under target * 1.1', async () => {
        prisma.card.findMany.mockResolvedValue([
            { id: 'a', durationSeconds: 600, addedAt: new Date('2025-12-01'), listId: 'l1', channelId: 'c1', list: { youtubePlaylistId: null }, title: 'a', url: 'u', thumbnailUrl: 't', videoId: 'v1' },
            { id: 'b', durationSeconds: 800, addedAt: new Date('2025-11-01'), listId: 'l1', channelId: 'c2', list: { youtubePlaylistId: null }, title: 'b', url: 'u', thumbnailUrl: 't', videoId: 'v2' },
            { id: 'c', durationSeconds: 1200, addedAt: new Date('2025-10-01'), listId: 'l1', channelId: 'c3', list: { youtubePlaylistId: null }, title: 'c', url: 'u', thumbnailUrl: 't', videoId: 'v3' },
            { id: 'd', durationSeconds: 4000, addedAt: new Date('2025-09-01'), listId: 'l1', channelId: 'c4', list: { youtubePlaylistId: null }, title: 'd', url: 'u', thumbnailUrl: 't', videoId: 'v4' },
        ]);

        const result = await service.queue('u1', { timeMinutes: 40 }); // 2400s

        const total = result.cards.reduce((acc, c) => acc + (c.durationSeconds ?? 0), 0);
        expect(total).toBeLessThanOrEqual(2400 * 1.1);
        expect(result.cards.length).toBeGreaterThanOrEqual(2);
        expect(result.cards.length).toBeLessThanOrEqual(4);
    });
});
```

- [ ] **Step 2: Implement**

```ts
interface QueueInput {
    timeMinutes: number;
    listId?: string;
    keepVideoIds?: string[]; // for swap
}

async queue(userId: string, input: QueueInput) {
    const targetSeconds = input.timeMinutes * 60;
    const max = targetSeconds * 1.1;

    const all = await this.loadCandidates(userId, input.listId);
    const kept = input.keepVideoIds ?? [];
    const pool = all.filter((c) => !kept.includes(c.videoId));

    const queue: any[] = [];
    const reasons: string[][] = [];
    const pickedChannelIds = new Set<string>();
    let used = 0;

    while (queue.length < 4) {
        const remaining = max - used;
        const ctx = await this.buildContext(userId, Math.max(targetSeconds - used, 60), pickedChannelIds);
        ctx.targetSeconds = Math.max(targetSeconds - used, 60);

        const scored = pool
            .filter((c) => !queue.some((q) => q.id === c.id))
            .map((c) => ({ card: c, result: scoreCard(this.toScoreInput(c), ctx) }))
            .filter((s) => s.result.eligible && (s.card.durationSeconds ?? Infinity) <= remaining)
            .sort((a, b) => b.result.score - a.result.score);

        if (scored.length === 0) break;
        const next = scored[0];
        queue.push(next.card);
        reasons.push(next.result.reasons);
        if (next.card.channelId) pickedChannelIds.add(next.card.channelId);
        used += next.card.durationSeconds ?? 0;
    }

    return { cards: queue, reasons };
}

async queueSwap(userId: string, input: QueueInput) {
    const single = await this.tonight(userId, {
        timeMinutes: input.timeMinutes,
        listId: input.listId,
        excludeVideoIds: input.keepVideoIds,
    });
    return single;
}
```

Wire controller:

```ts
@Post('queue')
queue(@Body() body: { timeMinutes: number; listId?: string }, @Req() req: any) {
    return this.smartPick.queue(req.user.userId, body);
}

@Post('queue/swap')
queueSwap(@Body() body: { timeMinutes: number; listId?: string; keepVideoIds: string[] }, @Req() req: any) {
    return this.smartPick.queueSwap(req.user.userId, body);
}
```

- [ ] **Step 3: Run, PASS**

- [ ] **Step 4: Commit**

```bash
git commit -am "feat(api): smart-pick queue + swap"
```

---

## Phase 5 — Web: design tokens

### Task 5.1: New Tailwind tokens

**Files:**
- Modify: `apps/web/tailwind.config.ts`
- Modify: `apps/web/src/app/globals.css`
- Modify: `apps/web/src/app/layout.tsx`

- [ ] **Step 1: Update `tailwind.config.ts`**

Add the Brutalist palette + monospace stack:

```ts
import type { Config } from 'tailwindcss';

const config: Config = {
    content: ['./src/**/*.{ts,tsx}'],
    theme: {
        extend: {
            colors: {
                paper: '#f5f1e8',
                ink: '#0a0a0a',
                accent: '#dc2626',
            },
            fontFamily: {
                display: ['var(--font-display)', 'Inter', 'sans-serif'],
                mono: ['var(--font-mono)', 'JetBrains Mono', 'monospace'],
            },
            boxShadow: {
                brutal: '3px 3px 0 #0a0a0a',
                'brutal-red': '3px 3px 0 #dc2626',
            },
            borderWidth: {
                '1.5': '1.5px',
            },
        },
    },
};
export default config;
```

- [ ] **Step 2: Update `globals.css`**

```css
@import 'tailwindcss';

@layer base {
    body {
        @apply bg-paper text-ink font-mono;
    }
    h1, h2, h3 {
        @apply font-display font-black tracking-tight lowercase;
    }
}
```

- [ ] **Step 3: Load fonts in `layout.tsx`**

```tsx
import { Inter, JetBrains_Mono } from 'next/font/google';

const display = Inter({ subsets: ['latin'], weight: ['400','700','900'], variable: '--font-display' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400','700'], variable: '--font-mono' });

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className={`${display.variable} ${mono.variable}`}>
            <body>{children}</body>
        </html>
    );
}
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @watchlater/web typecheck`

- [ ] **Step 5: Commit**

```bash
git add apps/web/tailwind.config.ts apps/web/src/app/globals.css apps/web/src/app/layout.tsx
git commit -m "feat(web): brutalist design tokens + fonts"
```

---

## Phase 6 — Web: Lists UI

### Task 6.1: `Sidebar` component (read-only)

**Files:**
- Create: `apps/web/src/components/Sidebar.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client';
import { apiRequest } from '@/src/auth/utility';
import { useEffect, useState } from 'react';

export interface List {
    id: string;
    name: string;
    isDefault: boolean;
    youtubePlaylistId: string | null;
    _count: { cards: number };
}

interface Props {
    activeListId: string | null;
    onSelect: (listId: string) => void;
    onNewList: () => void;
    onImportPlaylist: () => void;
    refreshKey?: number;
}

export function Sidebar({ activeListId, onSelect, onNewList, onImportPlaylist, refreshKey }: Props) {
    const [lists, setLists] = useState<List[]>([]);

    useEffect(() => {
        apiRequest('/lists').then((r) => Array.isArray(r) && setLists(r));
    }, [refreshKey]);

    return (
        <aside className="border-r-2 border-ink bg-white p-3 w-[180px] h-full">
            <div className="text-[9px] font-bold tracking-[1.5px] text-neutral-500 mb-2.5">▸ MY_LISTS</div>
            {lists.map((l) => {
                const isActive = l.id === activeListId;
                return (
                    <button
                        key={l.id}
                        onClick={() => onSelect(l.id)}
                        className={`block w-full text-left px-2 py-1.5 text-[11px] flex justify-between mb-1 ${
                            isActive ? 'bg-ink text-paper font-bold' : 'hover:bg-paper'
                        }`}
                    >
                        <span>{l.youtubePlaylistId ? `// ${l.name}` : l.name}</span>
                        <span className="text-[9px] opacity-60">{l._count.cards}</span>
                    </button>
                );
            })}
            <div className="mt-3.5 pt-2.5 border-t border-dashed border-ink space-y-1">
                <button onClick={onNewList} className="text-[10px] font-bold w-full text-left">+ NEW_LIST()</button>
                <button onClick={onImportPlaylist} className="text-[10px] font-bold w-full text-left">+ IMPORT_FROM_YT()</button>
            </div>
        </aside>
    );
}
```

- [ ] **Step 2: Typecheck**

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/Sidebar.tsx
git commit -m "feat(web): Sidebar component"
```

---

### Task 6.2: Wire `Sidebar` into watchlater page

**Files:**
- Modify: `apps/web/src/app/watchlater/[userId]/page.tsx`

The current page loads everything for a user. We change it so:
- The current loaded list is part of state (`activeListId`).
- The kanban displays only that list's cards.
- The page fetches `/lists` on mount and selects the default list.

- [ ] **Step 1: Add `activeListId` state**

Near the other `useState`s:

```tsx
const [activeListId, setActiveListId] = useState<string | null>(null);
const [sidebarRefresh, setSidebarRefresh] = useState(0);
```

- [ ] **Step 2: Fetch the lists once auth resolves and select default**

After the auth-decode `useEffect`:

```tsx
useEffect(() => {
    if (!isAuthenticated) return;
    apiRequest('/lists').then((lists) => {
        if (!Array.isArray(lists) || lists.length === 0) return;
        const def = lists.find((l: any) => l.isDefault) ?? lists[0];
        setActiveListId(def.id);
    });
}, [isAuthenticated]);
```

- [ ] **Step 3: Scope the card-loading queries**

Wherever the page calls `apiRequest('/cards?userId=...')`, append `&listId=<activeListId>` when set.

- [ ] **Step 4: Render the Sidebar**

In the JSX, wrap the existing content in a flex container and put the `<Sidebar>` to the left:

```tsx
<div className="flex h-screen">
    <Sidebar
        activeListId={activeListId}
        onSelect={setActiveListId}
        onNewList={() => setIsCreateListOpen(true)}
        onImportPlaylist={() => setIsImportPlaylistOpen(true)}
        refreshKey={sidebarRefresh}
    />
    <div className="flex-1 overflow-y-auto">
        {/* existing page content */}
    </div>
</div>
```

- [ ] **Step 5: Verify visually**

Run `pnpm --filter @watchlater/web dev`, log into a collection, confirm the sidebar shows lists and clicking switches the active board.

Take a screenshot for the record via the Playwright Chrome tool.

- [ ] **Step 6: Commit**

```bash
git commit -am "feat(web): wire Sidebar into watchlater page"
```

---

### Task 6.3: `CreateListModal`

**Files:**
- Create: `apps/web/src/components/CreateListModal.tsx`
- Modify: `apps/web/src/app/watchlater/[userId]/page.tsx`

- [ ] **Step 1: Create the modal**

Brutal style, headless-ui dialog, single input, POST `/lists`.

```tsx
'use client';
import { Dialog } from '@headlessui/react';
import { useState } from 'react';
import { apiRequest } from '@/src/auth/utility';

interface Props {
    open: boolean;
    onClose: () => void;
    onCreated: () => void;
}

export function CreateListModal({ open, onClose, onCreated }: Props) {
    const [name, setName] = useState('');
    const [saving, setSaving] = useState(false);

    const submit = async () => {
        if (!name.trim()) return;
        setSaving(true);
        const r = await apiRequest('/lists', { method: 'POST', body: { name } });
        setSaving(false);
        if (r && r.id) {
            setName('');
            onCreated();
            onClose();
        }
    };

    return (
        <Dialog open={open} onClose={onClose} className="relative z-50">
            <div className="fixed inset-0 bg-black/50" />
            <div className="fixed inset-0 flex items-center justify-center">
                <Dialog.Panel className="bg-paper border-2 border-ink shadow-brutal-red w-[320px]">
                    <div className="border-b-2 border-ink p-2 px-3 flex justify-between text-[11px] font-bold">
                        <span>▶ NEW_LIST</span>
                        <button onClick={onClose}>[x]</button>
                    </div>
                    <div className="p-4">
                        <label className="block text-[10px] font-bold mb-2">NAME</label>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full border-1.5 border-ink bg-white px-2 py-1.5 text-[12px] font-mono"
                            autoFocus
                        />
                        <div className="flex gap-1.5 mt-3">
                            <button
                                onClick={submit}
                                disabled={!name.trim() || saving}
                                className="flex-1 bg-ink text-paper px-4 py-2 text-[11px] font-bold border-2 border-ink shadow-brutal-red disabled:opacity-50"
                            >
                                ▶ CREATE
                            </button>
                            <button onClick={onClose} className="border-2 border-ink px-3 py-2 text-[11px] font-bold">
                                CANCEL
                            </button>
                        </div>
                    </div>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
}
```

- [ ] **Step 2: Wire into the page**

In the page, add `const [isCreateListOpen, setIsCreateListOpen] = useState(false);`, mount the modal, and on `onCreated` bump `sidebarRefresh` to force a re-fetch.

- [ ] **Step 3: Typecheck**

- [ ] **Step 4: Commit**

```bash
git commit -am "feat(web): CreateListModal"
```

---

### Task 6.4: Import-from-YT replaces old playlist flow

**Files:**
- Modify: `apps/web/src/app/watchlater/[userId]/page.tsx`
- Create: `apps/web/src/components/ImportPlaylistModal.tsx`

- [ ] **Step 1: New modal**

Same shape as `CreateListModal` but takes a URL and POSTs to `/lists/import`.

```tsx
const r = await apiRequest('/lists/import', { method: 'POST', body: { url } });
```

On 409 (Conflict), display "Playlist already imported".

- [ ] **Step 2: Remove the old playlist-create flow**

In `page.tsx`, every reference to the old `POST /playlists` flow gets removed/replaced. Search for `playlistId` and `addPlaylist` and adjust.

- [ ] **Step 3: Typecheck**

- [ ] **Step 4: Commit**

```bash
git commit -am "feat(web): ImportPlaylistModal hits /lists/import"
```

---

### Task 6.5: Delete-list flow

**Files:**
- Modify: `apps/web/src/components/Sidebar.tsx`
- Create: `apps/web/src/components/ConfirmModal.tsx` (if you don't have a reusable confirm yet)

- [ ] **Step 1: Add a right-click / hover menu on non-default lists**

Show a `[x]` button on hover. On click open a confirm. On confirm `apiRequest('/lists/:id', { method: 'DELETE' })`.

- [ ] **Step 2: Refresh sidebar after deletion**

Bump `refreshKey` from the parent and switch `activeListId` back to the default.

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(web): delete list with confirmation"
```

---

### Task 6.65: Restyle remaining modals (CreateUser, settings, suggestions inbox)

The spec calls out "all modals" should match the new identity. Tasks 6.3, 6.4 already cover the new modals. The legacy ones need a pass.

**Files:**
- Modify: `apps/web/src/components/CreateUserModal.tsx`
- Modify: `apps/web/src/app/watchlater/[userId]/page.tsx` (the settings & delete dialogs inlined in this file)

- [ ] **Step 1: Token sweep**

In each modal:
- Container: `bg-paper border-2 border-ink shadow-brutal-red`
- Header: `border-b-2 border-ink p-2 px-3 text-[11px] font-bold`
- Inputs: `border-1.5 border-ink bg-white px-2 py-1.5 text-[12px] font-mono`
- Primary button: `bg-ink text-paper border-2 border-ink shadow-brutal-red font-bold`
- Secondary button: `border-2 border-ink font-bold`

- [ ] **Step 2: Visual check**

Open each modal in the running dev app, screenshot. Compare to mockup vibe (cream paper, black ink, red shadow offset).

- [ ] **Step 3: Commit**

```bash
git commit -am "style(web): brutal restyle of legacy modals"
```

---

### Task 6.6: Restyle `KanbanBoard` to Brutalist tokens

**Files:**
- Modify: `apps/web/src/components/KanbanBoard.tsx`
- Modify: `apps/web/src/components/SortableItem.tsx`
- Modify: `apps/web/src/components/DroppableColumn.tsx`

- [ ] **Step 1: Apply new tokens**

Replace `bg-blue-500/10 border-blue-300/30` style classes with the brutal equivalents:
- Column headers: `border-b-2 border-ink` (or `border-accent` for WATCHING, `border-green-600` for WATCHED).
- Cards: `border-1.5 border-ink bg-white p-2 mb-1.5`.
- Drag overlay: `border-2 border-ink shadow-brutal-red`.

Match the mockup in `.superpowers/brainstorm/.../brutalist-screens.html`.

- [ ] **Step 2: Verify visually**

Run dev, take screenshot. Compare to mockup.

- [ ] **Step 3: Commit**

```bash
git commit -am "style(web): brutalist kanban board"
```

---

## Phase 7 — Web: Smart pick

### Task 7.1: `SmartPickModal` (Tonight)

**Files:**
- Create: `apps/web/src/components/SmartPickModal.tsx`
- Modify: `apps/web/src/app/watchlater/[userId]/page.tsx`

- [ ] **Step 1: Build the modal**

Time-slot chips (`15m`, `30m`, `1h`, `2h+`), POST `/smart-pick/tonight`, render the result card + `▸ matched: ...` line + `WATCH NOW` / `↻ ANOTHER` buttons. On `WATCH NOW`, open the YouTube URL in a new tab and PATCH the card to `WATCHING`.

```tsx
const slots = [
    { label: '15m', minutes: 15 },
    { label: '30m', minutes: 30 },
    { label: '1h', minutes: 60 },
    { label: '2h+', minutes: 120 },
];
```

POST body when a slot is chosen:

```ts
const r = await apiRequest('/smart-pick/tonight', {
    method: 'POST',
    body: { timeMinutes: slot.minutes, excludeVideoIds: rerolledIds },
});
```

If `r.card` is `null`, show the empty `[ no fit ]` state with `r.shortest` listed.

- [ ] **Step 2: Add the trigger button to the top nav**

`▸ SMART_PICK()` in the page header opens the modal.

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(web): SmartPickModal (Tonight)"
```

---

### Task 7.2: `/queue` page

**Files:**
- Create: `apps/web/src/app/watchlater/[userId]/queue/page.tsx`

- [ ] **Step 1: Build the page**

Header: "tonight's queue", target/generated/count line.

Body: numbered list of cards (`01/02/03`) with `↻ swap` per item.

Footer: scope chips (`all lists` vs `current list`), time slider (15m → 3h), `▶ START QUEUE` / `↻ REROLL ALL` buttons.

API calls:
- POST `/smart-pick/queue` with `{ timeMinutes, listId? }` on slider change or "REROLL ALL".
- POST `/smart-pick/queue/swap` with `{ timeMinutes, listId?, keepVideoIds: <ids of items still in queue> }` on per-item swap.

`START QUEUE` opens item 1 in a new tab and walks through. Move each card to `WATCHING` when started, `WATCHED` when the user marks it done (or on `START_QUEUE`'s ?next? handling — keep simple for v1: just open in tab, no auto-status, user marks manually).

- [ ] **Step 2: Verify visually**

Take screenshot. Compare to mockup.

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(web): queue page"
```

---

## Phase 8 — Web: Landing + collections picker

### Task 8.1: Move user picker to `/collections`

**Files:**
- Create: `apps/web/src/app/collections/page.tsx` (copy of current `app/page.tsx`)
- Restyle to brutalist tokens

- [ ] **Step 1: Copy and restyle**

The existing `apps/web/src/app/page.tsx` is the user picker. Move it to `/collections`. Restyle: cream background, brutal cards, mono labels, accent red on hover.

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/collections/page.tsx
git commit -m "feat(web): collections picker moved + restyled"
```

---

### Task 8.2: New `/` landing page

**Files:**
- Modify: `apps/web/src/app/page.tsx`

- [ ] **Step 1: Replace with the landing**

Sections:
1. Top nav with logo `[WATCHLATER]` + v label + sign-in
2. Hero: `// THE PROBLEM` kicker, big lowercase headline ("finish what you saved."), 2-line problem statement, `▶ OPEN_BOARD()` primary CTA → `/collections`, `LIVE_DEMO()` secondary
3. Three mini-screenshots (use the docs/*.png you already have, or capture new ones)
4. Footer with `made by Davi Duarte` + social links

Use the exact tokens defined in Phase 5. Reference the `visual-direction.html` mockup for the layout.

- [ ] **Step 2: Capture a screenshot**

Take a Playwright screenshot of `/`, save to `docs/landing-v2.png`.

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(web): new brutalist landing page"
```

---

### Task 8.3: Restyle login page

**Files:**
- Modify: `apps/web/src/app/login/[userId]/page.tsx`

- [ ] **Step 1: Apply brutal tokens**

Replace the purple-gradient card with a cream card, ink border, accent shadow. Avatar circle keeps but with 2px ink border.

- [ ] **Step 2: Screenshot**

Save to `docs/login-v2.png`.

- [ ] **Step 3: Commit**

```bash
git commit -am "style(web): brutalist login page"
```

---

## Phase 9 — Cleanup & verify

### Task 9.1: Manual E2E smoke

- [ ] **Step 1: Local stack up**

```bash
docker compose up -d db
JWT_SECRET=... YOUTUBE_API_KEY=... pnpm dev
```

- [ ] **Step 2: Smoke checklist**

Walk through:
1. `/` landing renders, CTA links to `/collections`
2. `/collections` shows existing users, click → `/login/:id`, log in
3. Watchlater page shows Sidebar with `default` list + any migrated YT-imported lists
4. Create a new manual list, switch to it, add a video, drag across columns
5. Import a YT playlist URL, list appears, cards inside
6. Click `▸ SMART_PICK()`, pick `30m`, observe the recommended card + reasons line, click ANOTHER, verify a different card
7. Open `/queue`, slider to 60m, verify 2-4 cards summing to ~60m, swap one, verify the queue updates
8. Delete a non-default list, verify cards moved to default
9. Try to delete default list, expect 403
10. Take fresh screenshots, replace `docs/landing.png` and `docs/login.png`

- [ ] **Step 3: Commit screenshots**

```bash
git add docs/
git commit -m "docs: update screenshots after brutalist redesign"
```

---

### Task 9.2: Update CLAUDE.md + README

**Files:**
- Modify: `CLAUDE.md`
- Modify: `README.md`

- [ ] **Step 1: Refresh CLAUDE.md**

Update the "Architecture" section: replace mentions of `Playlist` with `List`, mention the `smart-pick/` module, mention `scoring.ts`.

- [ ] **Step 2: Refresh README**

Update "What's built" table: add `Lists`, `Smart pick`. Remove the old `Playlists` row (or fold it into Lists). Update the data-flow diagram if needed.

- [ ] **Step 3: Commit**

```bash
git commit -am "docs: refresh CLAUDE.md and README for lists + smart pick"
```

---

### Task 9.3: Tag a release + let GHCR build the new image

- [ ] **Step 1: Tag**

```bash
git tag v0.2.0
git push origin v0.2.0
```

The CI workflow `.github/workflows/api-image.yml` picks up the tag and publishes `ghcr.io/yuhtin/youtube-watchlater-api:v0.2.0` and updates `:latest`.

- [ ] **Step 2: Trigger an Easypanel redeploy**

Either pin the api service to `:v0.2.0` for clean rollback, or let `:latest` auto-pull and apply.

- [ ] **Step 3: Run the migration on prod**

After the new image deploys, exec into the running container (or run locally pointed at prod DATABASE_URL):

```bash
pnpm --filter @watchlater/db migrate:deploy
```

Verify `lists` table populated, no card orphaned.

---

## Summary of new/modified files

**Created:**
- `packages/db/prisma/migrations/20260525000000_lists_and_channels/migration.sql`
- `apps/api/src/list/{list.module,list.service,list.controller,list.service.spec}.ts`
- `apps/api/src/smart-pick/{smart-pick.module,smart-pick.service,smart-pick.controller,scoring,weights,smart-pick.service.spec,scoring.spec}.ts`
- `apps/web/src/components/{Sidebar,CreateListModal,ImportPlaylistModal,SmartPickModal}.tsx`
- `apps/web/src/app/collections/page.tsx`
- `apps/web/src/app/watchlater/[userId]/queue/page.tsx`

**Modified:**
- `packages/db/prisma/schema.prisma`
- `packages/db/package.json`, root `package.json`
- `packages/youtube/src/client.ts`
- `apps/api/src/app.module.ts`
- `apps/api/src/card/{card.service,card.controller}.ts`
- `apps/api/src/cron/playlist-resync.service.ts`
- `apps/web/tailwind.config.ts`
- `apps/web/src/app/{layout,page,globals.css}`
- `apps/web/src/app/login/[userId]/page.tsx`
- `apps/web/src/app/watchlater/[userId]/page.tsx`
- `apps/web/src/components/{KanbanBoard,SortableItem,DroppableColumn}.tsx`
- `CLAUDE.md`, `README.md`

**Deleted:**
- `apps/api/src/playlist/` (whole directory)
