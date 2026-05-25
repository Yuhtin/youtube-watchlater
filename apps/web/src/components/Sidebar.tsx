'use client';
import { apiRequest } from '@/src/auth/utility';
import { useEffect, useState } from 'react';

export interface List {
    id: string;
    name: string;
    isDefault: boolean;
    youtubePlaylistId: string | null;
    _count: { cards: number };
}

interface Props {
    activeListId: string | null;
    onSelect: (listId: string) => void;
    onNewList: () => void;
    onImportPlaylist: () => void;
    refreshKey?: number;
}

export function Sidebar({ activeListId, onSelect, onNewList, onImportPlaylist, refreshKey }: Props) {
    const [lists, setLists] = useState<List[]>([]);

    useEffect(() => {
        apiRequest('/lists').then((r) => Array.isArray(r) && setLists(r));
    }, [refreshKey]);

    return (
        <aside className="border-r-2 border-ink bg-white p-3 w-[180px] h-full">
            <div className="text-[9px] font-bold tracking-[1.5px] text-neutral-500 mb-2.5">▸ MY_LISTS</div>
            {lists.map((l) => {
                const isActive = l.id === activeListId;
                return (
                    <button
                        key={l.id}
                        onClick={() => onSelect(l.id)}
                        className={`block w-full text-left px-2 py-1.5 text-[11px] flex justify-between mb-1 ${
                            isActive ? 'bg-ink text-paper font-bold' : 'hover:bg-paper'
                        }`}
                    >
                        <span>{l.youtubePlaylistId ? `// ${l.name}` : l.name}</span>
                        <span className="text-[9px] opacity-60">{l._count.cards}</span>
                    </button>
                );
            })}
            <div className="mt-3.5 pt-2.5 border-t border-dashed border-ink space-y-1">
                <button onClick={onNewList} className="text-[10px] font-bold w-full text-left">+ NEW_LIST()</button>
                <button onClick={onImportPlaylist} className="text-[10px] font-bold w-full text-left">+ IMPORT_FROM_YT()</button>
            </div>
        </aside>
    );
}
