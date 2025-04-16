/*
  Warnings:

  - A unique constraint covering the columns `[videoId,userId]` on the table `cards` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "cards" ALTER COLUMN "videoId" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "cards_videoId_userId_key" ON "cards"("videoId", "userId");
