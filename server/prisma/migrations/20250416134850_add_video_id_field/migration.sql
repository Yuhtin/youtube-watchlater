-- AlterTable
ALTER TABLE "cards" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "videoId" TEXT NOT NULL DEFAULT '';