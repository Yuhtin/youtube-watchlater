import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { SmartPickService } from './smart-pick.service';

describe('SmartPickService.tonight', () => {
    let service: SmartPickService;
    let prisma: any;

    beforeEach(async () => {
        prisma = {
            card: { findMany: jest.fn() },
        };
        const mod = await Test.createTestingModule({
            providers: [SmartPickService, { provide: PrismaService, useValue: prisma }],
        }).compile();
        service = mod.get(SmartPickService);
    });

    it('returns null + a hint if no card fits the target', async () => {
        // both calls return same: card list with one too-long card
        prisma.card.findMany.mockImplementation((args: any) => {
            if (args?.distinct?.[0] === 'listId') return Promise.resolve([]);
            return Promise.resolve([
                { id: 'c1', durationSeconds: 5400, addedAt: new Date('2025-01-01'), listId: 'l1', channelId: null, list: { youtubePlaylistId: null }, title: 't', url: 'u', thumbnailUrl: 't', videoId: 'v1' },
            ]);
        });

        const result = await service.tonight('u1', { timeMinutes: 15 });

        expect(result.card).toBeNull();
        expect(result.shortest).toHaveLength(1);
    });

    it('picks the highest-scoring eligible card', async () => {
        prisma.card.findMany.mockImplementation((args: any) => {
            if (args?.distinct?.[0] === 'listId') return Promise.resolve([]);
            return Promise.resolve([
                { id: 'fresh', durationSeconds: 1200, addedAt: new Date('2026-05-24'), listId: 'l1', channelId: 'c1', list: { youtubePlaylistId: null }, title: 'fresh', url: 'u', thumbnailUrl: 't', videoId: 'v1' },
                { id: 'old',   durationSeconds: 1200, addedAt: new Date('2025-11-01'), listId: 'l1', channelId: 'c2', list: { youtubePlaylistId: null }, title: 'old',   url: 'u', thumbnailUrl: 't', videoId: 'v2' },
            ]);
        });

        const result = await service.tonight('u1', { timeMinutes: 20 });

        expect(result.card?.id).toBe('old');
        expect(result.reasons).toEqual(expect.arrayContaining([expect.any(String)]));
    });
});
