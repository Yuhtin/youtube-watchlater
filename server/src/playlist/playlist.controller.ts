import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { PlaylistService } from './playlist.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('playlists')
export class PlaylistController {
  constructor(private readonly playlistService: PlaylistService) {}

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
}