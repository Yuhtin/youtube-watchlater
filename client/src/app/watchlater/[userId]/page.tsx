"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, X, Youtube, ArrowLeft, Trash2, AlertCircle, Check, ExternalLink, RotateCcw, ListVideo, Eye, EyeOff, List } from "lucide-react";
import { toast, Toaster } from "sonner";
import { useRouter, useParams } from "next/navigation";
import { Dialog } from '@headlessui/react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    useDroppable,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableItem } from "../../../components/SortableItem";
import { apiRequest } from '@/src/auth/utility';
import { jwtDecode } from "jwt-decode";
import { fail } from "assert";

interface Video {
    id: string;
    title: string;
    thumbnailUrl: string;
    url: string;
    addedAt: number;
    status: string;
    updatedAt?: number;
    playlistId?: string;
    isPlaylist?: boolean;
}

// Updated interface for cards that can be either videos or playlists
interface Card {
    id: string;
    title: string;
    thumbnailUrl: string;
    url: string;
    addedAt: number;
    status: string;
    updatedAt?: number;
    isPlaylist?: boolean;
    playlistId?: string;
    _count?: {
        cards?: number
    };
}

enum ColumnType {
    WATCH_LATER = "WATCH_LATER",
    WATCHING = "WATCHING",
    WATCHED = "WATCHED",
}

interface Column {
    id: string;
    title: string;
    videos: Video[];
}

