import { Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ColumnType } from '@watchlater/db';
import { parsePlaylistId } from '@watchlater/youtube';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ListService } from './list.service';

@UseGuards(JwtAuthGuard)
@Controller('lists')
export class ListController {
    constructor(private readonly listService: ListService) { }

    @Get()
    findAll(@Req() req: any) {
        return this.listService.findAllByUser(req.user.userId);
    }

    @Post()
    create(@Body() body: { name: string }, @Req() req: any) {
        return this.listService.create(req.user.userId, { name: body.name });
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() body: { name?: string; order?: number }, @Req() req: any) {
        return this.listService.update(req.user.userId, id, body);
    }

    @Patch(':id/cards/status')
    bulkStatus(@Param('id') id: string, @Body() body: { status: ColumnType }, @Req() req: any) {
        return this.listService.bulkUpdateCardStatus(req.user.userId, id, body.status);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @Req() req: any) {
        return this.listService.delete(req.user.userId, id);
    }

    @Post('import')
    async importFromYoutube(@Body() body: { url: string }, @Req() req: any) {
        const playlistId = parsePlaylistId(body.url);
        if (!playlistId) throw new NotFoundException('Invalid playlist URL');
        return this.listService.importFromYoutube(req.user.userId, playlistId);
    }
}
