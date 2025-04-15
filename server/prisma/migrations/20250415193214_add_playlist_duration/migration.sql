/*
  Warnings:

  - You are about to drop the column `duration` on the `cards` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "cards" DROP COLUMN "duration";

-- AlterTable
ALTER TABLE "playlists" ADD COLUMN     "durationTotal" INTEGER;
