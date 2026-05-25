import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_SMART_PICK_WEIGHTS } from './weights';
import { scoreCard, type ScoreInput, type ScoreContext } from './scoring';

interface TonightInput {
    timeMinutes: number;
    listId?: string;
    excludeVideoIds?: string[];
}

@Injectable()
export class SmartPickService {
    constructor(private readonly prisma: PrismaService) { }

    async tonight(userId: string, input: TonightInput) {
        const targetSeconds = input.timeMinutes * 60;
        const cards = await this.loadCandidates(userId, input.listId, input.excludeVideoIds);

        const ctx = await this.buildContext(userId, targetSeconds, new Set());

        const scored = cards
            .map((c) => ({ card: c, result: scoreCard(this.toScoreInput(c), ctx) }))
            .filter((s) => s.result.eligible)
            .sort((a, b) => b.result.score - a.result.score);

        if (scored.length === 0) {
            const shortest = [...cards]
                .filter((c) => c.durationSeconds != null)
                .sort((a, b) => (a.durationSeconds ?? 0) - (b.durationSeconds ?? 0))
                .slice(0, 2);
            return { card: null, shortest, reasons: [] as string[] };
        }

        const top = scored[0];
        return { card: top.card, reasons: top.result.reasons, shortest: [] as any[] };
    }

    private async loadCandidates(userId: string, listId?: string, excludeVideoIds?: string[]) {
        return this.prisma.card.findMany({
            where: {
                userId,
                ...(listId ? { listId } : {}),
                status: { in: ['WATCH_LATER', 'WATCHING'] },
                ...(excludeVideoIds?.length ? { videoId: { notIn: excludeVideoIds } } : {}),
            },
            include: { list: { select: { youtubePlaylistId: true } } },
        });
    }

    private async buildContext(userId: string, targetSeconds: number, pickedChannelIds: Set<string>): Promise<ScoreContext> {
        const watching = await this.prisma.card.findMany({
            where: { userId, status: 'WATCHING' },
            select: { listId: true },
            distinct: ['listId'],
        });
        return {
            targetSeconds,
            now: new Date(),
            weights: DEFAULT_SMART_PICK_WEIGHTS,
            pickedChannelIds,
            listsWithActiveSession: new Set(watching.map((c: any) => c.listId)),
        };
    }

    private toScoreInput(c: any): ScoreInput {
        return {
            id: c.id,
            durationSeconds: c.durationSeconds,
            addedAt: c.addedAt,
            listId: c.listId,
            channelId: c.channelId ?? null,
            listYoutubePlaylistId: c.list?.youtubePlaylistId ?? null,
        };
    }
}
