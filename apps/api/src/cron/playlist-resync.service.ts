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
}
