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
}
