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
    const result = await this.playlistService.create({
      ...body,
      userId: req.user.userId,
    });

    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  async updatePlaylistStatus(
    @Param('id') id: string,
    @Body() body: { status: ColumnType },
    @Request() req
  ) {
    await this.playlistService.updateCardsStatus(id, req.user.userId, body.status);

    return {
      success: true,
      message: 'Playlist status updated'
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAllByUser(@Request() req) {
    return this.playlistService.findAllByUser(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.playlistService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/status')
  async getPlaylistStatus(@Param('id') id: string) {
    const status = await this.playlistService.calculatePlaylistStatus(id);
    return { status };
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    const result = await this.playlistService.remove(id, req.user.userId);
    return {
      success: true,
      message: 'Playlist deleted',
      result
    };
  }

}