import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { YoutubeService } from '../youtube/youtube.service';
import { YouTubeApiError } from '@watchlater/youtube';

@Injectable()
export class PlaylistResyncService {
    private readonly logger = new Logger(PlaylistResyncService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly youtube: YoutubeService,
    ) { }

    @Cron(CronExpression.EVERY_6_HOURS)
    async resyncAll() {
        const enabled = process.env.PLAYLIST_RESYNC_ENABLED !== 'false';
        if (!enabled) return;

        this.logger.log('Starting playlist re-sync sweep');
        const playlists = await this.prisma.playlist.findMany({
            select: { id: true, playlistId: true, userId: true, title: true },
        });

        let updated = 0;
        let removed = 0;
        let failed = 0;

        for (const playlist of playlists) {
            try {
                const result = await this.resyncOne(playlist.id, playlist.playlistId, playlist.userId);
                updated += result.updatedCards;
                removed += result.removedCards;
            } catch (err) {
                failed++;
                if (err instanceof YouTubeApiError && err.status === 404) {
                    this.logger.warn(`Playlist ${playlist.playlistId} (${playlist.title}) was deleted on YouTube — skipping`);
                } else {
                    this.logger.error(`Failed to resync playlist ${playlist.playlistId}: ${err instanceof Error ? err.message : String(err)}`);
                }
            }
        }

        this.logger.log(`Re-sync done: ${playlists.length} playlists scanned, ${updated} cards updated, ${removed} removed, ${failed} failed`);
    }

    private async resyncOne(playlistRowId: string, playlistId: string, userId: string): Promise<{ updatedCards: number; removedCards: number }> {
        const remoteItems = await this.youtube.getPlaylistItems(playlistId);
        const remoteIds = new Set(remoteItems.map((v) => v.videoId));

        const localCards = await this.prisma.card.findMany({
            where: { playlistId: playlistRowId, userId },
            select: { id: true, videoId: true, title: true, durationSeconds: true, thumbnailUrl: true },
        });

        let updatedCards = 0;
        let removedCards = 0;

        for (const card of localCards) {
            if (!remoteIds.has(card.videoId)) {
                await this.prisma.card.delete({ where: { id: card.id } });
                removedCards++;
                continue;
            }

            const remote = remoteItems.find((v) => v.videoId === card.videoId)!;
            const needsUpdate =
                remote.title !== card.title ||
                remote.durationSeconds !== card.durationSeconds ||
                remote.thumbnailUrl !== card.thumbnailUrl;

            if (needsUpdate) {
                await this.prisma.card.update({
                    where: { id: card.id },
                    data: {
                        title: remote.title,
                        durationSeconds: remote.durationSeconds,
                        thumbnailUrl: remote.thumbnailUrl,
                    },
                });
                updatedCards++;
            }
        }

        return { updatedCards, removedCards };
    }
}
