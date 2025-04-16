-- CreateTable
CREATE TABLE "Suggestion" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "videoTitle" TEXT NOT NULL,
    "videoThumbnail" TEXT NOT NULL,
    "videoDuration" INTEGER,
    "note" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "accepted" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Suggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Suggestion_fromUserId_idx" ON "Suggestion"("fromUserId");

-- CreateIndex
CREATE INDEX "Suggestion_toUserId_idx" ON "Suggestion"("toUserId");

-- AddForeignKey
ALTER TABLE "Suggestion" ADD CONSTRAINT "Suggestion_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Suggestion" ADD CONSTRAINT "Suggestion_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
