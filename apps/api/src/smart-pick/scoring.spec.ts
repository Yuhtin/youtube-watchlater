import { scoreCard, type ScoreContext, type ScoreInput } from './scoring';
import { DEFAULT_SMART_PICK_WEIGHTS } from './weights';

const baseCtx = (overrides: Partial<ScoreContext> = {}): ScoreContext => ({
    targetSeconds: 1800,
    now: new Date('2026-05-25T00:00:00Z'),
    weights: DEFAULT_SMART_PICK_WEIGHTS,
    pickedChannelIds: new Set(),
    listsWithActiveSession: new Set(),
    ...overrides,
});

const card = (over: Partial<ScoreInput> = {}): ScoreInput => ({
    id: 'c1',
    durationSeconds: 1500,
    addedAt: new Date('2026-05-23T00:00:00Z'),
    listId: 'l1',
    channelId: 'ch1',
    listYoutubePlaylistId: null,
    ...over,
});

describe('scoreCard', () => {
    it('rejects cards that exceed target * 1.1', () => {
        const result = scoreCard(card({ durationSeconds: 2200 }), baseCtx({ targetSeconds: 1800 }));
        expect(result.eligible).toBe(false);
    });

    it('scores older cards higher when other factors are tied', () => {
        const a = scoreCard(card({ addedAt: new Date('2025-12-01') }), baseCtx());
        const b = scoreCard(card({ addedAt: new Date('2026-05-24') }), baseCtx());
        expect(a.score).toBeGreaterThan(b.score);
    });

    it('bumps continuation when the list has a WATCHING card and youtubePlaylistId is set', () => {
        const ctx = baseCtx({
            listsWithActiveSession: new Set(['l1']),
        });
        const withSession = scoreCard(card({ listYoutubePlaylistId: 'PL1' }), ctx);
        const withoutSession = scoreCard(card({ listYoutubePlaylistId: 'PL1' }), baseCtx());
        expect(withSession.score).toBeGreaterThan(withoutSession.score);
    });

    it('penalises a card whose channelId already appeared in the picked set', () => {
        const ctx = baseCtx({ pickedChannelIds: new Set(['ch1']) });
        const same = scoreCard(card({ channelId: 'ch1' }), ctx);
        const different = scoreCard(card({ channelId: 'ch2' }), ctx);
        expect(different.score).toBeGreaterThan(same.score);
    });

    it('emits a list of human-readable reasons matching the dominant factors', () => {
        const result = scoreCard(card({ addedAt: new Date('2025-11-01') }), baseCtx({ targetSeconds: 1800 }));
        expect(result.reasons).toEqual(expect.arrayContaining([expect.stringMatching(/old/i)]));
    });
});
