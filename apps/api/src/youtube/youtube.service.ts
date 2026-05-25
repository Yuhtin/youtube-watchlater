import { Injectable, OnModuleInit } from '@nestjs/common';
import { YouTubeClient, type YouTubeVideo } from '@watchlater/youtube';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class YoutubeService implements OnModuleInit {
    private client!: YouTubeClient;

    constructor(private readonly prisma: PrismaService) { }

    onModuleInit() {
        const key = process.env.YOUTUBE_API_KEY;

        if (!key) {
            throw new Error('YOUTUBE_API_KEY environment variable is not defined! Application startup failed.');
        }

        this.client = new YouTubeClient(key);
    }

    async getVideo(videoId: string): Promise<YouTubeVideo | null> {
        const cached = await this.prisma.card.findFirst({
            where: { videoId },
            select: {
                videoId: true,
                title: true,
                thumbnailUrl: true,
                durationSeconds: true,
                url: true,
            },
        });

        if (cached && cached.durationSeconds != null) {
            return {
                videoId: cached.videoId,
                title: cached.title,
                thumbnailUrl: cached.thumbnailUrl,
                durationSeconds: cached.durationSeconds,
                url: cached.url,
            };
        }

        return this.client.getVideo(videoId);
    }

    getPlaylist(playlistId: string) {
        return this.client.getPlaylist(playlistId);
    }

    getPlaylistItems(playlistId: string) {
        return this.client.getPlaylistItems(playlistId);
    }

    getVideosByIds(videoIds: string[]) {
        return this.client.getVideosByIds(videoIds);
    }
}
