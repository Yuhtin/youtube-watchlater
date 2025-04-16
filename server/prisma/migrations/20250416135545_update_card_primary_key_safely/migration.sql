/*
  Warnings:

  - A unique constraint covering the columns `[videoId,userId]` on the table `cards` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "cards" ALTER COLUMN "videoId" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "cards_videoId_userId_key" ON "cards"("videoId", "userId");

ALTER TABLE "playlists" 
ADD COLUMN "playlistId" TEXT NOT NULL DEFAULT '';

UPDATE "playlists" 
SET "playlistId" = "id" 
WHERE "playlistId" = '';

-- Primeiro, vamos criar uma tabela temporária com a estrutura desejada
CREATE TABLE "playlists_new" (
  "id" TEXT NOT NULL,
  "playlistId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "thumbnailUrl" TEXT,
  "userId" TEXT NOT NULL,
  "durationSeconds" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "playlists_new_pkey" PRIMARY KEY ("id")
);

-- Copiar todos os dados, gerando novos UUIDs para o campo id
INSERT INTO "playlists_new" ("id", "playlistId", "title", "thumbnailUrl", "userId", "durationSeconds", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid()::TEXT, 
  "playlistId",
  "title", 
  "thumbnailUrl", 
  "userId", 
  "durationSeconds", 
  "createdAt", 
  COALESCE("updatedAt", CURRENT_TIMESTAMP)
FROM "playlists";

-- Verificar se todos os registros foram copiados
DO $$
DECLARE
  old_count INTEGER;
  new_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO old_count FROM "playlists";
  SELECT COUNT(*) INTO new_count FROM "playlists_new";
  
  IF old_count != new_count THEN
    RAISE EXCEPTION 'Migration failed: Record count mismatch. Old: %, New: %', old_count, new_count;
  END IF;
END $$;

-- Criar backup da tabela original
CREATE TABLE "playlists_backup" AS SELECT * FROM "playlists";

-- Renomear tabelas
ALTER TABLE "playlists" RENAME TO "playlists_old";
ALTER TABLE "playlists_new" RENAME TO "playlists";

-- Adicionar as chaves estrangeiras
ALTER TABLE "playlists" ADD CONSTRAINT "playlists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Adicionar a restrição única
CREATE UNIQUE INDEX "playlists_playlistId_userId_key" ON "playlists"("playlistId", "userId");

-- Primeiro, vamos remover temporariamente a restrição de chave estrangeira
ALTER TABLE "cards" DROP CONSTRAINT IF EXISTS "cards_playlistId_fkey";

-- Atualizar apenas os cards que têm referências válidas
UPDATE "cards" c
SET "playlistId" = pn."id"
FROM "playlists_old" po
JOIN "playlists" pn ON po."playlistId" = pn."playlistId" AND po."userId" = pn."userId"
WHERE c."playlistId" = po."id";

-- Identificar e lidar com cards órfãos (que têm playlistId que não existe mais)
-- Opção 1: Definir playlistId como NULL para cards com referências inválidas
UPDATE "cards"
SET "playlistId" = NULL
WHERE "playlistId" NOT IN (SELECT "id" FROM "playlists") 
AND "playlistId" IS NOT NULL;

-- Adicionar novamente a restrição de chave estrangeira
ALTER TABLE "cards" ADD CONSTRAINT "cards_playlistId_fkey" 
FOREIGN KEY ("playlistId") REFERENCES "playlists"("id") ON DELETE SET NULL ON UPDATE CASCADE;