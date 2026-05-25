import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ColumnType } from '@watchlater/db';
import { PrismaService } from '../prisma/prisma.service';
import { YoutubeService } from '../youtube/youtube.service';

@Injectable()
export class ListService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly youtube: YoutubeService,
    ) { }

    async findAllByUser(userId: string) {
        return this.prisma.list.findMany({
            where: { userId },
            orderBy: [{ isDefault: 'desc' }, { order: 'asc' }, { createdAt: 'asc' }],
            include: {
                _count: { select: { cards: true } },
            },
        });
    }

    async create(userId: string, dto: { name: string }) {
        const name = dto.name?.trim();
        if (!name) {
            throw new BadRequestException('List name is required');
        }

        const { _max } = await this.prisma.list.aggregate({
            where: { userId },
            _max: { order: true },
        });

        return this.prisma.list.create({
            data: { name, userId, order: (_max.order ?? -1) + 1 },
        });
    }

    async update(userId: string, listId: string, dto: { name?: string; order?: number }) {
        const list = await this.prisma.list.findFirst({
            where: { id: listId, userId },
        });
        if (!list) throw new NotFoundException('List not found');

        if (dto.name !== undefined) {
            const name = dto.name.trim();
            if (!name) throw new BadRequestException('Name cannot be empty');
            if (list.isDefault) throw new ForbiddenException('Cannot rename the default list');
        }

        return this.prisma.list.update({
            where: { id: listId },
            data: {
                ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
                ...(dto.order !== undefined ? { order: dto.order } : {}),
            },
        });
    }

    async delete(userId: string, listId: string) {
        const list = await this.prisma.list.findFirst({ where: { id: listId, userId } });
        if (!list) throw new NotFoundException('List not found');
        if (list.isDefault) throw new ForbiddenException('Cannot delete the default list');

        const defaultList = await this.prisma.list.findFirst({
            where: { userId, isDefault: true },
        });
        if (!defaultList) {
            throw new NotFoundException('Default list missing — data is inconsistent');
        }

        await this.prisma.$transaction(async (tx) => {
            await tx.card.updateMany({
                where: { listId, userId },
                data: { listId: defaultList.id },
            });
            await tx.list.delete({ where: { id: listId } });
        });

        return { ok: true as const };
    }

    async importFromYoutube(userId: string, playlistId: string) {
        const existing = await this.prisma.list.findFirst({
            where: { userId, youtubePlaylistId: playlistId },
        });
        if (existing) {
            throw new ConflictException('Playlist already imported');
        }

        const meta = await this.youtube.getPlaylist(playlistId);
        if (!meta) throw new NotFoundException('YouTube playlist not found');

        const items = await this.youtube.getPlaylistItems(playlistId);

        const { _max } = await this.prisma.list.aggregate({
            where: { userId },
            _max: { order: true },
        });

        return this.prisma.$transaction(async (tx: any) => {
            const list = await tx.list.create({
                data: {
                    name: meta.title,
                    userId,
                    order: (_max.order ?? -1) + 1,
                    youtubePlaylistId: meta.playlistId,
                    thumbnailUrl: meta.thumbnailUrl,
                },
            });

            if (items.length > 0) {
                await tx.card.createMany({
                    data: items.map((v: any, i: number) => ({
                        videoId: v.videoId,
                        title: v.title,
                        url: v.url,
                        thumbnailUrl: v.thumbnailUrl,
                        durationSeconds: v.durationSeconds,
                        channelId: v.channelId ?? null,
                        channelTitle: v.channelTitle ?? null,
                        userId,
                        listId: list.id,
                        order: i,
                    })),
                    skipDuplicates: true,
                });
            }

            return list;
        });
    }
}
