"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast, Toaster } from "sonner";
import { User, Film } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function LoginPage() {
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [username, setUsername] = useState("");
    const [userImage, setUserImage] = useState<string | null>(null);
    const [videoCount, setVideoCount] = useState<number>(0);
    const params = useParams();
    const router = useRouter();
    const userId = params.userId as string;

    useEffect(() => {
        fetchUserDetails();

        const storedUsername = localStorage.getItem("currentWatchlaterUsername");
        const storedUserImage = localStorage.getItem(`userImage_${userId}`);

        if (storedUsername) {
            setUsername(storedUsername);
        }

        if (storedUserImage) {
            setUserImage(storedUserImage);
        }

    }, [userId]);

    const fetchUserDetails = async () => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/users/${userId}`);
            if (response.ok) {
                const data = await response.json();

                setUsername(data.username);

                if (data.imageUrl) {
                    setUserImage(data.imageUrl);
                    localStorage.setItem(`userImage_${userId}`, data.imageUrl);
                }

                if (data._count && data._count.cards !== undefined) {
                    setVideoCount(data._count.cards);
                } else {
                    const cardsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/cards/count/${userId}`);
                    if (cardsResponse.ok) {
                        const countData = await cardsResponse.json();
                        setVideoCount(countData.count || 0);
                    }
                }
            }
        } catch (error) {
            console.error("Error fetching user:", error);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!password.trim()) {
            toast.error("Password is required");
            return;
        }

        try {
            setIsLoading(true);

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    username,
                    password,
                }),
            });

            if (response.ok) {
                const data = await response.json();

                localStorage.setItem("token", data.access_token);
                localStorage.setItem("currentUsername", data.user.username);
                if (data.user.imageUrl) {
                    localStorage.setItem(`userImage_${data.user.id}`, data.user.imageUrl);
                }

                toast.success("Login successful");
                router.push(`/watchlater/${data.user.id}`);
            } else {
                toast.error("Invalid credentials");
            }
        } catch (error) {
            console.error("Login error:", error);
            toast.error("An error occurred during login");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-paper text-ink font-mono flex items-center justify-center p-6">
            <Toaster position="top-center" expand={false} richColors />

            <div className="bg-paper border-2 border-ink shadow-brutal-red w-[360px]">
                {/* Card header */}
                <div className="bg-white border-b-2 border-ink p-6 flex flex-col items-center">
                    {userImage ? (
                        <div className="w-20 h-20 border-2 border-ink overflow-hidden mb-3">
                            <Image
                                src={userImage}
                                alt={username}
                                width={80}
                                height={80}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    ) : (
                        <div className="w-20 h-20 border-2 border-ink bg-paper flex items-center justify-center mb-3">
                            <User className="w-10 h-10 text-ink" />
                        </div>
                    )}
                    <h2 className="font-bold text-[15px] font-mono text-ink">{username}</h2>
                    <div className="mt-1.5 text-[10px] text-neutral-500 flex items-center gap-1 font-mono">
                        <Film className="w-3 h-3" />
                        {videoCount} {videoCount === 1 ? 'video' : 'videos'}
                    </div>
                </div>

                {/* Card body */}
                <div className="p-6">
                    <Link
                        href="/collections"
                        className="inline-block text-[10px] font-bold tracking-wider mb-6 hover:underline"
                    >
                        ← BACK
                    </Link>

                    <form onSubmit={handleLogin}>
                        <label className="block text-[10px] font-bold tracking-wider mb-2 uppercase">
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="border-1.5 border-ink bg-white w-full px-3 py-2 text-[13px] font-mono focus:outline-none focus:shadow-brutal-red transition-all"
                            placeholder="enter your password"
                            disabled={isLoading}
                        />

                        <button
                            type="submit"
                            className="bg-ink text-paper border-2 border-ink shadow-brutal-red w-full mt-4 py-2.5 font-bold text-[12px] font-mono flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 text-paper" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    processing...
                                </>
                            ) : (
                                'LOGIN →'
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
