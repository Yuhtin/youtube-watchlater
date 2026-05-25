"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, User, Youtube, Film, Inbox, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "sonner";
import Image from "next/image";
import CreateUserModal from "../../components/CreateUserModal";
import { getRandomColor } from "../../lib/utils";

interface User {
    id: string;
    username: string;
    imageUrl: string | null;
    createdAt: string;
    _count: {
        cards: number;
    };
}

export default function CollectionsPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const router = useRouter();

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/users`);
            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            } else {
                toast.error("Failed to fetch users");
            }
        } catch (error) {
            toast.error("Error loading users");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUserClick = (userId: string, username: string) => {
        const element = document.getElementById(`user-${userId}`);
        if (element) {
            element.classList.add('scale-95', 'opacity-50');
            setTimeout(() => {
                localStorage.setItem("currentWatchlaterUsername", username);
                router.push(`/login/${userId}`);
            }, 200);
        } else {
            localStorage.setItem("currentWatchlaterUsername", username);
            router.push(`/login/${userId}`);
        }
    };

    const handleCreateSuccess = () => {
        fetchUsers();
        setIsModalOpen(false);
    };

    const filteredUsers = users.filter(user =>
        user.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-paper text-ink font-mono p-6 md:p-10">
            <Toaster position="top-center" expand={false} richColors />

            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="border-2 border-ink p-6 mb-10 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-12 h-12 border-2 border-ink bg-accent">
                            <Youtube className="w-6 h-6 text-paper" />
                        </div>
                        <div>
                            <h1 className="font-display font-black text-2xl md:text-3xl tracking-tighter lowercase">
                                [WATCHLATER]
                            </h1>
                            <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
                                pick a collection
                            </p>
                        </div>
                    </div>

                    <div className="w-full md:w-auto relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <input
                            type="text"
                            placeholder="search collections..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full md:w-64 border-1.5 border-ink bg-white font-mono px-3 py-2 pl-9 text-[13px] focus:outline-none focus:shadow-brutal-red transition-all"
                        />
                    </div>
                </div>

                {/* Collections list */}
                <div className="mb-10">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="font-display font-black text-xl tracking-tighter lowercase">
                            your collections
                        </h2>
                        <span className="border-1.5 border-ink px-3 py-1 text-[11px] font-bold font-mono">
                            {users.length} {users.length === 1 ? 'collection' : 'collections'}
                        </span>
                    </div>

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center my-20 gap-4">
                            <Loader2 className="w-10 h-10 text-accent animate-spin" />
                            <p className="text-[12px] font-mono text-neutral-500">loading collections...</p>
                        </div>
                    ) : users.length === 0 ? (
                        <div className="text-center py-20 border-2 border-ink bg-white">
                            <div className="w-16 h-16 mx-auto border-2 border-ink flex items-center justify-center mb-5">
                                <Inbox className="w-8 h-8 text-ink" />
                            </div>
                            <h3 className="font-display font-black text-xl tracking-tighter lowercase mb-2">
                                no collections yet
                            </h3>
                            <p className="text-[12px] text-neutral-500 max-w-md mx-auto mb-8 font-mono">
                                create your first watch later collection to organize your youtube videos
                            </p>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="bg-ink text-paper border-2 border-ink shadow-brutal-red font-bold text-[12px] font-mono px-6 py-3 flex items-center mx-auto gap-2 hover:opacity-90 transition-opacity"
                            >
                                <Plus className="w-4 h-4" /> create new collection
                            </button>
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="text-center py-20 border-2 border-ink bg-white">
                            <Search className="w-12 h-12 mx-auto text-neutral-300 mb-4" />
                            <h3 className="font-display font-black text-xl tracking-tighter lowercase">
                                no results found
                            </h3>
                            <p className="text-[12px] text-neutral-500 mt-2 font-mono">try a different search term</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {filteredUsers.map((user) => (
                                <div
                                    id={`user-${user.id}`}
                                    key={user.id}
                                    onClick={() => handleUserClick(user.id, user.username)}
                                    className="bg-white border-1.5 border-ink p-4 cursor-pointer hover:shadow-brutal-red transition-all duration-150 group"
                                >
                                    <div className={`h-24 bg-gradient-to-r ${getRandomColor(user.username)} border-b border-ink flex items-center justify-center -mx-4 -mt-4 mb-4`}>
                                        {user.imageUrl ? (
                                            <Image
                                                src={user.imageUrl}
                                                alt={user.username}
                                                width={72}
                                                height={72}
                                                className="border-2 border-ink"
                                            />
                                        ) : (
                                            <div className="w-16 h-16 border-2 border-ink bg-paper flex items-center justify-center">
                                                <User className="w-8 h-8 text-ink" />
                                            </div>
                                        )}
                                    </div>

                                    <h3 className="font-bold text-[13px] font-mono text-ink mb-1 flex items-center gap-2">
                                        {user.username}
                                        {user._count.cards > 15 && (
                                            <span className="text-[9px] font-bold bg-accent text-paper px-1.5 py-0.5 uppercase tracking-wider">
                                                hot
                                            </span>
                                        )}
                                    </h3>
                                    <div className="flex justify-between items-center">
                                        <p className="text-[11px] text-neutral-500 flex items-center gap-1 font-mono">
                                            <Film className="w-3 h-3" />
                                            {user._count.cards} {user._count.cards === 1 ? 'video' : 'videos'}
                                        </p>
                                        <span className="text-[10px] font-bold text-accent font-mono group-hover:underline">
                                            open →
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <button
                onClick={() => setIsModalOpen(true)}
                className="fixed bottom-8 right-8 bg-ink text-paper border-2 border-ink shadow-brutal-red p-4 hover:opacity-90 transition-opacity"
                aria-label="Create new watchlater"
            >
                <Plus className="w-6 h-6" />
            </button>

            <CreateUserModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleCreateSuccess}
            />
        </div>
    );
}
