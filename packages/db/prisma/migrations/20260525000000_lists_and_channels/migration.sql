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
