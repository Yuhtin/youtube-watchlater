"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, User, Youtube, Film, Sparkles, Clock, Inbox, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "sonner";
import Image from "next/image";
import CreateUserModal from "../components/CreateUserModal";

interface User {
    id: string;
    username: string;
    imageUrl: string | null;
    createdAt: string;
    _count: {
        cards: number;
    };
}

export default function HomePage() {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const router = useRouter();

    useEffect(() => {
        fetchUsers();

        const handleMouseMove = (e: MouseEvent) => {
            const bgElements = document.querySelectorAll('.parallax-bg');
            const x = e.clientX / window.innerWidth;
            const y = e.clientY / window.innerHeight;

            bgElements.forEach(el => {
                const element = el as HTMLElement;
                const speed = parseFloat(element.getAttribute('data-speed') || '0.05');
                const offsetX = (x - 0.5) * speed * 100;
                const offsetY = (y - 0.5) * speed * 100;
                element.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
            });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    useEffect(() => {
        const style = document.createElement('style');
        style.innerHTML = `
            @keyframes border-flow {
                0% {
                    background-image: 
                        linear-gradient(90deg, rgba(56, 189, 248, 0), rgba(56, 189, 248, 0.8) 50%, rgba(236, 72, 153, 0.8) 100%),
                        linear-gradient(0deg, rgba(56, 189, 248, 0.8) 0%, rgba(99, 102, 241, 0.8) 50%, rgba(236, 72, 153, 0) 100%);
                    background-position: 0% 0%, 100% 0%;
                }
                25% {
                    background-image: 
                        linear-gradient(0deg, rgba(56, 189, 248, 0), rgba(99, 102, 241, 0.8) 50%, rgba(236, 72, 153, 0.8) 100%),
                        linear-gradient(90deg, rgba(236, 72, 153, 0.8) 0%, rgba(99, 102, 241, 0.8) 50%, rgba(56, 189, 248, 0) 100%);
                    background-position: 0% 100%, 0% 0%;
                }
                50% {
                    background-image: 
                        linear-gradient(270deg, rgba(236, 72, 153, 0), rgba(99, 102, 241, 0.8) 50%, rgba(56, 189, 248, 0.8) 100%),
                        linear-gradient(0deg, rgba(236, 72, 153, 0.8) 0%, rgba(99, 102, 241, 0.8) 50%, rgba(56, 189, 248, 0) 100%);
                    background-position: 0% 0%, 0% 100%;
                }
                75% {
                    background-image: 
                        linear-gradient(180deg, rgba(236, 72, 153, 0), rgba(99, 102, 241, 0.8) 50%, rgba(56, 189, 248, 0.8) 100%),
                        linear-gradient(270deg, rgba(56, 189, 248, 0.8) 0%, rgba(99, 102, 241, 0.8) 50%, rgba(236, 72, 153, 0) 100%);
                    background-position: 100% 0%, 0% 0%;
                }
                100% {
                    background-image: 
                        linear-gradient(90deg, rgba(56, 189, 248, 0), rgba(56, 189, 248, 0.8) 50%, rgba(236, 72, 153, 0.8) 100%),
                        linear-gradient(0deg, rgba(56, 189, 248, 0.8) 0%, rgba(99, 102, 241, 0.8) 50%, rgba(236, 72, 153, 0) 100%);
                    background-position: 0% 0%, 100% 0%;
                }
            }
            .animate-border-flow {
                animation: border-flow 4s linear infinite;
            }
        `;
        document.head.appendChild(style);

        return () => {
            document.head.removeChild(style);
        };
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

    const getRandomColor = (username: string) => {
        const colors = [
            "from-indigo-400 to-purple-600",
            "from-blue-400 to-cyan-600",
            "from-emerald-400 to-teal-600",
            "from-amber-400 to-orange-600",
            "from-pink-400 to-rose-600",
            "from-violet-400 to-purple-600",
        ];

        let hash = 0;
        for (let i = 0; i < username.length; i++) {
            hash += username.charCodeAt(i);
        }

        return colors[hash % colors.length];
    };

    const filteredUsers = users.filter(user =>
        user.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 md:p-10 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-30">
                <div className="parallax-bg absolute -top-20 -left-20 w-80 h-80 rounded-full bg-gradient-to-r from-blue-500/20 to-cyan-500/20 blur-3xl" data-speed="0.03"></div>
                <div className="parallax-bg absolute top-1/3 -right-20 w-96 h-96 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 blur-3xl" data-speed="0.05"></div>
                <div className="parallax-bg absolute -bottom-20 left-1/3 w-72 h-72 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 blur-3xl" data-speed="0.04"></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto">
                <Toaster
                    position="top-center"
                    expand={false}
                    richColors
                    toastOptions={{
                        style: {
                            background: "rgba(255, 255, 255, 0.1)",
                            backdropFilter: "blur(12px)",
                            color: "white",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                        },
                    }}
                />

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-10 shadow-xl">
                    <div className="flex flex-col md:flex-row justify-between items-center">
                        <div className="flex items-center">
                            <div className="flex justify-center items-center w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 shadow-lg mr-4">
                                <Youtube className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">
                                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-300">
                                        Watch Later
                                    </span>
                                </h1>
                                <p className="text-white/60 text-sm md:text-base">
                                    Organize your YouTube watching experience
                                </p>
                            </div>
                        </div>

                        <div className="mt-4 md:mt-0 w-full md:w-auto">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
                                <input
                                    type="text"
                                    placeholder="Search collections..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full md:w-64 bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-white/40"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mb-10">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center">
                            <Clock className="w-5 h-5 text-white/70 mr-2" />
                            <h2 className="text-xl font-semibold text-white">
                                Your Collections
                            </h2>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full">
                            <p className="text-white/70 text-sm">
                                {users.length} {users.length === 1 ? 'Collection' : 'Collections'}
                            </p>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center my-20">
                            <Loader2 className="w-12 h-12 text-blue-400 animate-spin mb-4" />
                            <p className="text-white/60">Loading collections...</p>
                        </div>
                    ) : users.length === 0 ? (
                        <div className="text-center py-20 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-lg">
                            <div className="w-20 h-20 mx-auto bg-white/10 rounded-full flex items-center justify-center mb-5">
                                <Inbox className="w-10 h-10 text-white/40" />
                            </div>
                            <h3 className="text-white/90 text-xl font-bold mb-2">No collections yet</h3>
                            <p className="text-white/50 max-w-md mx-auto mb-8">
                                Create your first watch later collection to organize your YouTube videos
                            </p>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 px-6 py-3 rounded-xl text-white font-medium shadow-lg transition-all duration-300 flex items-center mx-auto"
                            >
                                <Plus className="w-5 h-5 mr-2" /> Create New Collection
                            </button>
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="text-center py-20 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-lg">
                            <Search className="w-16 h-16 mx-auto text-white/30 mb-4" />
                            <h3 className="text-white/90 text-xl font-bold">No results found</h3>
                            <p className="text-white/50 mt-2">Try a different search term</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                            {filteredUsers.map((user) => (
                                <div
                                    id={`user-${user.id}`}
                                    key={user.id}
                                    onClick={() => handleUserClick(user.id, user.username)}
                                    className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden cursor-pointer hover:bg-white/10 hover:shadow-lg transition-all duration-300 group relative"
                                >
                                    <div className="absolute inset-0 rounded-2xl z-0 overflow-hidden opacity-0 group-hover:opacity-100">
                                        <div
                                            className="absolute inset-0 z-10 rounded-2xl pointer-events-none animate-border-flow"
                                            style={{
                                                background: "linear-gradient(90deg, rgba(56, 189, 248, 0.8), rgba(236, 72, 153, 0.8)), linear-gradient(90deg, rgba(99, 102, 241, 0.8), rgba(236, 72, 153, 0.8))",
                                                backgroundSize: "300% 300%, 300% 300%",
                                                backgroundPosition: "0% 0%, 100% 0%",
                                                backgroundRepeat: "no-repeat, no-repeat",
                                                padding: "2px",
                                                WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                                                WebkitMaskComposite: "xor",
                                                maskComposite: "exclude"
                                            }}
                                        ></div>
                                    </div>

                                    <div className={`relative z-10 h-32 bg-gradient-to-r ${getRandomColor(user.username)} flex items-center justify-center group-hover:scale-105 transition-transform duration-500`}>
                                        {user.imageUrl ? (
                                            <Image
                                                src={user.imageUrl}
                                                alt={user.username}
                                                width={90}
                                                height={90}
                                                className="rounded-full border-4 border-white/30 shadow-lg group-hover:scale-110 transition-transform duration-300"
                                            />
                                        ) : (
                                            <div className="w-24 h-24 rounded-full bg-white/20 border-4 border-white/30 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-300">
                                                <User className="w-12 h-12 text-white" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="relative z-10 p-5">
                                        <h3 className="text-white text-lg font-medium mb-1 flex items-center">
                                            {user.username}
                                            {user._count.cards > 15 && (
                                                <span className="ml-2 inline-flex items-center bg-gradient-to-r from-orange-500/30 to-red-600/30 text-orange-300 text-xs px-2 py-0.5 rounded-full border border-orange-500/20 shadow-inner">
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        viewBox="0 0 24 24"
                                                        fill="currentColor"
                                                        className="w-3 h-3 mr-1 animate-pulse"
                                                    >
                                                        <path fillRule="evenodd" d="M12.963 2.286a.75.75 0 00-1.071-.136 9.742 9.742 0 00-3.539 6.177A7.547 7.547 0 016.648 6.61a.75.75 0 00-1.152.082A9 9 0 1015.68 4.534a7.46 7.46 0 01-2.717-2.248zM15.75 14.25a3.75 3.75 0 11-7.313-1.172c.628.465 1.35.81 2.133 1a5.99 5.99 0 011.925-3.545 3.75 3.75 0 013.255 3.717z" clipRule="evenodd" />
                                                    </svg>
                                                    Hot
                                                </span>
                                            )}
                                        </h3>
                                        <div className="flex justify-between items-center">
                                            <p className="text-white/50 text-sm flex items-center">
                                                <Film className="w-3.5 h-3.5 mr-1.5" />
                                                {user._count.cards} {user._count.cards === 1 ? 'video' : 'videos'}
                                            </p>
                                            <div className="text-blue-400/80 text-sm hover:text-blue-300 transition-colors">
                                                Open →
                                            </div>
                                        </div>
                                    </div>

                                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-1000">
                                        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 transform -translate-x-full group-hover:translate-x-full transition-transform duration-1500"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <button
                onClick={() => setIsModalOpen(true)}
                className="fixed bottom-8 right-8 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full p-5 shadow-xl hover:shadow-blue-500/30 hover:scale-110 hover:from-blue-600 hover:to-blue-700 transition-all duration-300"
                aria-label="Create new watchlater"
            >
                <Plus className="w-7 h-7" />
            </button>

            <CreateUserModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleCreateSuccess}
            />
        </div>
    );
}