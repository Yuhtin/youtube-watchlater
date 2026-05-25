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

    describe('create', () => {
        it('creates a list with order = max(existing) + 1', async () => {
            prisma.list.aggregate.mockResolvedValue({ _max: { order: 3 } });
            prisma.list.create.mockResolvedValue({
                id: 'new', name: 'chill', userId: 'u1', order: 4, isDefault: false,
            });

            const result = await service.create('u1', { name: 'chill' });

            expect(prisma.list.create).toHaveBeenCalledWith({
                data: { name: 'chill', userId: 'u1', order: 4 },
            });
            expect(result.name).toBe('chill');
        });

        it('rejects empty names', async () => {
            await expect(service.create('u1', { name: '' })).rejects.toThrow();
        });
    });

    describe('update', () => {
        it('renames a list when owner matches', async () => {
            prisma.list.findFirst.mockResolvedValue({ id: 'l1', userId: 'u1', isDefault: false });
            prisma.list.update.mockResolvedValue({ id: 'l1', name: 'renamed', userId: 'u1' });

            await service.update('u1', 'l1', { name: 'renamed' });

            expect(prisma.list.update).toHaveBeenCalledWith({
                where: { id: 'l1' },
                data: { name: 'renamed' },
            });
        });

        it('refuses to rename the default list', async () => {
            prisma.list.findFirst.mockResolvedValue({ id: 'l1', userId: 'u1', isDefault: true });
            await expect(service.update('u1', 'l1', { name: 'x' })).rejects.toThrow(/default/i);
        });

        it('throws NotFound when the list isn\'t owned by the user', async () => {
            prisma.list.findFirst.mockResolvedValue(null);
            await expect(service.update('u1', 'l1', { name: 'x' })).rejects.toThrow();
        });
    });

    describe('delete', () => {
        it('refuses to delete the default list', async () => {
            prisma.list.findFirst.mockResolvedValue({ id: 'l1', userId: 'u1', isDefault: true });
            await expect(service.delete('u1', 'l1')).rejects.toThrow(/default/i);
        });

        it('moves cards to the default list, then deletes the list', async () => {
            prisma.list.findFirst
                .mockResolvedValueOnce({ id: 'l1', userId: 'u1', isDefault: false })
                .mockResolvedValueOnce({ id: 'default-l', userId: 'u1', isDefault: true });

            await service.delete('u1', 'l1');

            expect(prisma.card.updateMany).toHaveBeenCalledWith({
                where: { listId: 'l1', userId: 'u1' },
                data: { listId: 'default-l' },
            });
            expect(prisma.list.delete).toHaveBeenCalledWith({ where: { id: 'l1' } });
        });
    });

    describe('importFromYoutube', () => {
        it('creates a list + cards from a YouTube playlist URL', async () => {
            youtube.getPlaylist.mockResolvedValue({
                playlistId: 'PL123', title: 'Rust Talks', thumbnailUrl: 'thumb',
            });
            youtube.getPlaylistItems.mockResolvedValue([
                { videoId: 'v1', title: 'a', thumbnailUrl: 't', durationSeconds: 600, url: 'u1', channelId: 'c1', channelTitle: 'C1' },
                { videoId: 'v2', title: 'b', thumbnailUrl: 't', durationSeconds: 900, url: 'u2', channelId: 'c1', channelTitle: 'C1' },
            ]);
            prisma.list.findFirst.mockResolvedValue(null);
            prisma.list.aggregate.mockResolvedValue({ _max: { order: 0 } });
            prisma.list.create.mockResolvedValue({
                id: 'l-new', name: 'Rust Talks', userId: 'u1', youtubePlaylistId: 'PL123',
            });

            const result = await service.importFromYoutube('u1', 'PL123');

            expect(youtube.getPlaylist).toHaveBeenCalledWith('PL123');
            expect(prisma.list.create).toHaveBeenCalled();
            expect(prisma.card.createMany).toHaveBeenCalled();
            expect(result.id).toBe('l-new');
        });

        it('rejects when the user already imported that playlist', async () => {
            prisma.list.findFirst.mockResolvedValue({ id: 'existing', youtubePlaylistId: 'PL123' });
            await expect(service.importFromYoutube('u1', 'PL123')).rejects.toThrow(/already/i);
        });
    });

    describe('bulkUpdateCardStatus', () => {
        it('updates every card of the list to the given status', async () => {
            prisma.list.findFirst.mockResolvedValue({ id: 'l1', userId: 'u1' });
            prisma.card.updateMany.mockResolvedValue({ count: 7 });

            const result = await service.bulkUpdateCardStatus('u1', 'l1', 'WATCHED' as any);

            expect(prisma.card.updateMany).toHaveBeenCalledWith({
                where: { listId: 'l1', userId: 'u1' },
                data: { status: 'WATCHED' },
            });
            expect(result.updatedCount).toBe(7);
        });
    });
});
