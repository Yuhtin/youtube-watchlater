/*
  Warnings:

  - You are about to drop the column `durationTotal` on the `playlists` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "playlists" DROP COLUMN "durationTotal",
ADD COLUMN     "durationSeconds" INTEGER;
