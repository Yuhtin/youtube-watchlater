import { Controller, Get, Param, UseGuards, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { YoutubeService } from './youtube.service';

@UseGuards(JwtAuthGuard)
@Controller('youtube')
export class YoutubeController {
    constructor(private readonly youtube: YoutubeService) { }

    @Get('videos/:id')
    async getVideo(@Param('id') id: string) {
        const video = await this.youtube.getVideo(id);

        if (!video) {
            throw new NotFoundException(`Video ${id} not found`);
        }

        return video;
    }

    @Get('playlists/:id')
    async getPlaylist(@Param('id') id: string) {
        const playlist = await this.youtube.getPlaylist(id);

        if (!playlist) {
            throw new NotFoundException(`Playlist ${id} not found`);
        }

        return playlist;
    }

    @Get('playlists/:id/items')
    async getPlaylistItems(@Param('id') id: string) {
        return this.youtube.getPlaylistItems(id);
    }
}
