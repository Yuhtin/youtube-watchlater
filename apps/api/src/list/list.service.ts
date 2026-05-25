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
}
