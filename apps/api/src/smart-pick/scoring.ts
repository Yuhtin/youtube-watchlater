import type { SmartPickWeights } from './weights';

const DAY = 1000 * 60 * 60 * 24;
const MAX_AGE_DAYS = 90;
const DURATION_OVERSHOOT_RATIO = 1.1;

export interface ScoreInput {
    id: string;
    durationSeconds: number | null;
    addedAt: Date;
    listId: string;
    channelId: string | null;
    listYoutubePlaylistId: string | null;
}

export interface ScoreContext {
    targetSeconds: number;
    now: Date;
    weights: SmartPickWeights;
    pickedChannelIds: Set<string>;
    listsWithActiveSession: Set<string>;
}

export interface ScoreResult {
    eligible: boolean;
    score: number;
    reasons: string[];
}

export function scoreCard(card: ScoreInput, ctx: ScoreContext): ScoreResult {
    const duration = card.durationSeconds ?? Infinity;
    if (duration > ctx.targetSeconds * DURATION_OVERSHOOT_RATIO) {
        return { eligible: false, score: 0, reasons: [] };
    }

    const ageDays = (ctx.now.getTime() - card.addedAt.getTime()) / DAY;
    const ageScore = Math.min(ageDays / MAX_AGE_DAYS, 1);

    const fitScore = Math.max(
        0,
        1 - Math.abs(duration - ctx.targetSeconds) / ctx.targetSeconds,
    );

    const continuationScore =
        card.listYoutubePlaylistId && ctx.listsWithActiveSession.has(card.listId) ? 1 : 0;

    const diversityScore =
        card.channelId && ctx.pickedChannelIds.has(card.channelId) ? 0 : 1;

    const score =
        ctx.weights.age * ageScore +
        ctx.weights.fit * fitScore +
        ctx.weights.continuation * continuationScore +
        ctx.weights.diversity * diversityScore;

    const reasons: string[] = [];
    if (ageScore >= 0.5) reasons.push(`old (${Math.floor(ageDays)}d)`);
    if (fitScore >= 0.7) reasons.push(`fits ${Math.round(ctx.targetSeconds / 60)}m slot`);
    if (continuationScore > 0) reasons.push('continues active series');
    if (diversityScore > 0 && card.channelId) reasons.push('new channel');

    return { eligible: true, score, reasons };
}
