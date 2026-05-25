import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ListService } from './list.service';
import { YoutubeService } from '../youtube/youtube.service';

describe('ListService', () => {
    let service: ListService;
    let prisma: any;
    let youtube: any;

    beforeEach(async () => {
        prisma = {
            list: { findMany: jest.fn(), findFirst: jest.fn(), aggregate: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
            card: { updateMany: jest.fn(), createMany: jest.fn(), findFirst: jest.fn() },
            $transaction: jest.fn(async (fn: any) => fn(prisma)),
        };
        youtube = { getPlaylist: jest.fn(), getPlaylistItems: jest.fn() };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ListService,
                { provide: PrismaService, useValue: prisma },
                { provide: YoutubeService, useValue: youtube },
            ],
        }).compile();
        service = module.get(ListService);
    });

    describe('findAllByUser', () => {
        it('returns the user\'s lists ordered with default first, then by order', async () => {
            prisma.list.findMany.mockResolvedValue([
                { id: '1', name: 'default', isDefault: true, order: 0, cards: [] },
                { id: '2', name: 'tech', isDefault: false, order: 1, cards: [] },
            ]);

            const result = await service.findAllByUser('user-1');

            expect(prisma.list.findMany).toHaveBeenCalledWith({
                where: { userId: 'user-1' },
                orderBy: [{ isDefault: 'desc' }, { order: 'asc' }, { createdAt: 'asc' }],
                include: {
                    _count: { select: { cards: true } },
                },
            });
            expect(result).toHaveLength(2);
        });
    });
});