const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
const fetchVideoTitle = async (videoId: string): Promise<string | null> => {
    try {
        const existingResponse = await apiRequest(`/cards/${videoId}`);

        if (existingResponse.status === 404) {
            console.log(`Video ${videoId} not found in database, will try YouTube API`);
        } else if (existingResponse.id === videoId) {
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

function getPlaylistStatusText(playlist: { cards: { filter: (arg0: { (card: any): boolean; (card: any): boolean; }) => { (): any; new(): any; length: number; }; length: number; }; }) {
    // Calculate status based on cards
    const watchedCount = playlist.cards?.filter((card: { status: string; }) => card.status === 'WATCHED').length || 0;
    const watchingCount = playlist.cards?.filter((card: { status: string; }) => card.status === 'WATCHING').length || 0;
    const totalCount = playlist.cards?.length || 0;

    if (totalCount === 0) {
        return 'No videos';
    }

    if (watchedCount === totalCount) {
        return 'Watched';
    }

    if (watchingCount > 0 || watchedCount > 0) {
        return 'Watching';
    }

    return 'Watch Later';
}

const getPlaylistStatus = (playlist: any) => {
    const watchedCount = playlist.cards?.filter((card: { status: string; }) => card.status === 'WATCHED').length || 0;
    const watchingCount = playlist.cards?.filter((card: { status: string; }) => card.status === 'WATCHING').length || 0;
    const totalCount = playlist.cards?.length || 0;

    if (totalCount === 0) return 'WATCH_LATER';
    if (watchedCount === totalCount) return 'WATCHED';
    if (watchingCount > 0 || watchedCount > 0) return 'WATCHING';
    return 'WATCH_LATER';
};

export default function WatchLaterPage() {
    const [videoUrl, setVideoUrl] = useState("");
    const [videoTitle, setVideoTitle] = useState("");
    const [activeId, setActiveId] = useState<string | null>(null);
    const [activeVideo, setActiveVideo] = useState<Video | null>(null);
    const [username, setUsername] = useState("");
    const [userImage, setUserImage] = useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteUsername, setDeleteUsername] = useState("");
    const [deletePassword, setDeletePassword] = useState("");
    const [deleteConfirmationCode, setDeleteConfirmationCode] = useState("");
    const [generatedCode, setGeneratedCode] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isBulkAddModalOpen, setIsBulkAddModalOpen] = useState(false);
    const [bulkUrls, setBulkUrls] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [processedResults, setProcessedResults] = useState<{ success: number; failed: number; duplicates: number }>({
        success: 0,
        failed: 0,
        duplicates: 0
    });
    const [showResults, setShowResults] = useState(false);
    const [playlists, setPlaylists] = useState<any[]>([]);
    const [selectedPlaylist, setSelectedPlaylist] = useState<any>(null);
    const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
    const [playlistUrl, setPlaylistUrl] = useState('');
    const [isAddingPlaylist, setIsAddingPlaylist] = useState(false);
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
    });

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
            fetchPlaylists();
        } catch (error) {
            console.error('Invalid token:', error);
            localStorage.removeItem("token");
            router.push(`/login/${userId}`);
        }
    }, [userId, router]);

    const removePlaylist = async (playlistId: string) => {
        try {
            const loadingToast = toast.loading("Removing playlist...");

            const response = await apiRequest(`/playlists/${playlistId}`, {
                method: "DELETE",
            });

            if (response.success) {
                fetchColumns();
                fetchPlaylists();
                toast.dismiss(loadingToast);
                toast.success("Playlist removed successfully");
            } else {
                console.error("Failed to remove playlist:", response.message);
                toast.dismiss(loadingToast);
                toast.error("Failed to remove playlist");
            }
        } catch (error) {
            console.error("Failed to remove playlist:", error);
            toast.error("Error removing playlist");
        }
    };

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

    const fetchPlaylists = async () => {
        try {
            const response = await apiRequest('/playlists');
            if (response) {
                setPlaylists(response);

                const playlistCards = response.map((playlist: { id: any; title: any; thumbnailUrl: any; createdAt: string | number | Date; _count: any; }) => ({
                    id: `playlist-${playlist.id}`,
                    title: playlist.title,
                    thumbnailUrl: playlist.thumbnailUrl || 'https://via.placeholder.com/300x168',
                    url: `https://www.youtube.com/playlist?list=${playlist.id}`,
                    status: getPlaylistStatus(playlist),
                    addedAt: new Date(playlist.createdAt).getTime(),
                    isPlaylist: true,
                    playlistData: playlist,
                    _count: playlist._count
                }));

                setColumns(prev => {
                    const newColumns = { ...prev };

                    playlistCards.forEach((card: Video) => {
                        const columnKey = card.status;
                        if (newColumns[columnKey]) {
                            newColumns[columnKey].videos = [
                                ...newColumns[columnKey].videos.filter(v => v.id !== card.id),
                                card
                            ];
                        }
                    });

                    return newColumns;
                });
            }
        } catch (error) {
            console.error("Failed to fetch playlists:", error);
        }
    };

    const addVideo = async () => {
        if (!videoUrl.trim()) {
            toast.warning("Please enter a YouTube URL");
            return;
        }

        const { id, isPlaylist } = extractVideoId(videoUrl);

        if (!id) {
            toast.error("Invalid YouTube URL", {
                description: "Please enter a valid YouTube video or playlist URL"
            });
            return;
        }

        if (isPlaylist) {
            const playlistId = id.replace('playlist-', '');
            const existingPlaylist = playlists.find(p => p.id === playlistId);
            if (existingPlaylist) {
                toast.warning("Playlist already exists in your collection", {
                    description: "This playlist is already in your collection"
                });
                setVideoUrl("");
                return;
            }

            console.log(playlistId)
            addPlaylist(playlistId);
            return;
        }

        const loadingToast = toast.loading("Adding video...");

        try {
            const videoTitle = await fetchVideoTitle(id);

            const newVideo = {
                id,
                title: videoTitle || `Video ${id}`,
                thumbnailUrl: `https://img.youtube.com/vi/${id}/0.jpg`,
                url: `https://www.youtube.com/watch?v=${id}`,
                status: "WATCH_LATER",
                userId: userId,
            };

            const response = await apiRequest('/cards', {
                method: "POST",
                body: newVideo,
            });

            if (response.statusCode === 409) {
                toast.dismiss(loadingToast);
                toast.warning("Video already in your collection", {
                    description: "This video already exists in your collection",
                    action: {
                        label: "View",
                        onClick: () => {
                            const existingStatus = response.data?.status || "WATCH_LATER";
                            toast.info(`This video is in your ${columns[existingStatus]?.title || existingStatus} list`);
                        }
                    }
                });

                setVideoUrl("");
                return;
            }

            if (!response.statusCode) {
                fetchColumns();
                setVideoUrl("");

                toast.dismiss(loadingToast);
                toast.success("Video added successfully", {
                    description: videoTitle || `Video ${id}`
                });
            } else {
                console.error("Failed to add video:", response.message);

                toast.dismiss(loadingToast);
                toast.error(response.message || "Failed to add video", {
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

    const processBulkAdd = async () => {
        if (!bulkUrls.trim()) {
            toast.warning("Please enter YouTube URLs");
            return;
        }

        const urls = bulkUrls.split('\n').filter(url => url.trim());

        if (urls.length === 0) {
            toast.warning("No valid URLs found");
            return;
        }

        setIsProcessing(true);
        setShowResults(false);

        let successCount = 0;
        let failedCount = 0;
        let duplicateCount = 0;

        const loadingToast = toast.loading(`Processing ${urls.length} videos...`);

        for (const url of urls) {
            try {
                const { id, isPlaylist } = extractVideoId(url.trim());

                if (!id) {
                    failedCount++;
                    continue;
                }

                if (isPlaylist) {
                    failedCount++;
                    continue;
                }

                const videoTitle = await fetchVideoTitle(id);

                const newVideo = {
                    id,
                    title: videoTitle || `Video ${id}`,
                    thumbnailUrl: `https://img.youtube.com/vi/${id}/0.jpg`,
                    url: `https://www.youtube.com/watch?v=${id}`,
                    status: "WATCH_LATER",
                    userId: userId,
                };

                const response = await apiRequest('/cards', {
                    method: "POST",
                    body: newVideo,
                });

                if (response.statusCode === 409) {
                    duplicateCount++;
                } else if (response.id) {
                    successCount++;
                } else {
                    failedCount++;
                }
            } catch (error) {
                console.error("Failed to add video:", error);
                failedCount++;
            }
        }

        toast.dismiss(loadingToast);

        setProcessedResults({
            success: successCount,
            failed: failedCount,
            duplicates: duplicateCount
        });

        setShowResults(true);
        setIsProcessing(false);

        if (successCount > 0) {
            fetchColumns();
        }
    };

    const removeVideo = async (status: string, videoId: string) => {
        try {
            const loadingToast = toast.loading("Removing...");

            // Check if this is a playlist
            if (videoId.toString().startsWith('playlist-')) {
                const playlistId = videoId.replace('playlist-', '');
                const response = await apiRequest(`/playlists/${playlistId}`, {
                    method: "DELETE",
                });

                if (response.success) {
                    fetchColumns();
                    fetchPlaylists();
                    toast.dismiss(loadingToast);
                    toast.success("Playlist removed successfully");
                } else {
                    console.error("Failed to remove playlist:", response.message);
                    toast.dismiss(loadingToast);
                    toast.error("Failed to remove playlist");
                }
            } else {
                // Regular video removal
                const response = await apiRequest(`/cards/${videoId}`, {
                    method: "DELETE",
                });

                if (response.id === videoId) {
                    fetchColumns();
                    toast.dismiss(loadingToast);
                    toast.success("Video removed successfully");
                } else {
                    console.error("Failed to remove video:", response.statusText);
                    toast.dismiss(loadingToast);
                    toast.error("Failed to remove video");
                }
            }
        } catch (error) {
            console.error("Failed to remove:", error);
            toast.error("Error removing item");
        }
    };

    const moveVideo = async (videoId: string, newStatus: ColumnType) => {
        const backendColumnMapping: { [key in ColumnType]: string } = {
            WATCH_LATER: "WATCH_LATER",
            WATCHING: "WATCHING",
            WATCHED: "WATCHED"
        };

        try {
            const response = await apiRequest(`/cards/${videoId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    status: backendColumnMapping[newStatus]
                }),
            });

            if (response.id === videoId) {
                fetchColumns();
                toast.success(`Video moved to ${columns[newStatus].title}`, {
                    position: "bottom-right"
                });
            } else {
                toast.error("Failed to move video");
                console.log(response);
            }
        } catch (error) {
            console.log("Error moving video:", error);
            toast.error("Error moving video");
        }
    };

    const extractVideoId = (url: string): { id: string | null; isPlaylist: boolean } => {
        if (!url) return { id: null, isPlaylist: false };

        const playlistRegExp = /^.*(youtube.com\/playlist\?|youtube.com\/watch\?.*[&?]list=|youtu.be\/.*[?&]list=)(?:.*&)?list=([^#&?]*).*/;
        const playlistMatch = url.match(playlistRegExp);

        if (playlistMatch && playlistMatch[2]) {
            return { id: playlistMatch[2], isPlaylist: true };
        }

        const standardRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const standardMatch = url.match(standardRegExp);

        if (standardMatch && standardMatch[2] && standardMatch[2].length === 11) {
            return { id: standardMatch[2], isPlaylist: false };
        }

        const vParamRegExp = /[?&]v=([^#&?]*)/;
        const vParamMatch = url.match(vParamRegExp);

        if (vParamMatch && vParamMatch[1] && vParamMatch[1].length === 11) {
            return { id: vParamMatch[1], isPlaylist: false };
        }

        try {
            const urlObj = new URL(url);
            if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
                const listParam = urlObj.searchParams.get('list');
                if (listParam) {
                    return { id: listParam, isPlaylist: true };
                }

                const videoId = urlObj.searchParams.get('v');
                if (videoId && videoId.length === 11) {
                    return { id: videoId, isPlaylist: false };
                }

                if (urlObj.hostname === 'youtu.be') {
                    const pathParts = urlObj.pathname.split('/').filter(Boolean);
                    if (pathParts.length > 0 && pathParts[0].length === 11) {
                        return { id: pathParts[0], isPlaylist: false };
                    }
                }
            }
        } catch (e) {
        }

        return { id: null, isPlaylist: false };
    };

    const formatDuration = (seconds: number | undefined): string => {
        if (!seconds) return '';

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;

        let formattedDuration = '';

        if (hours > 0) {
            formattedDuration += `${hours}:`;
        }

        formattedDuration += `${minutes.toString().padStart(2, '0')}:`;
        formattedDuration += remainingSeconds.toString().padStart(2, '0');

        return formattedDuration;
    };

    const fetchPlaylistDetails = async (playlistId: string) => {
        if (!YOUTUBE_API_KEY) {
            console.log("YouTube API key is missing");
            return { title: `Playlist ${playlistId}`, thumbnailUrl: '' };
        }

        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}&key=${YOUTUBE_API_KEY}`
        );

        if (!response.ok) {
            return { title: `Playlist ${playlistId}`, thumbnailUrl: '' };
        }

        const data = await response.json();
        if (data.items && data.items.length > 0) {
            const snippet = data.items[0].snippet;
            return {
                title: snippet.title,
                thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || '',
            };
        }

        return { title: `Playlist ${playlistId}`, thumbnailUrl: '' };
    };

    const fetchPlaylistVideos = async (playlistId: string) => {
        if (!YOUTUBE_API_KEY) {
            console.log("YouTube API key is missing");
            return [];
        }

        const videos = [];
        let nextPageToken = '';

        do {
            const response = await fetch(
                `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${playlistId}&key=${YOUTUBE_API_KEY}${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`
            );

            if (!response.ok) {
                break;
            }

            const data = await response.json();

            if (data.items) {
                videos.push(...data.items.map((item: { contentDetails: { videoId: any; }; snippet: { title: any; thumbnails: { high: { url: any; }; default: { url: any; }; }; }; }) => ({
                    id: item.contentDetails.videoId,
                    title: item.snippet.title,
                    thumbnailUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url || `https://img.youtube.com/vi/${item.contentDetails.videoId}/0.jpg`,
                    url: `https://www.youtube.com/watch?v=${item.contentDetails.videoId}`,
                })));
            }

            nextPageToken = data.nextPageToken;
        } while (nextPageToken);

        return videos;
    };

    const addPlaylist = async (playlistId: string) => {
        setIsAddingPlaylist(true);
        const loadingToast = toast.loading("Processing playlist...");

        try {
            const { title, thumbnailUrl } = await fetchPlaylistDetails(playlistId);

            const playlistResponse = await apiRequest('/playlists', {
                method: "POST",
                body: {
                    id: playlistId,
                    title,
                    thumbnailUrl,
                },
            });

            if (playlistResponse.statusCode === 409) {
                toast.dismiss(loadingToast);
                toast.warning("Playlist already exists in your collection");
                setPlaylistUrl("");
                setIsAddingPlaylist(false);
                return;
            }

            const videos = await fetchPlaylistVideos(playlistId);

            let addedCount = 0;
            let duplicateCount = 0;
            let failedCount = 0;

            for (const video of videos) {
                try {
                    const response = await apiRequest('/cards', {
                        method: "POST",
                        body: {
                            ...video,
                            status: "WATCH_LATER",
                            playlistId,
                            userId,
                        },
                    });

                    if (response.statusCode === 409) {
                        duplicateCount++;
                    } else if (response.id) {
                        addedCount++;
                    } else {
                        failedCount++;
                    }
                } catch (error) {
                    failedCount++;
                }
            }

            toast.dismiss(loadingToast);

            if (addedCount > 0) {
                toast.success(`Added ${addedCount} videos from playlist`, {
                    description: title
                });
                fetchColumns();
                fetchPlaylists();
            } else if (duplicateCount > 0 && addedCount === 0) {
                toast.info("All videos from this playlist are already in your collection");
            } else {
                toast.error("Failed to add videos from playlist");
            }

            setPlaylistUrl("");
        } catch (error) {
            console.error("Failed to add playlist:", error);
            toast.dismiss(loadingToast);
            toast.error("Error processing playlist", {
                description: "An unexpected error occurred"
            });
        } finally {
            setIsAddingPlaylist(false);
        }
    };

    const openVideo = (status: string, video: Video) => {
        if (video.isPlaylist) {
            // Find the full playlist data from the playlists array
            const playlistId = video.id.replace('playlist-', '');
            const fullPlaylist = playlists.find(p => p.id === playlistId);
            if (fullPlaylist) {
                setSelectedPlaylist(fullPlaylist);
            }
        } else {
            // Regular video handling
            if (status === "WATCH_LATER") {
                moveVideo(video.id, ColumnType.WATCHING);
            }
            window.open(video.url, "_blank");
            toast.info(`Opening ${video.title}`, {
                position: "bottom-right"
            });
        }
    };

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("currentUsername");
        router.push("/");
    };

    const handleDeleteAccount = async () => {
        if (deleteUsername !== username) {
            toast.error("Username doesn't match");
            return;
        }

        if (deleteConfirmationCode !== generatedCode) {
            toast.error("Confirmation code doesn't match");
            return;
        }

        setIsDeleting(true);

        try {
            const response = await apiRequest(`/users/${userId}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    password: deletePassword
                })
            });

            if (response.success) {
                toast.success("Account deleted successfully");
                localStorage.removeItem("token");
                localStorage.removeItem("currentUsername");
                router.push("/");
            } else {
                toast.error(response.message || "Failed to delete account");
            }
        } catch (error) {
            console.error("Error deleting account:", error);
            toast.error("An error occurred while deleting your account");
        } finally {
            setIsDeleting(false);
            setIsDeleteModalOpen(false);
        }
    };

    const generateRandomCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    };

    const openDeleteModal = () => {
        const code = generateRandomCode();
        setGeneratedCode(code);
        setDeleteUsername("");
        setDeletePassword("");
        setDeleteConfirmationCode("");
        setShowPassword(false);
        setIsDeleteModalOpen(true);
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

        const isPlaylist = activeId.toString().startsWith('playlist-');

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

        // For playlists, update all cards within the playlist
        if (isPlaylist) {
            const playlistId = activeId.replace('playlist-', '');

            // Update playlist status on server
            apiRequest(`/playlists/${playlistId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: destinationStatus
                })
            })
                .then(() => {
                    toast.success(`Playlist moved to ${columns[destinationStatus].title}`);
                    fetchPlaylists(); // Refresh playlists to update their status
                })
                .catch(error => {
                    console.error('Failed to update playlist status:', error);
                    toast.error('Failed to move playlist');
                    fetchColumns();
                });
        } else {
            // Regular video update
            apiRequest(`/cards/${activeId}/reorder`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: destinationStatus,
                    order: columns[destinationStatus].videos.length
                }),
            })
                .then(response => {
                    if (response.id === activeId) {
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
        }
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
                    <button
                        onClick={openDeleteModal}
                        className="text-white/70 hover:text-red-400 transition-colors flex items-center gap-1.5 text-sm"
                    >
                        <Trash2 className="w-4 h-4" />
                        Delete Account
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
                        <button
                            onClick={() => setIsBulkAddModalOpen(true)}
                            className="whitespace-nowrap bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg flex items-center justify-center"
                        >
                            <List className="mr-2 h-5 w-5" /> Bulk Add
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
                                                    {column.videos.filter(video => !video.playlistId).map((video) => (
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

                <DragOverlay
                    adjustScale={false}
                    zIndex={9999}
                >
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

            <Dialog
                open={isDeleteModalOpen}
                onClose={() => !isDeleting && setIsDeleteModalOpen(false)}
                className="relative z-50"
            >
                <div className="fixed inset-0 bg-black/70" aria-hidden="true" />

                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <Dialog.Panel className="w-full max-w-md rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 border border-white/10 shadow-xl p-6 backdrop-blur-sm">
                        <Dialog.Title className="text-xl font-bold text-white mb-2 flex items-center">
                            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                            Delete Account
                        </Dialog.Title>

                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
                            <p className="text-white/90 text-sm">
                                This action <span className="font-bold text-red-400">cannot be undone</span>.
                                All your data, including your videos and preferences will be permanently deleted.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-1">
                                    Confirm your username
                                </label>
                                <input
                                    type="text"
                                    value={deleteUsername}
                                    onChange={(e) => setDeleteUsername(e.target.value)}
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500/40"
                                    placeholder="Enter your username"
                                    disabled={isDeleting}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-1">
                                    Confirm your password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={deletePassword}
                                        onChange={(e) => setDeletePassword(e.target.value)}
                                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500/40 pr-10"
                                        placeholder="Enter your password"
                                        disabled={isDeleting}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-1">
                                    Security verification
                                </label>
                                <div className="mb-2 p-3 bg-white/10 border border-white/5 rounded font-mono text-sm text-white tracking-wider">
                                    {generatedCode}
                                </div>
                                <input
                                    type="text"
                                    value={deleteConfirmationCode}
                                    onChange={(e) => setDeleteConfirmationCode(e.target.value)}
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500/40"
                                    placeholder="Type the code exactly as shown above"
                                    disabled={isDeleting}
                                />
                            </div>
                        </div>

                        <div className="mt-8 flex justify-between">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="px-4 py-2 text-white/70 hover:text-white transition-colors"
                                disabled={isDeleting}
                            >
                                Cancel
                            </button>

                            <button
                                onClick={handleDeleteAccount}
                                className={`px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center justify-center transition-colors ${isDeleting ? 'opacity-70 cursor-not-allowed' : ''
                                    }`}
                                disabled={isDeleting || !deleteUsername || !deletePassword || !deleteConfirmationCode}
                            >
                                {isDeleting ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete Forever
                                    </>
                                )}
                            </button>
                        </div>
                    </Dialog.Panel>
                </div>
            </Dialog>

            <Dialog
                open={!!selectedPlaylist}
                onClose={() => setSelectedPlaylist(null)}
                className="relative z-50"
            >
                {selectedPlaylist && (
                    <>
                        <div className="fixed inset-0 bg-black/80" aria-hidden="true" />

                        <div className="fixed inset-0 flex items-center justify-center p-4">
                            <Dialog.Panel className="w-full max-w-5xl h-[80vh] rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 border border-white/10 shadow-xl overflow-hidden backdrop-blur-sm">
                                <div className="h-full flex flex-col">
                                    <div className="p-5 border-b border-white/10 flex justify-between items-center">
                                        <div className="flex items-center">
                                            <div className="w-12 h-12 rounded overflow-hidden mr-4">
                                                <img
                                                    src={selectedPlaylist.thumbnailUrl || 'https://via.placeholder.com/48'}
                                                    alt={selectedPlaylist.title}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div>
                                                <Dialog.Title className="text-xl font-bold text-white flex items-center">
                                                    <ListVideo className="h-5 w-5 text-purple-400 mr-2" />
                                                    {selectedPlaylist.title}
                                                </Dialog.Title>
                                                <p className="text-white/60 text-sm">
                                                    {selectedPlaylist._count?.cards || 0} videos
                                                </p>
                                            </div>
                                            <div>
                                                <a
                                                    href={`https://www.youtube.com/playlist?list=${selectedPlaylist.id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="ml-3 inline-flex items-center bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-xs px-3 py-1 rounded-full border border-red-500/20 shadow-lg transition-all"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                    }}
                                                >
                                                    <Youtube className="w-3 h-3 mr-1.5" />
                                                    Open on YouTube
                                                </a>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => setSelectedPlaylist(null)}
                                            className="text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10"
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>

                                    <div className="flex-grow overflow-y-auto p-5">
                                        <div className="h-full flex space-x-4 overflow-x-auto pb-4">
                                            {Object.entries(columns).map(([key, column]) => (
                                                <div
                                                    key={key}
                                                    className="flex-shrink-0 w-72 h-full flex flex-col bg-white/5 rounded-lg overflow-hidden"
                                                >
                                                    <div className="p-3 bg-white/5 border-b border-white/10">
                                                        <h3 className="text-white font-medium">{column.title}</h3>
                                                    </div>

                                                    <div className="flex-grow overflow-y-auto p-2">
                                                        {selectedPlaylist.cards
                                                            ?.filter((card: { status: string; }) => card.status === key)
                                                            .map((card: {
                                                                id: string;
                                                                title: string;
                                                                thumbnailUrl: string;
                                                                url: string;
                                                                status: string;
                                                                playlistId?: string;
                                                                addedAt?: string | Date;
                                                                duration?: string;
                                                                durationSeconds?: number;
                                                            }) => (
                                                                <div
                                                                    key={card.id}
                                                                    className="mb-3 bg-white/10 backdrop-blur-sm border border-white/10 rounded-lg overflow-hidden cursor-pointer hover:bg-white/20 transition-colors"
                                                                    onClick={() => {
                                                                        // Open the video and update its status
                                                                        window.open(card.url, "_blank");

                                                                        // If the card is in WATCH_LATER, move it to WATCHING
                                                                        if (card.status === "WATCH_LATER") {
                                                                            apiRequest(`/cards/${card.id}`, {
                                                                                method: "PATCH",
                                                                                headers: { "Content-Type": "application/json" },
                                                                                body: JSON.stringify({
                                                                                    status: "WATCHING"
                                                                                }),
                                                                            }).then(() => {
                                                                                // Refresh the playlist data
                                                                                const playlistId = selectedPlaylist.id;
                                                                                apiRequest(`/playlists/${playlistId}`).then(updatedPlaylist => {
                                                                                    setSelectedPlaylist(updatedPlaylist);
                                                                                    fetchColumns(); // Also update main kanban
                                                                                });
                                                                            });
                                                                        }
                                                                    }}
                                                                >
                                                                    <div className="relative">
                                                                        <img
                                                                            src={card.thumbnailUrl}
                                                                            alt={card.title}
                                                                            className="w-full h-28 object-cover"
                                                                        />
                                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>

                                                                        {card.addedAt && (
                                                                            <div className="absolute top-1 left-1 bg-black/70 text-white/70 text-xs px-1.5 py-0.5 rounded">
                                                                                {new Date(card.addedAt).toLocaleDateString()}
                                                                            </div>
                                                                        )}

                                                                        {card.durationSeconds && (
                                                                            <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                                                                                {formatDuration(card.durationSeconds)}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="p-3">
                                                                        <div className="flex justify-between">
                                                                            <h4 className="font-medium text-white text-sm line-clamp-2">
                                                                                {card.title}
                                                                            </h4>
                                                                            <div className="ml-2">
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        // Move to next column
                                                                                        const nextStatus = key === "WATCH_LATER"
                                                                                            ? "WATCHING"
                                                                                            : key === "WATCHING"
                                                                                                ? "WATCHED"
                                                                                                : "WATCH_LATER";

                                                                                        apiRequest(`/cards/${card.id}`, {
                                                                                            method: "PATCH",
                                                                                            headers: { "Content-Type": "application/json" },
                                                                                            body: JSON.stringify({
                                                                                                status: nextStatus
                                                                                            }),
                                                                                        }).then(() => {
                                                                                            // Refresh the playlist data
                                                                                            const playlistId = selectedPlaylist.id;
                                                                                            apiRequest(`/playlists/${playlistId}`).then(updatedPlaylist => {
                                                                                                setSelectedPlaylist(updatedPlaylist);
                                                                                                fetchColumns(); // Also update main kanban
                                                                                            });
                                                                                        });
                                                                                    }}
                                                                                    className="text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
                                                                                >
                                                                                    {key === "WATCH_LATER" && <Eye className="h-4 w-4" />}
                                                                                    {key === "WATCHING" && <Check className="h-4 w-4" />}
                                                                                    {key === "WATCHED" && <RotateCcw className="h-4 w-4" />}
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}

                                                        {selectedPlaylist.cards?.filter(
                                                            (card: { status: string }) => card.status === key
                                                        ).length === 0 && (
                                                                <div className="flex flex-col items-center justify-center h-32 text-white/30 text-sm">
                                                                    <div className="mb-2">No videos here</div>
                                                                    <div className="text-xs">Drag videos to this column</div>
                                                                </div>
                                                            )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </Dialog.Panel>
                        </div>
                    </>
                )}
            </Dialog>

            <Dialog
                open={isBulkAddModalOpen}
                onClose={() => !isProcessing && setIsBulkAddModalOpen(false)}
                className="relative z-50"
            >
                <div className="fixed inset-0 bg-black/70" aria-hidden="true" />

                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <Dialog.Panel className="w-full max-w-md rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 border border-white/10 shadow-xl p-6 backdrop-blur-sm">
                        <Dialog.Title className="text-xl font-bold text-white mb-2 flex items-center">
                            <List className="h-5 w-5 text-blue-500 mr-2" />
                            Bulk Add Videos
                        </Dialog.Title>

                        <div className="space-y-4">
                            <textarea
                                value={bulkUrls}
                                onChange={(e) => setBulkUrls(e.target.value)}
                                className="w-full h-40 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                                placeholder="Paste YouTube URLs here, one per line"
                                disabled={isProcessing}
                            />

                            {showResults && (
                                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                                    <p className="text-white/90 text-sm">
                                        <span className="font-bold text-blue-400">{processedResults.success}</span> videos added successfully.
                                    </p>
                                    <p className="text-white/90 text-sm">
                                        <span className="font-bold text-yellow-400">{processedResults.duplicates}</span> duplicates found.
                                    </p>
                                    <p className="text-white/90 text-sm">
                                        <span className="font-bold text-red-400">{processedResults.failed}</span> failed to add.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="mt-8 flex justify-between">
                            <button
                                onClick={() => setIsBulkAddModalOpen(false)}
                                className="px-4 py-2 text-white/70 hover:text-white transition-colors"
                                disabled={isProcessing}
                            >
                                Cancel
                            </button>

                            <button
                                onClick={processBulkAdd}
                                className={`px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center transition-colors ${isProcessing ? 'opacity-70 cursor-not-allowed' : ''
                                    }`}
                                disabled={isProcessing || !bulkUrls.trim()}
                            >
                                {isProcessing ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Videos
                                    </>
                                )}
                            </button>
                        </div>
                    </Dialog.Panel>
                </div>
            </Dialog>
        </div>
    );
}