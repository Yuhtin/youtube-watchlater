'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
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

interface List {
    id: string;
    name: string;
    isDefault: boolean;
}

const MIN_MIN = 15;
const MAX_MIN = 180;

export default function QueuePage() {
    const params = useParams();
    const userId = params?.userId as string;

    const [lists, setLists] = useState<List[]>([]);
    const [scopeListId, setScopeListId] = useState<string | null>(null); // null = all
    const [timeMinutes, setTimeMinutes] = useState(60);
    const [cards, setCards] = useState<Card[]>([]);
    const [reasons, setReasons] = useState<string[][]>([]);
    const [loading, setLoading] = useState(false);

    // Initial lists load
    useEffect(() => {
        apiRequest('/lists').then((r) => {
            if (Array.isArray(r)) setLists(r);
        });
    }, []);

    const regenerate = async () => {
        setLoading(true);
        const r = await apiRequest('/smart-pick/queue', {
            method: 'POST',
            body: {
                timeMinutes,
                listId: scopeListId ?? undefined,
            },
        });
        setLoading(false);
        setCards(Array.isArray(r?.cards) ? r.cards : []);
        setReasons(Array.isArray(r?.reasons) ? r.reasons : []);
    };

    const swap = async (idx: number) => {
        const keep = cards.filter((_, i) => i !== idx).map((c) => c.videoId);
        setLoading(true);
        const r = await apiRequest('/smart-pick/queue/swap', {
            method: 'POST',
            body: { timeMinutes, listId: scopeListId ?? undefined, keepVideoIds: keep },
        });
        setLoading(false);
        if (r?.card) {
            const next = [...cards];
            next[idx] = r.card;
            setCards(next);
            const nextReasons = [...reasons];
            nextReasons[idx] = Array.isArray(r.reasons) ? r.reasons : [];
            setReasons(nextReasons);
        }
    };

    const startQueue = () => {
        if (cards.length === 0) return;
        if (cards[0]?.url) window.open(cards[0].url, '_blank');
    };

    const formatDuration = (s?: number | null) => {
        if (!s) return '';
        const m = Math.round(s / 60);
        return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
    };

    const totalSeconds = cards.reduce((acc, c) => acc + (c.durationSeconds ?? 0), 0);

    return (
        <div className="min-h-screen bg-paper text-ink font-mono p-6">
            <div className="max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-6 border-b-2 border-ink pb-3">
                    <div>
                        <h1 className="font-display font-black text-[26px] lowercase tracking-tight">tonight&apos;s queue</h1>
                        <div className="text-[10px] text-neutral-500 mt-1">
                            target: <strong>{timeMinutes}m</strong> · generated: <strong>{formatDuration(totalSeconds)}</strong> · {cards.length} {cards.length === 1 ? 'video' : 'videos'}
                        </div>
                    </div>
                    <Link
                        href={`/watchlater/${userId}`}
                        className="border-2 border-ink px-3 py-1.5 text-[11px] font-bold hover:bg-ink hover:text-paper"
                    >
                        ← BOARD
                    </Link>
                </div>

                <div className="bg-white border-1.5 border-ink p-3 mb-3">
                    <div className="text-[10px] font-bold mb-2 tracking-wider">▸ SCOPE</div>
                    <div className="flex gap-1 mb-4 flex-wrap">
                        <button
                            onClick={() => setScopeListId(null)}
                            className={`border-1.5 border-ink px-2 py-1 text-[10px] font-bold ${
                                scopeListId === null ? 'bg-ink text-paper' : 'bg-white'
                            }`}
                        >
                            all lists
                        </button>
                        {lists.map((l) => (
                            <button
                                key={l.id}
                                onClick={() => setScopeListId(l.id)}
                                className={`border-1.5 border-ink px-2 py-1 text-[10px] font-bold ${
                                    scopeListId === l.id ? 'bg-ink text-paper' : 'bg-white'
                                }`}
                            >
                                {l.name}
                            </button>
                        ))}
                    </div>

                    <div className="text-[10px] font-bold mb-2 tracking-wider">▸ TIME · <strong>{timeMinutes}m</strong></div>
                    <input
                        type="range"
                        min={MIN_MIN}
                        max={MAX_MIN}
                        step={5}
                        value={timeMinutes}
                        onChange={(e) => setTimeMinutes(parseInt(e.target.value, 10))}
                        className="w-full accent-accent"
                    />
                    <div className="flex justify-between text-[9px] text-neutral-500 mt-1">
                        <span>{MIN_MIN}m</span>
                        <span>{MAX_MIN}m</span>
                    </div>
                </div>

                <div className="flex gap-1.5 mb-4">
                    <button
                        onClick={regenerate}
                        disabled={loading}
                        className="flex-1 bg-ink text-paper px-4 py-2 text-[11px] font-bold border-2 border-ink shadow-brutal-red disabled:opacity-50"
                    >
                        {loading ? 'GENERATING…' : '↻ GENERATE QUEUE'}
                    </button>
                    {cards.length > 0 && (
                        <button
                            onClick={startQueue}
                            className="border-2 border-ink px-3 py-2 text-[11px] font-bold"
                        >
                            ▶ START QUEUE
                        </button>
                    )}
                </div>

                {cards.length === 0 && !loading && (
                    <div className="text-center text-[11px] text-neutral-500 py-10 border-1.5 border-dashed border-neutral-400">
                        [ NO QUEUE YET — set scope + time, then generate ]
                    </div>
                )}

                {cards.map((c, i) => (
                    <div key={c.id} className="bg-white border-1.5 border-ink p-2 mb-2 flex items-center gap-2">
                        <div className="font-display font-black text-[16px] w-6">{String(i + 1).padStart(2, '0')}</div>
                        <div className="w-14 h-9 bg-neutral-200 border-1.5 border-ink overflow-hidden flex-shrink-0">
                            {c.thumbnailUrl && <img src={c.thumbnailUrl} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-bold line-clamp-1">{c.title}</div>
                            <div className="text-[8px] text-neutral-500 mt-0.5">
                                {formatDuration(c.durationSeconds)}{c.channelTitle ? ` · ${c.channelTitle}` : ''}
                            </div>
                            {reasons[i]?.length > 0 && (
                                <div className="text-[8px] text-neutral-700 mt-0.5">
                                    ▸ {reasons[i].join(' · ')}
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => swap(i)}
                            className="text-[9px] font-bold border-1.5 border-ink px-2 py-1 hover:bg-ink hover:text-paper"
                        >
                            ↻ swap
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
