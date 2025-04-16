import { Controller, Get, Post, Body, Param, UseGuards, Request, Patch, Delete } from '@nestjs/common';
import { PlaylistService } from './playlist.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ColumnType } from '@prisma/client';

@Controller('playlists')
export class PlaylistController {
    constructor(private readonly playlistService: PlaylistService) { }

    @UseGuards(JwtAuthGuard)
    @Post()
    async create(@Body() body: any, @Request() req) {
        if (!req.user || !req.user.userId) {
            return {
                statusCode: 401,
                message: 'Unauthorized',
            };
        }

        const result = await this.playlistService.create({
            ...body,
            userId: req.user.userId,
        });

        return result;
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':playlistId/status')
    async updatePlaylistStatus(
        @Param('playlistId') playlistId: string,
        @Body() body: { status: ColumnType },
        @Request() req
    ) {
        if (!req.user || !req.user.userId) {
            return {
                statusCode: 401,
                message: 'Unauthorized',
            };
        }

        await this.playlistService.updateCardsStatus(playlistId, req.user.userId, body.status);

        return {
            success: true,
            message: 'Playlist status updated'
        };
    }

    @UseGuards(JwtAuthGuard)
    @Get()
    findAllByUser(@Request() req) {
        if (!req.user || !req.user.userId) {
            return {
                statusCode: 401,
                message: 'Unauthorized',
            };
        }
        
        return this.playlistService.findAllByUser(req.user.userId);
    }

    @UseGuards(JwtAuthGuard)
    @Get(':playlistId')
    async findOne(@Param('playlistId') playlistId: string, @Request() req) {
        if (!req.user || !req.user.userId) {
            return {
                statusCode: 401,
                message: 'Unauthorized',
            };
        }

        return this.playlistService.findOne(playlistId, req.user.userId);
    }

    @UseGuards(JwtAuthGuard)
    @Get(':playlistId/status')
    async getPlaylistStatus(@Param('playlistId') playlistId: string, @Request() req) {
        if (!req.user || !req.user.userId) {
            return {
                statusCode: 401,
                message: 'Unauthorized',
            };
        }

        const status = await this.playlistService.calculatePlaylistStatus(playlistId, req.user.userId);
        return { status };
    }

    @UseGuards(JwtAuthGuard)
    @Delete(':playlistId')
    async remove(@Param('playlistId') playlistId: string, @Request() req) {
        if (!req.user || !req.user.userId) {
            return {
                statusCode: 401,
                message: 'Unauthorized',
            };
        }

        const result = await this.playlistService.remove(playlistId, req.user.userId);
        return {
            success: true,
            message: 'Playlist deleted',
            result
        };
    }

}