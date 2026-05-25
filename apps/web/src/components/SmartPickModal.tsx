'use client';
import { Dialog } from '@headlessui/react';
import { useState } from 'react';
import { apiRequest } from '@/src/auth/utility';

interface Card {
    id: string;
    videoId: string;
    title: string;
    url: string;
    thumbnailUrl: string;
    durationSeconds?: number | null;
    channelTitle?: string | null;
}

interface Props {
    open: boolean;
    onClose: () => void;
    activeListId: string | null;
    onWatch: (card: Card) => void; // parent handles "open in YouTube + mark WATCHING"
}

const SLOTS = [
    { label: '15m', minutes: 15 },
    { label: '30m', minutes: 30 },
    { label: '1h', minutes: 60 },
    { label: '2h+', minutes: 120 },
];

export function SmartPickModal({ open, onClose, activeListId, onWatch }: Props) {
    const [slot, setSlot] = useState<{ label: string; minutes: number } | null>(null);
    const [card, setCard] = useState<Card | null>(null);
    const [reasons, setReasons] = useState<string[]>([]);
    const [shortest, setShortest] = useState<Card[]>([]);
    const [rolled, setRolled] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    const reset = () => {
        setSlot(null);
        setCard(null);
        setReasons([]);
        setShortest([]);
        setRolled([]);
    };

    const pickFor = async (chosen: { label: string; minutes: number }, exclude: string[] = []) => {
        setLoading(true);
        const r = await apiRequest('/smart-pick/tonight', {
            method: 'POST',
            body: {
                timeMinutes: chosen.minutes,
                listId: activeListId ?? undefined,
                excludeVideoIds: exclude,
            },
        });
        setLoading(false);
        setSlot(chosen);
        setCard(r?.card ?? null);
        setReasons(Array.isArray(r?.reasons) ? r.reasons : []);
        setShortest(Array.isArray(r?.shortest) ? r.shortest : []);
    };

    const handleSlot = (s: typeof SLOTS[number]) => {
        setRolled([]);
        pickFor(s, []);
    };

    const handleAnother = () => {
        if (!slot) return;
        const next = card ? [...rolled, card.videoId] : rolled;
        setRolled(next);
        pickFor(slot, next);
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    const formatDuration = (s?: number | null) => {
        if (!s) return '';
        const m = Math.round(s / 60);
        return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
    };

    return (
        <Dialog open={open} onClose={handleClose} className="relative z-50">
            <div className="fixed inset-0 bg-black/50" />
            <div className="fixed inset-0 flex items-center justify-center">
                <Dialog.Panel className="bg-paper border-2 border-ink shadow-brutal-red w-[340px]">
                    <div className="border-b-2 border-ink p-2 px-3 flex justify-between text-[11px] font-bold font-mono">
                        <span>▶ SMART_PICK · TONIGHT</span>
                        <button onClick={handleClose}>[x]</button>
                    </div>

                    <div className="p-4 font-mono">
                        <div className="text-[10px] text-neutral-500 mb-2 font-bold tracking-wider">// I HAVE</div>
                        <div className="flex gap-1 mb-4">
                            {SLOTS.map((s) => {
                                const active = slot?.label === s.label;
                                return (
                                    <button
                                        key={s.label}
                                        onClick={() => handleSlot(s)}
                                        className={`border-1.5 border-ink px-2 py-1 text-[10px] font-bold ${
                                            active ? 'bg-ink text-paper' : 'bg-white'
                                        }`}
                                    >
                                        {s.label}
                                    </button>
                                );
                            })}
                        </div>

                        {loading && (
                            <div className="text-[11px] text-neutral-500 py-6 text-center">// thinking…</div>
                        )}

                        {!loading && slot && !card && shortest.length > 0 && (
                            <div className="bg-white border-1.5 border-ink p-3 mb-3">
                                <div className="text-[10px] font-bold mb-2">[ NO FIT FOR {slot.label} ]</div>
                                <div className="text-[9px] text-neutral-500 mb-2">shortest in your backlog:</div>
                                {shortest.map((s) => (
                                    <div key={s.videoId} className="text-[10px] mb-1 flex justify-between">
                                        <span className="truncate flex-1 mr-2">{s.title}</span>
                                        <span className="text-neutral-500 text-[9px]">{formatDuration(s.durationSeconds)}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {!loading && card && (
                            <>
                                <div className="bg-white border-1.5 border-ink p-2 mb-2">
                                    <div className="aspect-video bg-neutral-200 mb-2 border-1.5 border-ink overflow-hidden">
                                        <img src={card.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="font-display font-black text-[14px] leading-tight mb-1 lowercase">
                                        {card.title}
                                    </div>
                                    <div className="text-[9px] text-neutral-500">
                                        {formatDuration(card.durationSeconds)}
                                        {card.channelTitle ? ` · ${card.channelTitle}` : ''}
                                    </div>
                                    {reasons.length > 0 && (
                                        <div className="mt-2 pt-2 border-t border-dashed border-neutral-300 text-[9px] text-neutral-700">
                                            ▸ matched: <span className="font-bold">{reasons.join(' · ')}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-1.5">
                                    <button
                                        onClick={() => onWatch(card)}
                                        className="flex-1 bg-ink text-paper px-4 py-2 text-[11px] font-bold border-2 border-ink shadow-brutal-red"
                                    >
                                        ▶ WATCH NOW
                                    </button>
                                    <button
                                        onClick={handleAnother}
                                        className="border-2 border-ink px-3 py-2 text-[11px] font-bold"
                                    >
                                        ↻ ANOTHER
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
}
