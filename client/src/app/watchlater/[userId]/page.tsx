"use client";

import { useState, useEffect } from "react"
import { Plus, X, Youtube, ArrowLeft } from "lucide-react"
import { toast, Toaster } from "sonner"
import { useRouter, useParams } from "next/navigation"
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    useDroppable,
} from "@dnd-kit/core"
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { SortableItem } from "../../../components/SortableItem"
import { apiRequest } from '@/src/auth/utility';
import { jwtDecode } from "jwt-decode";

interface Video {
    id: string;
    title: string;
    thumbnailUrl: string;
    url: string;
    createdAt: number;
    status: string;
    updatedAt?: number;
}

enum ColumnType {
    WATCH_LATER = "WATCH_LATER",
    WATCHING = "WATCHING",
    WATCHED = "WATCHED",
}

interface Column {
    id: string
    title: string
    videos: Video[]
}

const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY
const API_BASE_URL = "http://localhost:3000/cards";

const fetchVideoTitle = async (videoId: string): Promise<string | null> => {
    try {
        const existingResponse = await fetch(`${API_BASE_URL}/${videoId}`);

        if (existingResponse.status === 404) {
            console.log(`Video ${videoId} not found in database, will try YouTube API`);
        } else if (existingResponse.ok) {
            const existingData = await existingResponse.json();
            if (existingData && existingData.title) {
                return existingData.title;
            }
        }

        if (!YOUTUBE_API_KEY) {
            console.log("YouTube API key is missing");
            return `Video ${videoId}`;
        }

        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${YOUTUBE_API_KEY}`
        );

        if (!response.ok) {
            if (response.status === 403) {
                console.log("YouTube API key is invalid or rate limit exceeded");
                return `Video ${videoId}`;
            }
            return `Video ${videoId}`;
        }

        const data = await response.json();
        if (data.items && data.items.length > 0) {
            return data.items[0].snippet.title;
        }

        return `Video ${videoId}`;
    } catch (error) {
        console.log("Issue fetching video title:", error);
        return `Video ${videoId}`;
    }
};

function DroppableColumn({ id, children, className }: { id: string, children: React.ReactNode, className?: string }) {
    const { isOver, setNodeRef } = useDroppable({
        id,
    });

    return (
        <div
            ref={setNodeRef}
            className={`${className} ${isOver ? 'bg-white/5' : ''} transition-colors`}
        >
            {children}
        </div>
    );
}

export default function WatchLaterPage() {
    const [videoUrl, setVideoUrl] = useState("")
    const [videoTitle, setVideoTitle] = useState("")
    const [activeId, setActiveId] = useState<string | null>(null);
    const [activeVideo, setActiveVideo] = useState<Video | null>(null);
    const [username, setUsername] = useState("");
    const [userImage, setUserImage] = useState<string | null>(null);
    const router = useRouter();
    const params = useParams();
    const userId = params.userId as string;

    const [columns, setColumns] = useState<{ [key: string]: Column }>({
        WATCH_LATER: {
            id: "WATCH_LATER",
            title: "Watch Later",
            videos: [],
        },
        WATCHING: {
            id: "WATCHING",
            title: "Watching",
            videos: [],
        },
        WATCHED: {
            id: "WATCHED",
            title: "Watched",
            videos: [],
        },
    })

    useEffect(() => {
        const token = localStorage.getItem("token");

        if (!token) {
            router.push(`/login/${userId}`);
            return;
        }

        try {
            const decoded: any = jwtDecode(token);

            if (decoded.sub !== userId || decoded.exp < Date.now() / 1000) {
                console.log('Token expired or belongs to different user');
                localStorage.removeItem("token");
                router.push(`/login/${userId}`);
                return;
            }

            setUsername(decoded.username || "");

            if (decoded.username) {
                localStorage.setItem("currentUsername", decoded.username);
            }
            
            const storedUserImage = localStorage.getItem(`userImage_${userId}`);
            if (storedUserImage) {
                setUserImage(storedUserImage);
            }

            fetchColumns();
        } catch (error) {
            console.error('Invalid token:', error);
            localStorage.removeItem("token");
            router.push(`/login/${userId}`);
        }
    }, [userId, router]);

    const fetchColumns = async () => {
        try {
            const data = await apiRequest(`/cards?userId=${userId}`);

            const columnsFromServer: { [key in ColumnType]: Column } = {
                WATCH_LATER: { id: ColumnType.WATCH_LATER, title: "Watch Later", videos: [] },
                WATCHING: { id: ColumnType.WATCHING, title: "Watching", videos: [] },
                WATCHED: { id: ColumnType.WATCHED, title: "Watched", videos: [] },
            };

            const columnMapping: { [key: string]: ColumnType } = {
                'WATCH_LATER': ColumnType.WATCH_LATER,
                'WATCHING': ColumnType.WATCHING,
                'WATCHED': ColumnType.WATCHED,
            };

            data.forEach((video: any) => {
                const columnType = columnMapping[video.status] || ColumnType.WATCH_LATER;
                columnsFromServer[columnType].videos.push({
                    ...video,
                    status: columnType
                });
            });

            setColumns(columnsFromServer);
        } catch (error) {
            console.error("Failed to fetch columns:", error);
            toast.error("Failed to load videos", {
                description: "Check your connection and try again"
            });
        }
    };

    const addVideo = async () => {
        if (!videoUrl.trim()) {
            toast.warning("Please enter a YouTube URL");
            return;
        }

        const videoId = extractVideoId(videoUrl);
        if (!videoId) {
            toast.error("Invalid YouTube URL", {
                description: "Please enter a valid YouTube video URL"
            });
            return;
        }

        const loadingToast = toast.loading("Adding video...");

        try {
            const videoTitle = await fetchVideoTitle(videoId);

            const newVideo = {
                id: videoId,
                title: videoTitle || `Video ${videoId}`,
                thumbnailUrl: `https://img.youtube.com/vi/${videoId}/0.jpg`,
                url: `https://www.youtube.com/watch?v=${videoId}`,
                status: "WATCH_LATER",
                userId: userId,
            };

            const response = await apiRequest(API_BASE_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newVideo),
            });

            if (response.ok) {
                fetchColumns();
                setVideoUrl("");
                toast.dismiss(loadingToast);
                toast.success("Video added successfully", {
                    description: videoTitle || `Video ${videoId}`
                });
            } else {
                console.error("Failed to add video:", response.statusText);
                toast.dismiss(loadingToast);
                toast.error("Failed to add video", {
                    description: "Please try again later"
                });
            }
        } catch (error) {
            console.error("Failed to add video:", error);
            toast.dismiss(loadingToast);
            toast.error("Error adding video", {
                description: "An unexpected error occurred"
            });
        }
    };

    const removeVideo = async (status: string, videoId: string) => {
        try {
            const loadingToast = toast.loading("Removing video...");

            const response = await apiRequest(`${API_BASE_URL}/${videoId}`, {
                method: "DELETE",
            });

            if (response.ok) {
                fetchColumns();
                toast.dismiss(loadingToast);
                toast.success("Video removed successfully");
            } else {
                console.error("Failed to remove video:", response.statusText);
                toast.dismiss(loadingToast);
                toast.error("Failed to remove video");
            }
        } catch (error) {
            console.error("Failed to remove video:", error);
            toast.error("Error removing video");
        }
    };

    const moveVideo = async (videoId: string, newStatus: ColumnType) => {
        const backendColumnMapping: { [key in ColumnType]: string } = {
            WATCH_LATER: "WATCH_LATER",
            WATCHING: "WATCHING",
            WATCHED: "WATCHED"
        };

        try {
            const response = await apiRequest(`${API_BASE_URL}/${videoId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    status: backendColumnMapping[newStatus]
                }),
            });

            if (response.ok) {
                fetchColumns();
                toast.success(`Video moved to ${columns[newStatus].title}`, {
                    position: "bottom-right"
                });
            } else {
                console.error("Failed to move video:", response.statusText);
                toast.error("Failed to move video");
            }
        } catch (error) {
            console.error("Failed to move video:", error);
            toast.error("Error moving video");
        }
    };

    const extractVideoId = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
        const match = url.match(regExp)
        return match && match[2].length === 11 ? match[2] : null
    }

    const openVideo = (status: string, video: Video) => {
        if (status === "WATCH_LATER") {
            moveVideo(video.id, ColumnType.WATCHING);
        }
        window.open(video.url, "_blank");
        toast.info(`Opening ${video.title}`, {
            position: "bottom-right"
        });
    }

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("currentUsername");
        router.push("/");
    };

    const onDragStart = ({ active }: any) => {
        setActiveId(active.id);

        for (const [columnId, column] of Object.entries(columns)) {
            const video = column.videos.find(v => v.id === active.id);
            if (video) {
                setActiveVideo(video);
                break;
            }
        }
    };

    const onDragEnd = ({ active, over }: any) => {
        setActiveId(null);
        setActiveVideo(null);

        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        const isTargetColumn = Object.keys(columns).includes(overId);

        let sourceStatus = null;
        let destinationStatus = isTargetColumn ? overId : null;

        for (const [columnId, column] of Object.entries(columns)) {
            if (column.videos.some(video => video.id === activeId)) {
                sourceStatus = columnId;
            }

            if (!destinationStatus && !isTargetColumn &&
                column.videos.some(video => video.id === overId)) {
                destinationStatus = columnId;
            }
        }

        if (!sourceStatus || !destinationStatus || sourceStatus === destinationStatus) return;

        setColumns(prev => {
            const newColumns = { ...prev };

            const videoToMove = newColumns[sourceStatus].videos.find(v => v.id === activeId);

            if (!videoToMove) return prev;

            newColumns[sourceStatus] = {
                ...newColumns[sourceStatus],
                videos: newColumns[sourceStatus].videos.filter(v => v.id !== activeId)
            };

            newColumns[destinationStatus] = {
                ...newColumns[destinationStatus],
                videos: [
                    ...newColumns[destinationStatus].videos,
                    { ...videoToMove, status: destinationStatus }
                ]
            };

            return newColumns;
        });

        apiRequest(`${API_BASE_URL}/${activeId}/reorder`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                status: destinationStatus,
                order: columns[destinationStatus].videos.length
            }),
        })
            .then(response => {
                if (response.ok) {
                    toast.success(`Video moved to ${columns[destinationStatus].title}`);
                } else {
                    toast.error("Failed to move video");
                    fetchColumns();
                }
            })
            .catch(error => {
                console.error('Failed to update card:', error);
                toast.error('Failed to move video');
                fetchColumns();
            });
    };

    const columnColors = {
        WATCH_LATER: "from-blue-400/20 to-blue-500/10 border-blue-300/30",
        WATCHING: "from-amber-400/20 to-amber-500/10 border-amber-300/30",
        WATCHED: "from-green-400/20 to-green-500/10 border-green-300/30",
    };

    const columnIcons = {
        WATCH_LATER: "⌚",
        WATCHING: "▶️",
        WATCHED: "✅",
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 p-6 md:p-10 bg-fixed">
            <Toaster
                position="top-center"
                expand={false}
                richColors
                toastOptions={{
                    style: {
                        background: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(8px)',
                        color: 'white',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                    },
                }}
            />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10">
                <div>                    
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 flex items-center">
                        <Youtube className="h-8 w-8 mr-3 text-red-500" />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-300">
                            {username}'s Watch Later
                        </span>
                    </h1>
                </div>

                <div className="flex items-center gap-3 mt-4 md:mt-0">
                    <div className="relative group">
                        <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 overflow-hidden flex items-center justify-center">
                            {userImage ? (
                                <img 
                                    src={userImage} 
                                    alt={username} 
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="text-white/70 text-sm font-semibold">
                                    {username?.charAt(0)?.toUpperCase() || "U"}
                                </div>
                            )}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-red-600 transition-colors shadow-lg opacity-0 group-hover:opacity-100" onClick={logout}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-3 h-3 text-white">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="text-white/70 hover:text-red-400 transition-colors flex items-center gap-1.5 text-sm"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                        </svg>
                        Sign out
                    </button>
                </div>
            </div>

            <div className="mb-10 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-xl overflow-hidden">
                <div className="p-6">
                    <h2 className="text-xl font-semibold text-white mb-4">Add a new video!</h2>
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-grow flex items-center bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                            <span className="pl-3 text-red-400">
                                <Youtube size={20} />
                            </span>
                            <input
                                type="text"
                                placeholder="Paste YouTube URL here..."
                                value={videoUrl}
                                onChange={(e) => setVideoUrl(e.target.value)}
                                className="flex-grow p-3 bg-transparent text-white placeholder-slate-400 focus:outline-none"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        addVideo();
                                    }
                                }}
                            />
                        </div>
                        <button
                            onClick={addVideo}
                            className="whitespace-nowrap bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-lg hover:from-red-600 hover:to-red-700 transition-all shadow-lg flex items-center justify-center"
                        >
                            <Plus className="mr-2 h-5 w-5" /> Add Video
                        </button>
                    </div>
                </div>
            </div>

            <DndContext
                sensors={useSensors(
                    useSensor(PointerSensor, {
                        activationConstraint: {
                            distance: 8,
                        }
                    }),
                    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
                )}
                collisionDetection={closestCenter}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDragCancel={() => {
                    setActiveId(null);
                    setActiveVideo(null);
                }}
            >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {Object.entries(columns).map(([columnKey, column]) => {
                        const colorClasses = columnColors[columnKey as keyof typeof columnColors];
                        const icon = columnIcons[columnKey as keyof typeof columnIcons];

                        return (
                            <div
                                key={column.id}
                                className={`bg-gradient-to-br ${colorClasses} backdrop-blur-lg border rounded-xl shadow-xl overflow-hidden`}
                            >
                                <div className="p-5 border-b border-white/10">
                                    <h2 className="text-xl font-bold text-white flex items-center justify-between">
                                        <span className="flex items-center">
                                            <span className="mr-2">{icon}</span>
                                            {column.title}
                                        </span>
                                        <span className="bg-white/20 text-white text-sm py-1 px-3 rounded-full">
                                            {column.videos.length}
                                        </span>
                                    </h2>
                                </div>

                                <DroppableColumn
                                    id={column.id}
                                    className="min-h-[400px] h-full"
                                >
                                    <SortableContext
                                        items={column.videos.map((video) => video.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <div className="p-4 min-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                            {column.videos.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center h-full text-white/50 py-8">
                                                    <div className="text-5xl mb-3">🎬</div>
                                                    <p>No videos yet</p>
                                                    <p className="text-sm">Drag videos here or add new ones</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    {column.videos.map((video) => (
                                                        <SortableItem
                                                            key={video.id}
                                                            id={video.id}
                                                            video={video}
                                                            status={column.id}
                                                            onOpen={() => openVideo(column.id, video)}
                                                            onRemove={() => removeVideo(column.id, video.id)}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </SortableContext>
                                </DroppableColumn>
                            </div>
                        );
                    })}
                </div>

                <DragOverlay adjustScale={true} zIndex={9999}>
                    {activeId && activeVideo ? (
                        <div className="w-full" style={{ maxWidth: "300px" }}>
                            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-lg overflow-hidden shadow-md">
                                <div className="relative">
                                    <img
                                        src={activeVideo.thumbnailUrl}
                                        alt={activeVideo.title}
                                        className="w-full h-32 object-cover"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                                </div>
                                <div className="p-3">
                                    <h3 className="font-medium text-white text-sm line-clamp-2">
                                        {activeVideo.title}
                                    </h3>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
}