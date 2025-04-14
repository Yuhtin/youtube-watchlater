"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast, Toaster } from "sonner";
import { ArrowLeft, User, Lock, LogIn } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [username, setUsername] = useState("");
    const [userImage, setUserImage] = useState<string | null>(null);
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
            const response = await fetch(`http://localhost:3000/users/${userId}`);
            if (response.ok) {
                const data = await response.json();

                setUsername(data.username);

                if (data.imageUrl) {
                    setUserImage(data.imageUrl);
                    localStorage.setItem(`userImage_${userId}`, data.imageUrl);
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

            const response = await fetch("http://localhost:3000/users/login", {
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
                const user = await response.json();

                localStorage.setItem("currentUserId", user.id);
                localStorage.setItem("currentUsername", user.username);
                if (user.imageUrl) {
                    localStorage.setItem(`userImage_${userId}`, user.imageUrl);
                }

                toast.success("Login successful");
                router.push(`/watchlater/${user.id}`);
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
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6 overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-30">
                <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-gradient-to-r from-blue-500/20 to-cyan-500/20 blur-3xl"></div>
                <div className="absolute top-1/3 -right-20 w-96 h-96 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 blur-3xl"></div>
                <div className="absolute -bottom-20 left-1/3 w-72 h-72 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 blur-3xl"></div>
            </div>
            
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

            <div className="relative z-10 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl transform transition-all duration-300 hover:shadow-blue-500/10">
                {/* Animated border effect */}
                <div className="absolute inset-0 rounded-2xl z-0 overflow-hidden opacity-0 group-hover:opacity-100">
                    <div 
                        className="absolute inset-0 z-10 rounded-2xl pointer-events-none"
                        style={{ 
                            background: "linear-gradient(90deg, rgba(56, 189, 248, 0.4), rgba(236, 72, 153, 0.4))",
                            backgroundSize: "300% 300%",
                            backgroundPosition: "0% 0%",
                            padding: "1px",
                            WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                            WebkitMaskComposite: "xor",
                            maskComposite: "exclude",
                            animation: "border-flow 4s linear infinite"
                        }}
                    ></div>
                </div>
                
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 relative">
                    <button
                        onClick={() => router.push('/')}
                        className="text-white/80 hover:text-white mb-8 flex items-center group transition-all"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" /> 
                        <span>Back to collections</span>
                    </button>

                    <div className="flex flex-col items-center">
                        {userImage ? (
                            <div className="w-28 h-28 mb-6 rounded-full border-4 border-white/30 overflow-hidden shadow-lg hover:scale-105 hover:border-white/50 transition-all duration-300">
                                <Image
                                    src={userImage}
                                    alt={username}
                                    width={112}
                                    height={112}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        ) : (
                            <div className="w-28 h-28 rounded-full bg-white/20 flex items-center justify-center mb-6 shadow-lg hover:bg-white/30 transition-all duration-300">
                                <User className="w-14 h-14 text-white" />
                            </div>
                        )}
                        <h2 className="text-white text-2xl font-bold">{username}</h2>
                        <div className="mt-2 px-3 py-1 bg-white/10 rounded-full text-white/70 text-sm">
                            Amazing subtitle, i need to think what to add here
                        </div>
                    </div>
                </div>

                <div className="p-8 relative z-10">
                    <form onSubmit={handleLogin}>
                        <div className="mb-8">
                            <label className="block text-sm font-medium text-white/70 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/50 w-5 h-5" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all placeholder-white/30"
                                    placeholder="Enter your password"
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="group w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-indigo-600 text-white py-4 rounded-xl font-medium transition-all duration-300 relative overflow-hidden shadow-lg hover:shadow-blue-500/25"
                            disabled={isLoading}
                        >
                            <span className="relative z-10 flex items-center justify-center">
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        Login <LogIn className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                        </button>
                    </form>
                </div>
            </div>
            
            {/* Add animation keyframes for border flow */}
            <style jsx global>{`
                @keyframes border-flow {
                    0% { background-position: 0% 0%; }
                    50% { background-position: 100% 0%; }
                    100% { background-position: 0% 0%; }
                }
            `}</style>
        </div>
    );
}