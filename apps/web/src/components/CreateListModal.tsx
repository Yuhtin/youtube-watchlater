'use client';
import { Dialog } from '@headlessui/react';
import { useState } from 'react';
import { apiRequest } from '@/src/auth/utility';

interface Props {
    open: boolean;
    onClose: () => void;
    onCreated: () => void;
}

export function CreateListModal({ open, onClose, onCreated }: Props) {
    const [name, setName] = useState('');
    const [saving, setSaving] = useState(false);

    const submit = async () => {
        if (!name.trim()) return;
        setSaving(true);
        const r = await apiRequest('/lists', { method: 'POST', body: { name } });
        setSaving(false);
        if (r && r.id) {
            setName('');
            onCreated();
            onClose();
        }
    };

    return (
        <Dialog open={open} onClose={onClose} className="relative z-50">
            <div className="fixed inset-0 bg-black/50" />
            <div className="fixed inset-0 flex items-center justify-center">
                <Dialog.Panel className="bg-paper border-2 border-ink shadow-brutal-red w-[320px]">
                    <div className="border-b-2 border-ink p-2 px-3 flex justify-between text-[11px] font-bold">
                        <span>▶ NEW_LIST</span>
                        <button onClick={onClose}>[x]</button>
                    </div>
                    <div className="p-4">
                        <label className="block text-[10px] font-bold mb-2">NAME</label>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full border-1.5 border-ink bg-white px-2 py-1.5 text-[12px] font-mono"
                            autoFocus
                        />
                        <div className="flex gap-1.5 mt-3">
                            <button
                                onClick={submit}
                                disabled={!name.trim() || saving}
                                className="flex-1 bg-ink text-paper px-4 py-2 text-[11px] font-bold border-2 border-ink shadow-brutal-red disabled:opacity-50"
                            >
                                ▶ CREATE
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
