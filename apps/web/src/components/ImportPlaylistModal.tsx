'use client';
import { Dialog } from '@headlessui/react';
import { useState } from 'react';
import { apiRequest } from '@/src/auth/utility';

interface Props {
    open: boolean;
    onClose: () => void;
    onImported: () => void;
}

export function ImportPlaylistModal({ open, onClose, onImported }: Props) {
    const [url, setUrl] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const submit = async () => {
        if (!url.trim()) return;
        setError(null);
        setSaving(true);
        const r = await apiRequest('/lists/import', { method: 'POST', body: { url } });
        setSaving(false);
        if (r && r.id) {
            setUrl('');
            onImported();
            onClose();
        } else if (r && typeof r.message === 'string' && r.message.toLowerCase().includes('already')) {
            setError('Playlist already imported');
        } else {
            setError('Could not import — check the URL');
        }
    };

    return (
        <Dialog open={open} onClose={onClose} className="relative z-50">
            <div className="fixed inset-0 bg-black/50" />
            <div className="fixed inset-0 flex items-center justify-center">
                <Dialog.Panel className="bg-paper border-2 border-ink shadow-brutal-red w-[360px]">
                    <div className="border-b-2 border-ink p-2 px-3 flex justify-between text-[11px] font-bold">
                        <span>▶ IMPORT_FROM_YT</span>
                        <button onClick={onClose}>[x]</button>
                    </div>
                    <div className="p-4">
                        <label className="block text-[10px] font-bold mb-2">PLAYLIST URL</label>
                        <input
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://www.youtube.com/playlist?list=..."
                            className="w-full border-1.5 border-ink bg-white px-2 py-1.5 text-[12px] font-mono"
                            autoFocus
                        />
                        {error && <div className="text-[10px] text-accent mt-2 font-bold">! {error}</div>}
                        <div className="flex gap-1.5 mt-3">
                            <button
                                onClick={submit}
                                disabled={!url.trim() || saving}
                                className="flex-1 bg-ink text-paper px-4 py-2 text-[11px] font-bold border-2 border-ink shadow-brutal-red disabled:opacity-50"
                            >
                                {saving ? 'IMPORTING…' : '▶ IMPORT'}
                            </button>
                            <button onClick={onClose} className="border-2 border-ink px-3 py-2 text-[11px] font-bold">
                                CANCEL
                            </button>
                        </div>
                    </div>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
}
