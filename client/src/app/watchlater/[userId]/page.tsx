"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Plus, X, Youtube, Trash2, AlertCircle, ListVideo, Eye, EyeOff, List, Settings, LogOut, Camera, UploadCloud, Mail, Send, UserSearch, CheckCircle, XCircle, MessageSquare, Clock, ArrowLeft, User, BarChart2, PieChart, TrendingUp } from "lucide-react";
import { toast, Toaster } from "sonner";
import { useRouter, useParams } from "next/navigation";
import { Dialog } from '@headlessui/react';
import { KanbanBoard, Column as KanbanColumn, CardItem } from '../../../components/KanbanBoard';
import { apiRequest } from '@/src/auth/utility';
import { jwtDecode } from "jwt-decode";
import { FilterBar, FilterOptions } from "@/src/components/FilterBar";
import { formatDuration, getRandomColor } from "@/src/lib/utils";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title, TimeScale, TooltipItem } from 'chart.js';
import { Pie, Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import { enUS } from 'date-fns/locale';

ChartJS.register(
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    TimeScale
);

interface Video {
    id: string;
    videoId: string;
    title: string;
    thumbnailUrl: string;
    url: string;
    addedAt: number;
    status: string;
    updatedAt?: number;
    playlistId?: string;
    isPlaylist?: boolean;
    durationSeconds?: number;
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

const getPlaylistStatus = (playlist: any) => {
    const watchedCount = playlist.cards?.filter((card: { status: string; }) => card.status === 'WATCHED').length || 0;
    const watchingCount = playlist.cards?.filter((card: { status: string; }) => card.status === 'WATCHING').length || 0;
    const totalCount = playlist.cards?.length || 0;

    if (totalCount === 0) return 'WATCH_LATER';
    if (watchedCount === totalCount) return 'WATCHED';
    if (watchingCount > 0 || watchedCount > 0) return 'WATCHING';
    return 'WATCH_LATER';
};

const fetchVideoInfo = async (videoId: string): Promise<{ title: string | null; durationSeconds: number | null } | null> => {
    try {
        const existingResponse = await apiRequest(`/cards/global/${videoId}`);

        if (existingResponse.status === 404) {
            console.log(`Video ${videoId} not found in database, will try YouTube API`);
        } else if (existingResponse.videoId === videoId) {
            return {
                title: existingResponse.title,
                durationSeconds: existingResponse.durationSeconds || null
            };

        }

        if (!YOUTUBE_API_KEY) {
            console.log("YouTube API key is missing");
            return null;
        }

        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${YOUTUBE_API_KEY}`
        );

        if (!response.ok) {
            if (response.status === 403) {
                console.log("YouTube API key is invalid or rate limit exceeded");
                return null;
            }

            return null;
        }

        const data = await response.json();
        if (data.items && data.items.length > 0) {
            const title = data.items[0].snippet.title;
            const durationISO = data.items[0].contentDetails?.duration || null;
            const durationSeconds = durationISO ? parseDuration(durationISO) : null;            

            return { title, durationSeconds };
        }

        return null;
    } catch (error) {
        console.log("Issue fetching video info:", error);
        return null;
    }
};

const formatTotalTime = (seconds: number): string => {
    if (!seconds) return '0h 0m';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else {
        return `${minutes}m`;
    }
};

const parseDuration = (isoDuration: string): number => {
    if (!isoDuration) return 0;

    try {
        const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
        const match = isoDuration.match(regex);

        if (!match) {
            console.warn(`Invalid duration format: ${isoDuration}`);
            return 0;
        }

        const hours = match[1] ? parseInt(match[1], 10) : 0;
        const minutes = match[2] ? parseInt(match[2], 10) : 0;
        const seconds = match[3] ? parseInt(match[3], 10) : 0;

        return hours * 3600 + minutes * 60 + seconds;
    } catch (error) {
        console.error("Error parsing duration:", error);
        return 0;
    }
};

export default function WatchLaterPage() {
    const [videoUrl, setVideoUrl] = useState("");
    const [playlistUrl, setPlaylistUrl] = useState('');
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
    const [playlistActiveId, setPlaylistActiveId] = useState<string | null>(null);
    const [playlistActiveItem, setPlaylistActiveItem] = useState<CardItem | null>(null);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [activeSettingsTab, setActiveSettingsTab] = useState("profile");
    const [newUsername, setNewUsername] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");
    const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
    const [profileImagePreview, setProfileImagePreview] = useState<string | null>(userImage);

    const [userColor, setUserColor] = useState("#3b82f6");
    const [userColorLight, setUserColorLight] = useState("rgba(59, 130, 246, 0.15)");
    const [userColorBorder, setUserColorBorder] = useState("rgba(59, 130, 246, 0.3)");

    const [inboxSuggestions, setInboxSuggestions] = useState<any[]>([]);
    const [outboxSuggestions, setOutboxSuggestions] = useState<any[]>([]);
    const [unreadSuggestions, setUnreadSuggestions] = useState(0);
    const [sendToUsername, setSendToUsername] = useState("");
    const [suggestVideoUrl, setSuggestVideoUrl] = useState("");
    const [suggestNote, setSuggestNote] = useState("");
    const [searchingUser, setSearchingUser] = useState(false);
    const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [sendingMessage, setSendingMessage] = useState(false);

    const [progressData, setProgressData] = useState<{ date: string; count: number }[]>([]);
    const [progressStartDate, setProgressStartDate] = useState('allTime');

    const [statsData, setStatsData] = useState({
        watchLaterCount: 0,
        watchingCount: 0,
        watchedCount: 0,
        totalCount: 0
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
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
                setProfileImagePreview(storedUserImage);
            }

            fetchColumns();
            fetchSuggestions();
        } catch (error) {
            console.error('Invalid token:', error);
            localStorage.removeItem("token");
            router.push(`/login/${userId}`);
        }
    }, [userId, router]);

    useEffect(() => {
        if (username) {
            const gradient = getRandomColor(username);

            const mainColor = gradient.includes('indigo') ? '#6366f1' :
                gradient.includes('blue') ? '#3b82f6' :
                    gradient.includes('emerald') ? '#10b981' :
                        gradient.includes('amber') ? '#f59e0b' :
                            gradient.includes('pink') ? '#ec4899' :
                                gradient.includes('violet') ? '#8b5cf6' :
                                    '#3b82f6';

            setUserColor(mainColor);
            setUserColorLight(mainColor.replace(')', ', 0.15)').replace('rgb', 'rgba'));
            setUserColorBorder(mainColor.replace(')', ', 0.3)').replace('rgb', 'rgba'));
        }
    }, [username]);

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
            fetchPlaylists();
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

                const playlistCards = response.map((playlist: { id: string; playlistId: string; title: string; thumbnailUrl: string; createdAt: string | number | Date; _count: any; durationSeconds: any; }) => ({
                    id: playlist.id,
                    videoId: 'playlist-' + playlist.playlistId,
                    title: playlist.title,
                    thumbnailUrl: playlist.thumbnailUrl || 'https://via.placeholder.com/300x168',
                    url: `https://www.youtube.com/playlist?list=${playlist.playlistId}`,
                    status: getPlaylistStatus(playlist),
                    addedAt: new Date(playlist.createdAt).getTime(),
                    isPlaylist: true,
                    playlistData: playlist,
                    _count: playlist._count,
                    durationSeconds: playlist.durationSeconds,
                }));

                setColumns(prev => {
                    const newColumns = { ...prev };

                    playlistCards.forEach((card: Video) => {
                        const columnKey = card.status;
                        if (newColumns[columnKey]) {
                            newColumns[columnKey].videos = [
                                ...newColumns[columnKey].videos.filter(v => v.videoId !== card.videoId),
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

    const fetchSuggestions = async () => {
        try {
            const response = await apiRequest(`/suggestions?userId=${userId}`);

            if (response && Array.isArray(response)) {
                const receivedSuggestions = response.filter(s => s.toUserId === userId);
                setInboxSuggestions(receivedSuggestions);

                const sentSuggestions = response.filter(s => s.fromUserId === userId);
                setOutboxSuggestions(sentSuggestions);

                const unread = receivedSuggestions.filter(s => !s.read).length;
                setUnreadSuggestions(unread);
            }
        } catch (error) {
            console.error("Failed to fetch suggestions:", error);
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
            const existingPlaylist = getPlaylistById(playlistId);
            if (existingPlaylist) {
                toast.warning("Playlist already exists in your collection", {
                    description: "This playlist is already in your collection"
                });
                setVideoUrl("");
                return;
            }

            addPlaylist(playlistId);
            return;
        }

        const loadingToast = toast.loading("Adding video...");

        try {
            const data = await fetchVideoInfo(id);
            if (!data) {
                toast.dismiss(loadingToast);
                toast.error("Failed to fetch video info", {
                    description: "Please check the URL and try again"
                });
                return;
            }

            const { title, durationSeconds } = data;

            const newVideo = {
                videoId: id,
                title,
                thumbnailUrl: `https://img.youtube.com/vi/${id}/0.jpg`,
                url: `https://www.youtube.com/watch?v=${id}`,
                status: "WATCH_LATER",
                userId: userId,
                durationSeconds: durationSeconds || null,
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
                    description: title || `Video ${id}`
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

    const removeVideo = async (status: string, videoId: string) => {
        try {
            const loadingToast = toast.loading("Removing...");

            if (videoId.toString().startsWith('playlist-')) {
                const playlistId = videoId.replace('playlist-', '');
                const response = await apiRequest(`/playlists/${playlistId}`, {
                    method: "DELETE",
                });

                if (response.success) {
                    fetchColumns();
                    toast.dismiss(loadingToast);
                    toast.success("Playlist removed successfully");
                } else {
                    console.error("Failed to remove playlist:", response.message);
                    toast.dismiss(loadingToast);
                    toast.error("Failed to remove playlist");
                }
            } else {
                const response = await apiRequest(`/cards/${videoId}`, {
                    method: "DELETE",
                });

                if (response.videoId === videoId) {
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

            if (response.videoId === videoId) {
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

        url = url.replace('✅', '').replace('❌', '').trim();

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

    const getPlaylistById = (playlistId: string) => {
        const playlist = playlists.find(p => p.playlistId === playlistId);
        if (playlist) {
            return {
                ...playlist,
                status: getPlaylistStatus(playlist),
                thumbnailUrl: playlist.thumbnailUrl || 'https://via.placeholder.com/300x168',
                url: `https://www.youtube.com/playlist?list=${playlist.playlistId}`,
            };
        }

        return null;
    }

    const openVideo = (status: string, video: Video) => {
        if (video.isPlaylist) {
            const playlistId = video.videoId.replace('playlist-', '');
            const fullPlaylist = getPlaylistById(playlistId);
            if (fullPlaylist) {
                setSelectedPlaylist(fullPlaylist);
            }
        } else {
            if (status === "WATCH_LATER") {
                moveVideo(video.videoId, ColumnType.WATCHING);
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

        return null;
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
                const videoIds = data.items.map((item: any) => item.contentDetails.videoId).join(',');

                const videoDetailsResponse = await fetch(
                    `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds}&key=${YOUTUBE_API_KEY}`
                );

                const videoDetailsData = await videoDetailsResponse.json();
                const durationMap: { [key: string]: number } = {};

                if (videoDetailsData.items) {
                    videoDetailsData.items.forEach((item: any) => {
                        const duration = item.contentDetails?.duration || null;
                        const durationSeconds = duration ? parseDuration(duration) : 0;
                        durationMap[item.id] = durationSeconds;
                    });
                }

                videos.push(...data.items.map((item: any) => {
                    const videoId = item.contentDetails.videoId;
                    const durationSeconds = durationMap[videoId] || 0;

                    return {
                        videoId: videoId,
                        title: item.snippet.title,
                        thumbnailUrl: item.snippet.thumbnails?.high?.url ||
                            item.snippet.thumbnails?.default?.url ||
                            `https://img.youtube.com/vi/${videoId}/0.jpg`,
                        url: `https://www.youtube.com/watch?v=${videoId}`,
                        durationSeconds,
                    };
                }));
            }

            nextPageToken = data.nextPageToken;
        } while (nextPageToken);

        return videos;
    };

    const addPlaylist = async (playlistId: string) => {
        const loadingToast = toast.loading("Processing playlist...");

        try {
            const playlistDetails = await fetchPlaylistDetails(playlistId);
            if (!playlistDetails) {
                toast.dismiss(loadingToast);
                toast.error("Failed to fetch playlist details", {
                    description: "Please check the playlist link and try again"
                });

                return;
            }

            const { title, thumbnailUrl } = playlistDetails;

            const playlistResponse = await apiRequest('/playlists', {
                method: "POST",
                body: {
                    playlistId: playlistId,
                    title,
                    thumbnailUrl,
                },
            });

            if (playlistResponse.statusCode === 409) {
                toast.dismiss(loadingToast);
                toast.warning("Playlist already exists in your collection");
                setPlaylistUrl("");
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
                            playlistId: playlistResponse.id,
                            userId,
                        },
                    });

                    if (response.statusCode === 409) {
                        duplicateCount++;
                    } else if (response.videoId) {
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
        }
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

    const handleMainDragStart = (event: any) => {
        const { active } = event;
        setActiveId(active.id);

        for (const [columnId, column] of Object.entries(columns)) {
            const video = column.videos.find(v => v.videoId === active.id);
            if (video) {
                setActiveVideo(video);
                break;
            }
        }
    };

    const handleMainDragEnd = (event: any) => {
        const { active, over } = event;
        setActiveId(null);
        setActiveVideo(null);

        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        const isOverColumn = over.data?.current?.type === "column";

        let destinationStatus = isOverColumn ? overId : null;
        let sourceStatus = null;

        for (const [columnId, column] of Object.entries(columns)) {
            if (column.videos.some(video => video.videoId === activeId)) {
                sourceStatus = columnId;
                break;
            }
        }

        if (!destinationStatus) {
            for (const [columnId, column] of Object.entries(columns)) {
                if (column.videos.some(video => video.videoId === overId)) {
                    destinationStatus = columnId;
                    break;
                }
            }
        }

        if (!sourceStatus || !destinationStatus || sourceStatus === destinationStatus) {
            console.log("Invalid move, returning");
            return;
        }

        setColumns(prev => {
            const newColumns = { ...prev };

            const videoToMove = newColumns[sourceStatus].videos.find(v => v.videoId === activeId);

            if (!videoToMove) return prev;

            newColumns[sourceStatus] = {
                ...newColumns[sourceStatus],
                videos: newColumns[sourceStatus].videos.filter(v => v.videoId !== activeId)
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

        moveVideo(activeId, destinationStatus as ColumnType);
    };

    const disableDragForMainBoard = (itemId: string) => {
        return itemId.toString().startsWith('playlist-');
    };

    const columnIcons = {
        WATCH_LATER: "⌚",
        WATCHING: "▶️",
        WATCHED: "✅",
    };
    const renderPlaylistKanban = () => {
        const playlistColumns: { [key: string]: KanbanColumn } = {
            WATCH_LATER: { id: "WATCH_LATER", title: "Watch Later", videos: [] },
            WATCHING: { id: "WATCHING", title: "Watching", videos: [] },
            WATCHED: { id: "WATCHED", title: "Watched", videos: [] },
        };

        if (selectedPlaylist?.cards) {
            selectedPlaylist.cards.forEach((card: any) => {
                if (playlistColumns[card.status]) {
                    playlistColumns[card.status].videos.push({
                        ...card,
                        addedAt: new Date(card.addedAt || Date.now()).getTime()
                    });
                }
            });
        }

        const handlePlaylistOpen = (status: string, item: CardItem) => {
            window.open(item.url, "_blank");
            if (status === "WATCH_LATER") {
                const loadingToast = toast.loading("Updating status...");

                apiRequest(`/cards/${item.videoId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        status: "WATCHING"
                    }),
                }).then(async () => {
                    const playlistId = selectedPlaylist.playlistId;
                    const updatedPlaylistResponse = await apiRequest(`/playlists/${playlistId}`);

                    if (updatedPlaylistResponse) {
                        setSelectedPlaylist({
                            ...updatedPlaylistResponse,
                            status: getPlaylistStatus(updatedPlaylistResponse),
                            thumbnailUrl: updatedPlaylistResponse.thumbnailUrl || 'https://via.placeholder.com/300x168',
                            url: `https://www.youtube.com/playlist?list=${updatedPlaylistResponse.id}`,
                        });

                        await fetchColumns();

                        toast.dismiss(loadingToast);
                        toast.success(`Video moved to Watching`);
                    }
                });
            }
        };

        const handlePlaylistDragStart = (event: any) => {
            const { active } = event;
            setPlaylistActiveId(active.id);

            for (const [_, column] of Object.entries(playlistColumns)) {
                const item = column.videos.find(v => v.videoId === active.id);
                if (item) {
                    setPlaylistActiveItem(item);
                    break;
                }
            }
        };

        const handlePlaylistDragEnd = (event: any) => {
            const { active, over } = event;

            setPlaylistActiveId(null);
            setPlaylistActiveItem(null);

            if (!over) return;

            const activeId = active.id;
            const overId = over.id;

            let sourceStatus = null;
            let destinationStatus = Object.keys(playlistColumns).includes(overId) ? overId : null;

            for (const [columnId, column] of Object.entries(playlistColumns)) {
                if (column.videos.some(video => video.videoId === activeId)) {
                    sourceStatus = columnId;
                }

                if (!destinationStatus && column.videos.some(video => video.videoId === overId)) {
                    destinationStatus = columnId;
                }
            }

            if (!sourceStatus || !destinationStatus || sourceStatus === destinationStatus) return;

            setSelectedPlaylist((prev: any) => {
                const updatedPlaylist = { ...prev };

                const videoToMove = updatedPlaylist.cards.find((v: any) => v.videoId === activeId);

                if (!videoToMove) return prev;

                videoToMove.status = destinationStatus;

                return updatedPlaylist;
            });

            moveVideo(activeId, destinationStatus as ColumnType);
        };

        return (
            <KanbanBoard
                columns={playlistColumns}
                columnIcons={columnIcons}
                onDragStart={handlePlaylistDragStart}
                onDragEnd={handlePlaylistDragEnd}
                onDragCancel={() => {
                    setPlaylistActiveId(null);
                    setPlaylistActiveItem(null);
                }}
                onItemOpen={handlePlaylistOpen}
                onItemRemove={(status, itemId) => {
                    const loadingToast = toast.loading("Removing video...");
                    apiRequest(`/cards/${itemId}`, {
                        method: "DELETE",
                    }).then(() => {
                        toast.dismiss(loadingToast);
                        toast.success("Video removed successfully");

                        fetchColumns();
                    }).catch(() => {
                        toast.dismiss(loadingToast);
                        toast.error("Failed to remove video");
                    });
                }}
                hidePlaylistVideos={false}
                activeId={playlistActiveId}
                activeItem={playlistActiveItem}
                emptyStateMessage="No videos in this section"
                emptyStateSubMessage="Move videos here"
            />
        );
    };

    const [filters, setFilters] = useState<FilterOptions>({
        search: '',
        maxDuration: null,
        sortOrder: 'newest'
    });

    const applyFilters = (videos: CardItem[]): CardItem[] => {
        if (!filters.search && filters.maxDuration === null && filters.sortOrder === 'newest') {
            return videos.filter(video => !video.playlistId || video.isPlaylist);
        }

        return videos.filter(video => {
            if (video.playlistId && !video.isPlaylist) {
                return false;
            }

            if (filters.search && !video.title.toLowerCase().includes(filters.search.toLowerCase())) {
                return false;
            }

            if (filters.maxDuration !== null &&
                video.durationSeconds &&
                video.durationSeconds > filters.maxDuration) {
                return false;
            }

            return true;
        }).sort((a, b) => {
            if (filters.sortOrder === 'newest') {
                return new Date(b.addedAt || 0).getTime() - new Date(a.addedAt || 0).getTime();
            } else if (filters.sortOrder === 'oldest') {
                return new Date(a.addedAt || 0).getTime() - new Date(b.addedAt || 0).getTime();
            } else if (filters.sortOrder === 'shortest') {
                return (a.durationSeconds || 0) - (b.durationSeconds || 0);
            } else {
                return (b.durationSeconds || 0) - (a.durationSeconds || 0);
            }
        });
    };

    const filteredColumns = useMemo(() => {
        const result = { ...columns };

        for (const columnKey of Object.keys(result)) {
            result[columnKey] = {
                ...result[columnKey],
                videos: applyFilters(result[columnKey].videos)
            };
        }

        return result;
    }, [columns, filters]);

    const searchUsers = async (query: string) => {
        if (!query.trim() || query.length < 3) {
            setUserSearchResults([]);
            return;
        }

        setSearchingUser(true);

        try {
            const response = await apiRequest(`/users/search?query=${encodeURIComponent(query)}`);

            if (response && Array.isArray(response)) {
                setUserSearchResults(response.filter(user => user.id !== userId));
            } else {
                setUserSearchResults([]);
            }
        } catch (error) {
            console.error("Error searching users:", error);
            toast.error("Failed to search users");
        } finally {
            setSearchingUser(false);
        }
    };

    const sendVideoSuggestion = async () => {
        if (!selectedUser) {
            toast.error("Please select a valid user");
            return;
        }

        if (!suggestVideoUrl.trim()) {
            toast.error("Please enter a YouTube video URL");
            return;
        }

        const { id, isPlaylist } = extractVideoId(suggestVideoUrl);

        if (!id) {
            toast.error("Invalid YouTube URL");
            return;
        }

        if (isPlaylist) {
            toast.error("Playlists are not supported for suggestions");
            return;
        }

        setSendingMessage(true);
        const loadingToast = toast.loading("Sending suggestion...");

        try {
            const checkResponse = await apiRequest(`/cards/check?videoId=${id}&userId=${selectedUser.id}`);

            if (checkResponse && checkResponse.exists) {
                toast.dismiss(loadingToast);
                toast.warning(`${selectedUser.username} already has this video in their collection`);
                setSendingMessage(false);
                return;
            }

            const videoInfo = await fetchVideoInfo(id);
            if (!videoInfo) {
                toast.dismiss(loadingToast);
                toast.error("Failed to fetch video info");
                setSendingMessage(false);
                return;
            }

            const response = await apiRequest('/suggestions', {
                method: "POST",
                body: {
                    fromUserId: userId,
                    toUserId: selectedUser.id,
                    videoId: id,
                    videoTitle: videoInfo.title,
                    videoThumbnail: `https://img.youtube.com/vi/${id}/0.jpg`,
                    videoDuration: videoInfo.durationSeconds,
                    note: suggestNote,
                },
            });

            if (response && response.videoId) {
                toast.dismiss(loadingToast);
                toast.success(`Suggestion sent to ${selectedUser.username}`);

                setSendToUsername("");
                setSuggestVideoUrl("");
                setSuggestNote("");
                setSelectedUser(null);
                setUserSearchResults([]);

                fetchSuggestions();
            } else {
                throw new Error("Failed to send suggestion");
            }
        } catch (error) {
            console.error("Error sending suggestion:", error);
            toast.dismiss(loadingToast);
            toast.error("Failed to send video suggestion");
        } finally {
            setSendingMessage(false);
        }
    };

    const acceptSuggestion = async (suggestion: any) => {
        const loadingToast = toast.loading("Adding video to your collection...");

        try {
            await apiRequest(`/suggestions/${suggestion.id}`, {
                method: "PATCH",
                body: { read: true, accepted: true }
            });

            fetchSuggestions();

            try {                
                let id = suggestion.videoId;
                let title = suggestion.videoTitle;
                let durationSeconds = suggestion.videoDuration || null;
                let thumbnailUrl = suggestion.videoThumbnail || `https://img.youtube.com/vi/${id}/0.jpg`;
                let url = `https://www.youtube.com/watch?v=${id}`;
                let status = "WATCH_LATER";

                const newVideo = {
                    videoId: id,
                    title,
                    thumbnailUrl,
                    url,
                    status,
                    userId,
                    durationSeconds,
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
                    toast.success("Suggestion added to your Watch Later successfully", {
                        description: title || `Video ${id}`
                    });
                } else {
                    console.error("Failed to add video:", response.message);
    
                    toast.dismiss(loadingToast);
                    toast.error(response.message || "Failed to add video", {
                        description: "Please try again later"
                    });

                    fetchColumns();
                }
            } catch (error) {            
                console.error("Failed to add video:", error);
                toast.dismiss(loadingToast);
                toast.error("Error adding video", {
                    description: "An unexpected error occurred"
                });

                fetchColumns();
            }
        } catch (error) {
            console.error("Error accepting suggestion:", error);
            toast.dismiss(loadingToast);
            toast.error("Failed to add video");

            fetchColumns();
        }
    };

    const declineSuggestion = async (suggestion: any) => {
        const loadingToast = toast.loading("Declining suggestion...");

        try {
            await apiRequest(`/suggestions/${suggestion.id}`, {
                method: "PATCH",
                body: { read: true, accepted: false }
            });

            toast.dismiss(loadingToast);
            toast.success("Suggestion declined");

            fetchSuggestions();
        } catch (error) {
            console.error("Error declining suggestion:", error);
            toast.dismiss(loadingToast);
            toast.error("Failed to decline suggestion");
        }
    };

    const markAsRead = async (suggestion: any) => {
        if (suggestion.read) return;

        try {
            await apiRequest(`/suggestions/${suggestion.id}`, {
                method: "PATCH",
                body: { read: true }
            });

            fetchSuggestions();
        } catch (error) {
            console.error("Error marking suggestion as read:", error);
        }
    };

    const calculateStats = useCallback(() => {
        const watchLaterCount = columns.WATCH_LATER.videos.filter(v => !v.isPlaylist).length;
        const watchingCount = columns.WATCHING.videos.filter(v => !v.isPlaylist).length;
        const watchedCount = columns.WATCHED.videos.filter(v => !v.isPlaylist).length;
        const totalCount = watchLaterCount + watchingCount + watchedCount;

        setStatsData({
            watchLaterCount,
            watchingCount,
            watchedCount,
            totalCount
        });

        calculateProgressData();
    }, [columns]);

    const calculateProgressData = useCallback(() => {
        const watchedVideos = columns.WATCHED.videos.filter(v => !v.playlistId || v.isPlaylist);

        const today = new Date();
        let startDate: Date;

        switch (progressStartDate) {
            case 'last7days':
                startDate = new Date(today);
                startDate.setDate(today.getDate() - 7);
                break;
            case 'last30days':
                startDate = new Date(today);
                startDate.setDate(today.getDate() - 30);
                break;
            case 'allTime':
            default:
                if (watchedVideos.length > 0) {
                    const sortedByDate = [...watchedVideos].sort((a, b) =>
                        (a.updatedAt || a.addedAt) - (b.updatedAt || b.addedAt)
                    );
                    startDate = new Date(sortedByDate[0].updatedAt || sortedByDate[0].addedAt);
                } else {
                    startDate = new Date(today);
                    startDate.setMonth(today.getMonth() - 6);
                }
        }

        const dateCountMap = new Map<string, number>();
        const dailyData: { date: string; count: number }[] = [];

        let currentDate = new Date(startDate);

        while (currentDate <= today) {
            const dateString = currentDate.toISOString().split('T')[0];
            dateCountMap.set(dateString, 0);
            currentDate.setDate(currentDate.getDate() + 1);
        }

        watchedVideos.forEach(video => {
            const updateDate = new Date(video.updatedAt || video.addedAt);
            if (updateDate >= startDate) {
                const dateString = updateDate.toISOString().split('T')[0];
                const count = dateCountMap.get(dateString) || 0;
                dateCountMap.set(dateString, count + 1);
            }
        });

        dateCountMap.forEach((count, date) => {
            dailyData.push({ date, count });
        });

        dailyData.sort((a, b) => a.date.localeCompare(b.date));

        let runningTotal = 0;
        const cumulativeData = dailyData.map(item => {
            runningTotal += item.count;
            return {
                date: item.date,
                count: runningTotal
            };
        });

        setProgressData(cumulativeData);
    }, [columns, progressStartDate]);

    useEffect(() => {
        if (activeSettingsTab === "stats") {
            calculateStats();
        }
    }, [activeSettingsTab, calculateStats]);

    return (
        <div className="min-h-screen bg-cover bg-fixed bg-center p-6 md:p-10 before:content-[''] before:absolute before:inset-0 before:bg-black/40 before:z-[-1] relative">
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

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 backdrop-blur-lg bg-white/5 border border-white/20 rounded-xl p-6 shadow-xl">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 flex items-center">
                        <Youtube className="h-8 w-8 mr-3 text-red-500" />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-300">
                            {username}'s Watch Later
                        </span>
                    </h1>
                </div>

                <div className="flex items-center gap-3 mt-4 md:mt-0">
                    <button
                        onClick={() => setIsSettingsModalOpen(true)}
                        className="flex items-center gap-2 bg-white/10 hover:bg-white/15 transition-colors px-3 py-1.5 rounded-lg border border-white/20 relative"
                    >
                        <span className="text-white text-sm">{username}</span>
                        <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 overflow-hidden flex items-center justify-center">
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

                        {unreadSuggestions > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full border border-black/20 shadow-lg">
                                {unreadSuggestions}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            <div className="mb-10 backdrop-blur-xl bg-white/10 border border-white/30 rounded-xl shadow-xl overflow-hidden">
                <div className="p-6">
                    <h2 className="text-xl font-semibold text-white mb-4">Add a new video!</h2>
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-grow flex items-center bg-black/10 border border-white/20 rounded-lg overflow-hidden">
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
                            className="whitespace-nowrap bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-lg hover:from-red-600 hover:to-red-700 transition-all shadow-lg flex items-center justify-center border border-red-500/20 pulse-glass"
                        >
                            <Plus className="mr-2 h-5 w-5" /> Add Video
                        </button>
                        <button
                            onClick={() => setIsBulkAddModalOpen(true)}
                            className="whitespace-nowrap bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg flex items-center justify-center border border-blue-500/20"
                        >
                            <List className="mr-2 h-5 w-5" /> Bulk Add
                        </button>
                    </div>
                </div>
            </div>

            <KanbanBoard
                columns={filteredColumns}
                columnIcons={columnIcons}
                onDragStart={handleMainDragStart}
                onDragEnd={handleMainDragEnd}
                onDragCancel={() => {
                    setActiveId(null);
                    setActiveVideo(null);
                }}
                onItemOpen={openVideo}
                onItemRemove={removeVideo}
                activeId={activeId}
                activeItem={activeVideo}
                hidePlaylistVideos={true}
                disableDragFor={disableDragForMainBoard}
                emptyStateMessage="No videos yet"
                emptyStateSubMessage="Drag videos here or add new ones"
            />

            <FilterBar
                onChange={setFilters}
                initialFilters={filters}
            />

            <Dialog
                open={isDeleteModalOpen}
                onClose={() => !isDeleting && setIsDeleteModalOpen(false)}
                className="relative z-50"
            >
                <div className="fixed inset-0 bg-black/70" aria-hidden="true" />

                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <Dialog.Panel className="w-full max-w-md rounded-2xl bg-black/40 backdrop-blur-xl backdrop-saturate-150 border border-white/20 shadow-xl p-6">
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
                            <Dialog.Panel className="w-full max-w-5xl h-[80vh] rounded-2xl bg-black/40 backdrop-blur-xl backdrop-saturate-150 border border-white/20 shadow-xl overflow-hidden">
                                <div className="h-full flex flex-col">
                                    <div className="p-5 border-b border-white/20 flex justify-between items-center bg-white/5 backdrop-blur-sm">
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
                                                    href={`https://www.youtube.com/playlist?list=${selectedPlaylist.playlistId}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="ml-3 inline-flex items-center backdrop-blur-md bg-red-500/40 hover:bg-red-500/60 text-white text-xs px-3 py-1 rounded-full border border-red-400/30 shadow-lg transition-all duration-300"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                    }}
                                                >
                                                    <Youtube className="w-3 h-3 mr-1.5" />
                                                    Open on YouTube
                                                </a>
                                            </div>
                                        </div>

                                        <div className="flex items-center">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedPlaylist(null);
                                                }}
                                                className="text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors md:order-2"
                                                title="Close"
                                            >
                                                <X className="h-5 w-5" />
                                            </button>
                                            
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();

                                                    if (confirm(`Are you sure you want to delete the playlist "${selectedPlaylist.title}"?`)) {
                                                        removeVideo("WATCH_LATER", `playlist-${selectedPlaylist.playlistId}`);
                                                        setSelectedPlaylist(null);
                                                    }
                                                }}
                                                className="text-white/70 hover:text-red-400 p-2 rounded-full hover:bg-white/10 mr-2 md:mr-0 md:order-1 transition-colors"
                                                title="Delete playlist"
                                            >
                                                <Trash2 className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex-grow overflow-y-auto p-5">
                                        {selectedPlaylist && renderPlaylistKanban()}
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
                    <Dialog.Panel className="w-full max-w-md rounded-2xl bg-black/40 backdrop-blur-xl backdrop-saturate-150 border border-white/20 shadow-xl p-6">
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
                                onClick={() => {
                                    setIsProcessing(true);
                                    setShowResults(false);

                                    const urls = bulkUrls.split('\n').filter(url => url.trim());

                                    let successCount = 0;
                                    let failedCount = 0;
                                    let duplicateCount = 0;

                                    const loadingToast = toast.loading(`Processing ${urls.length} videos...`);

                                    Promise.all(urls.map(async url => {
                                        const { id, isPlaylist } = extractVideoId(url.trim());

                                        if (!id || isPlaylist) {
                                            failedCount++;
                                            return Promise.resolve();
                                        }

                                        const data = await fetchVideoInfo(id);
                                        if (!data) {
                                            toast.dismiss(loadingToast);
                                            toast.error("Failed to fetch video info", {
                                                description: "Please check the URL and try again"
                                            });
                                            return;
                                        }

                                        const { title, durationSeconds } = data;

                                        const newVideo = {
                                            videoId: id,
                                            title,
                                            thumbnailUrl: `https://img.youtube.com/vi/${id}/0.jpg`,
                                            url: `https://www.youtube.com/watch?v=${id}`,
                                            status: "WATCH_LATER",
                                            userId: userId,
                                            durationSeconds: durationSeconds || null,
                                        };

                                        return apiRequest('/cards', {
                                            method: "POST",
                                            body: newVideo,
                                        }).then(response => {
                                            if (response.statusCode === 409) {
                                                duplicateCount++;
                                            } else if (response.videoId) {
                                                successCount++;
                                            } else {
                                                failedCount++;
                                            }
                                        }).catch(() => {
                                            failedCount++;
                                        });
                                    })).then(() => {
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
                                    });
                                }}
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

            <Dialog
                open={isSettingsModalOpen}
                onClose={() => setIsSettingsModalOpen(false)}
                className="relative z-[100]"
            >
                <div
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm"
                    aria-hidden="true"
                    onClick={() => setIsSettingsModalOpen(false)}
                />

                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <Dialog.Panel
                        className="w-full max-w-3xl h-[85vh] rounded-2xl shadow-xl overflow-hidden"
                        style={{
                            background: `linear-gradient(180deg, ${userColorLight}, rgba(20,0,25,50))`,
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                            boxShadow: `0 8px 32px rgba(0, 0, 0, 0.2), 0 0 0 1px ${userColorBorder}, 0 0 20px ${userColorLight}`,
                            border: `1px solid ${userColor}`
                        }}
                    >
                        <div
                            className="absolute inset-0 rounded-2xl pointer-events-none"
                            style={{
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                boxShadow: `
                                    inset 0 1px 1px 0 rgba(255, 255, 255, 0.1),
                                    0 0 0 1px rgba(0, 0, 0, 0.15),
                                    0 8px 32px rgba(0, 0, 0, 0.4)
                                `
                            }}
                        ></div>

                        <button
                            onClick={() => setIsSettingsModalOpen(false)}
                            className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors z-20"
                            aria-label="Close settings"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <div className="relative h-full flex overflow-hidden z-10">
                            <div className="w-16 md:w-60 p-4 md:p-5 flex flex-col backdrop-blur-md bg-black/20 border-r border-white/10">
                                <Dialog.Title
                                    className="text-lg font-bold mb-6 hidden md:flex items-center text-white"
                                >
                                    <Settings className="mr-2 h-5 w-5" />
                                    Settings
                                </Dialog.Title>

                                <div className="flex justify-center md:hidden mb-6">
                                    <Settings className="h-5 w-5 text-white" />
                                </div>

                                <div className="space-y-3">
                                    <button
                                        onClick={() => setActiveSettingsTab("profile")}
                                        className={`w-full flex ${activeSettingsTab === "profile"
                                            ? "bg-white/10 text-white"
                                            : "text-white/70 hover:text-white hover:bg-white/5"
                                            } rounded-lg transition-colors ${"px-0 md:px-3 py-2.5 md:py-2"
                                            }`}
                                    >
                                        <div className="md:hidden w-full flex justify-center">
                                            <User className="w-5 h-5" />
                                        </div>

                                        <div className="hidden md:flex items-center">
                                            <User className="w-4 h-4 mr-2" />
                                            <span className="text-sm">Profile</span>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => setActiveSettingsTab("inbox")}
                                        className={`w-full flex ${activeSettingsTab === "inbox"
                                            ? "bg-white/10 text-white"
                                            : "text-white/70 hover:text-white hover:bg-white/5"
                                            } rounded-lg transition-colors relative ${"px-0 md:px-3 py-2.5 md:py-2"
                                            }`}
                                    >
                                        <div className="md:hidden w-full flex justify-center">
                                            <Mail className="w-5 h-5" />
                                            {unreadSuggestions > 0 && (
                                                <span className="absolute -top-1 -right-1 md:static md:ml-2 bg-red-500 text-white text-xs w-4 h-4 md:w-5 md:h-5 flex items-center justify-center rounded-full border border-black/20 shadow-lg">
                                                    {unreadSuggestions}
                                                </span>
                                            )}
                                        </div>


                                        <div className="hidden md:flex items-center justify-between w-full">
                                            <div className="flex items-center">
                                                <Mail className="w-4 h-4 mr-2" />
                                                <span className="text-sm">Inbox</span>
                                            </div>
                                            {unreadSuggestions > 0 && (
                                                <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                                                    {unreadSuggestions}
                                                </span>
                                            )}
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => setActiveSettingsTab("stats")}
                                        className={`w-full flex ${activeSettingsTab === "stats"
                                            ? "bg-white/10 text-white"
                                            : "text-white/70 hover:text-white hover:bg-white/5"
                                            } rounded-lg transition-colors relative ${"px-0 md:px-3 py-2.5 md:py-2"
                                            }`}
                                    >
                                        <div className="md:hidden w-full flex justify-center">
                                            <BarChart2 className="w-5 h-5" />
                                        </div>

                                        <div className="hidden md:flex items-center">
                                            <BarChart2 className="w-4 h-4 mr-2" />
                                            <span className="text-sm">Statistics</span>
                                        </div>
                                    </button>
                                </div>

                                <div className="flex-grow"></div>

                                <button
                                    onClick={logout}
                                    className={`w-full flex mt-6 text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/10 rounded-lg transition-colors ${"px-0 md:px-3 py-3 md:py-2.5"
                                        }`}
                                >
                                    <div className="md:hidden w-full flex justify-center">
                                        <LogOut className="w-5 h-5" />
                                    </div>

                                    <div className="hidden md:flex items-center">
                                        <LogOut className="w-4 h-4 mr-2" />
                                        <span className="text-sm">Sign out</span>
                                    </div>
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto backdrop-blur-lg bg-white/5">
                                {activeSettingsTab === "profile" && (
                                    <div className="p-6">
                                        <h2 className="text-xl font-semibold text-white mb-8">Profile Settings</h2>

                                        <div className="flex flex-col items-center mb-8">
                                            <div className="relative group">
                                                <div className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center bg-black/20 border-2 border-white/20">
                                                    {profileImagePreview ? (
                                                        <img
                                                            src={profileImagePreview}
                                                            alt={username}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="text-white text-3xl font-semibold">
                                                            {username?.charAt(0)?.toUpperCase() || "U"}
                                                        </div>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center shadow-lg text-white transition-colors"
                                                >
                                                    <Camera className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    if (e.target.files && e.target.files[0]) {
                                                        const file = e.target.files[0];
                                                        setProfileImageFile(file);
                                                        setProfileImagePreview(URL.createObjectURL(file));
                                                    }
                                                }}
                                                className="hidden"
                                            />

                                            {profileImageFile && (
                                                <div className="mt-3 flex items-center">
                                                    <button
                                                        onClick={async () => {
                                                            /* função existente */
                                                        }}
                                                        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
                                                    >
                                                        <UploadCloud className="w-3.5 h-3.5" />
                                                        Save Image
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setProfileImageFile(null);
                                                            setProfileImagePreview(userImage);
                                                        }}
                                                        className="ml-2 text-white/70 hover:text-white text-sm"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-6">
                                            <div>
                                                <h3 className="text-lg font-medium text-white mb-4">Change Username</h3>
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-sm text-white/70 mb-1.5">
                                                            Current Username
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={username}
                                                            disabled
                                                            className="w-full px-4 py-2.5 bg-black/10 backdrop-blur-md border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm text-white/70 mb-1.5">
                                                            New Username
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={newUsername}
                                                            onChange={(e) => setNewUsername(e.target.value)}
                                                            placeholder="Enter new username"
                                                            className="w-full px-4 py-2.5 bg-black/10 backdrop-blur-md border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                                                        />
                                                    </div>
                                                    {newUsername && (
                                                        <button
                                                            onClick={async () => {
                                                                /* função existente */
                                                            }}
                                                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                                                        >
                                                            Update Username
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <div>
                                                <h3 className="text-lg font-medium text-white mb-4">Change Password</h3>
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-sm text-white/70 mb-1.5">
                                                            Current Password
                                                        </label>
                                                        <input
                                                            type="password"
                                                            value={currentPassword}
                                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                                            placeholder="Enter current password"
                                                            className="w-full px-4 py-2.5 bg-black/10 backdrop-blur-md border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm text-white/70 mb-1.5">
                                                            New Password
                                                        </label>
                                                        <input
                                                            type="password"
                                                            value={newPassword}
                                                            onChange={(e) => setNewPassword(e.target.value)}
                                                            placeholder="Enter new password"
                                                            className="w-full px-4 py-2.5 bg-black/10 backdrop-blur-md border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm text-white/70 mb-1.5">
                                                            Confirm New Password
                                                        </label>
                                                        <input
                                                            type="password"
                                                            value={confirmNewPassword}
                                                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                                                            placeholder="Confirm new password"
                                                            className="w-full px-4 py-2.5 bg-black/10 backdrop-blur-md border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                                                        />
                                                    </div>
                                                    {currentPassword && newPassword && confirmNewPassword && (
                                                        <button
                                                            onClick={async () => {
                                                                /* função existente */
                                                            }}
                                                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                                                            disabled={!currentPassword || !newPassword || !confirmNewPassword || newPassword !== confirmNewPassword}
                                                        >
                                                            Update Password
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="pt-8 border-t border-white/10">
                                                <h3 className="text-lg font-medium text-red-400 mb-2">Danger Zone</h3>
                                                <p className="text-white/50 text-sm mb-4">
                                                    Once you delete your account, there is no going back. This action cannot be undone.
                                                </p>
                                                <button
                                                    onClick={openDeleteModal}
                                                    className="flex items-center gap-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 hover:text-red-300 px-4 py-2 rounded-lg text-sm border border-red-500/20 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    Delete Account
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeSettingsTab === "inbox" && (
                                    <div className="flex flex-col h-full">
                                        <div className="bg-black/20 p-6 border-b border-white/10">
                                            <h2 className="text-xl font-semibold text-white">Video Suggestions</h2>
                                            <p className="text-white/60 text-sm mt-1">
                                                Share and receive video suggestions with other users.
                                            </p>
                                        </div>

                                        <div className="p-6 flex-grow overflow-y-auto">
                                            <div className="mb-8">
                                                <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                                                    <Send className="w-4 h-4 mr-2" />
                                                    Send a Suggestion
                                                </h3>

                                                <div className="bg-black/10 backdrop-blur-md rounded-lg border border-white/10 p-4">
                                                    <div className="space-y-4">
                                                        <div>
                                                            <label className="block text-sm text-white/70 mb-2">
                                                                To User
                                                            </label>
                                                            <div className="relative">
                                                                <input
                                                                    type="text"
                                                                    value={sendToUsername}
                                                                    onChange={(e) => {
                                                                        setSendToUsername(e.target.value);
                                                                        setSelectedUser(null);
                                                                        searchUsers(e.target.value);
                                                                    }}
                                                                    placeholder="Search by username"
                                                                    className="w-full pl-9 pr-4 py-2.5 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                                                                    disabled={!!selectedUser}
                                                                />
                                                                <UserSearch className="absolute left-3 top-3 h-4 w-4 text-white/50" />

                                                                {sendToUsername && !selectedUser && (
                                                                    <button
                                                                        className="absolute right-2 top-2 text-white/50 hover:text-white p-1"
                                                                        onClick={() => {
                                                                            setSendToUsername("");
                                                                            setUserSearchResults([]);
                                                                        }}
                                                                    >
                                                                        <X className="h-4 w-4" />
                                                                    </button>
                                                                )}
                                                            </div>

                                                            {userSearchResults.length > 0 && !selectedUser && (
                                                                <div className="mt-1 bg-black/80 backdrop-blur-xl border border-white/10 rounded-lg overflow-hidden absolute z-10 w-[calc(100%-3rem)] max-h-48 overflow-y-auto shadow-lg"
                                                                    style={{
                                                                        backdropFilter: 'blur(16px)',
                                                                        WebkitBackdropFilter: 'blur(16px)',
                                                                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                                                                    }}>
                                                                    {userSearchResults.map(user => (
                                                                        <button
                                                                            key={user.id}
                                                                            className="flex items-center w-full p-2 hover:bg-white/10 text-left text-white text-sm"
                                                                            onClick={() => {
                                                                                setSelectedUser(user);
                                                                                setSendToUsername(user.username);
                                                                                setUserSearchResults([]);
                                                                            }}
                                                                        >
                                                                            <div className="w-8 h-8 rounded-full bg-white/10 mr-2 flex items-center justify-center overflow-hidden">
                                                                                {user.imageUrl ? (
                                                                                    <img src={user.imageUrl} alt={user.username} className="w-full h-full object-cover" />
                                                                                ) : (
                                                                                    <span className="text-sm font-medium text-white">
                                                                                        {user.username.charAt(0).toUpperCase()}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <span>{user.username}</span>
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            )}

                                                            {searchingUser && (
                                                                <div className="mt-2 text-white/60 text-sm flex items-center">
                                                                    <svg className="animate-spin h-3 w-3 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                    </svg>
                                                                    Searching users...
                                                                </div>
                                                            )}

                                                            {selectedUser && (
                                                                <div className="mt-2 flex items-center bg-white/10 rounded-lg p-2">
                                                                    <div className="w-8 h-8 rounded-full bg-white/10 mr-2 flex items-center justify-center overflow-hidden">
                                                                        {selectedUser.imageUrl ? (
                                                                            <img src={selectedUser.imageUrl} alt={selectedUser.username} className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            <span className="text-sm font-medium text-white">
                                                                                {selectedUser.username.charAt(0).toUpperCase()}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <span className="text-white">{selectedUser.username}</span>
                                                                    <button
                                                                        className="ml-auto text-white/50 hover:text-white p-1"
                                                                        onClick={() => {
                                                                            setSelectedUser(null);
                                                                            setSendToUsername("");
                                                                        }}
                                                                    >
                                                                        <X className="h-4 w-4" />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div>
                                                            <label className="block text-sm text-white/70 mb-2">
                                                                YouTube Video URL
                                                            </label>
                                                            <div className="relative">
                                                                <input
                                                                    type="text"
                                                                    value={suggestVideoUrl}
                                                                    onChange={(e) => setSuggestVideoUrl(e.target.value)}
                                                                    placeholder="Paste YouTube video URL"
                                                                    className="w-full pl-9 pr-4 py-2.5 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                                                                />
                                                                <Youtube className="absolute left-3 top-3 h-4 w-4 text-red-400" />
                                                            </div>
                                                            <p className="text-xs text-white/50 mt-1">Note: Playlists are not supported for suggestions.</p>
                                                        </div>

                                                        <div>
                                                            <label className="block text-sm text-white/70 mb-2">
                                                                Add a Note (optional)
                                                            </label>
                                                            <textarea
                                                                value={suggestNote}
                                                                onChange={(e) => setSuggestNote(e.target.value)}
                                                                placeholder="Why are you recommending this video?"
                                                                className="w-full px-4 py-2.5 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/20 h-24 resize-none"
                                                            />
                                                        </div>

                                                        <button
                                                            onClick={sendVideoSuggestion}
                                                            disabled={!selectedUser || !suggestVideoUrl.trim() || sendingMessage}
                                                            className={`flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm transition-colors ${(!selectedUser || !suggestVideoUrl.trim() || sendingMessage) ? 'opacity-50 cursor-not-allowed' : ''
                                                                }`}
                                                        >
                                                            {sendingMessage ? (
                                                                <>
                                                                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                    </svg>
                                                                    Sending...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Send className="h-4 w-4" />
                                                                    Send Suggestion
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mb-8">
                                                <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                                                    <MessageSquare className="w-4 h-4 mr-2" />
                                                    Inbox
                                                    {unreadSuggestions > 0 && (
                                                        <span className="ml-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                                                            {unreadSuggestions} new
                                                        </span>
                                                    )}
                                                </h3>

                                                {inboxSuggestions.length === 0 ? (
                                                    <div className="bg-black/10 backdrop-blur-md rounded-lg border border-white/10 p-8 text-center">
                                                        <div className="flex justify-center mb-4">
                                                            <MessageSquare className="h-12 w-12 text-white/20" />
                                                        </div>
                                                        <p className="text-white/60">Your inbox is empty.</p>
                                                        <p className="text-white/40 text-sm mt-1">When someone sends you a video suggestion, it will appear here.</p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-4">
                                                        {inboxSuggestions
                                                            .sort((a, b) => {
                                                                if (a.read !== b.read) return a.read ? 1 : -1;
                                                                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                                                            })
                                                            .map(suggestion => (
                                                                <div
                                                                    key={suggestion.id}
                                                                    className={`bg-black/10 backdrop-blur-md rounded-lg border ${suggestion.read ? 'border-white/10' : 'border-blue-500/30'} overflow-hidden`}
                                                                    onMouseEnter={() => !suggestion.read && markAsRead(suggestion)}
                                                                >
                                                                    <div className="p-4 flex flex-col sm:flex-row gap-4">
                                                                        <a
                                                                            href={`https://www.youtube.com/watch?v=${suggestion.videoId}`}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="w-full sm:w-36 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-black/30"
                                                                        >
                                                                            <img
                                                                                src={suggestion.videoThumbnail}
                                                                                alt={suggestion.videoTitle}
                                                                                className="w-full h-full object-cover hover:opacity-80 transition-opacity"
                                                                            />
                                                                        </a>

                                                                        <div className="flex-grow min-w-0">
                                                                            <div className="flex items-start justify-between gap-4">
                                                                                <a
                                                                                    href={`https://www.youtube.com/watch?v=${suggestion.videoId}`}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="text-white font-medium hover:text-blue-400 transition-colors line-clamp-2"
                                                                                >
                                                                                    {suggestion.videoTitle}
                                                                                </a>
                                                                                {!suggestion.read && (
                                                                                    <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full flex-shrink-0">
                                                                                        New
                                                                                    </span>
                                                                                )}
                                                                            </div>

                                                                            <div className="flex items-center text-white/50 text-sm mt-1 gap-2">
                                                                                <span className="flex items-center">
                                                                                    <Clock className="h-3 w-3 mr-1" />
                                                                                    {suggestion.videoDuration ? formatDuration(suggestion.videoDuration) : "Unknown"}
                                                                                </span>

                                                                                <span className="text-white/30">•</span>

                                                                                <span>
                                                                                    From: <span className="text-white">{suggestion.fromUser?.username || "Unknown user"}</span>
                                                                                </span>
                                                                            </div>

                                                                            {suggestion.note && (
                                                                                <div className="mt-2 bg-white/5 rounded p-2 text-sm text-white/80">
                                                                                    {suggestion.note}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    <div className="bg-black/20 px-4 py-3 flex justify-between items-center">
                                                                        <div className="text-xs text-white/50">
                                                                            {new Date(suggestion.createdAt).toLocaleString()}
                                                                        </div>

                                                                        <div className="flex items-center gap-2">
                                                                            {suggestion.accepted === null ? (
                                                                                <>
                                                                                    <button
                                                                                        onClick={() => declineSuggestion(suggestion)}
                                                                                        className="flex items-center gap-1 bg-white/5 hover:bg-white/10 text-white/70 hover:text-red-400 px-3 py-1.5 rounded-lg text-sm transition-colors border border-white/10"
                                                                                    >
                                                                                        <XCircle className="w-4 h-4" />
                                                                                        Decline
                                                                                    </button>

                                                                                    <button
                                                                                        onClick={() => acceptSuggestion(suggestion)}
                                                                                        className="flex items-center gap-1 bg-blue-600/50 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm transition-colors"
                                                                                    >
                                                                                        <CheckCircle className="w-4 h-4" />
                                                                                        Accept
                                                                                    </button>
                                                                                </>
                                                                            ) : suggestion.accepted ? (
                                                                                <span className="text-green-400 text-sm flex items-center gap-1">
                                                                                    <CheckCircle className="w-4 h-4" /> Accepted
                                                                                </span>
                                                                            ) : (
                                                                                <span className="text-red-400 text-sm flex items-center gap-1">
                                                                                    <XCircle className="w-4 h-4" /> Declined
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                    </div>
                                                )}
                                            </div>

                                            <div>
                                                <h3 className="text-lg font-medium text-white/80 mb-4 flex items-center">
                                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                                    Sent Suggestions
                                                </h3>

                                                {outboxSuggestions.length === 0 ? (
                                                    <div className="bg-black/10 backdrop-blur-md rounded-lg border border-white/10 p-8 text-center">
                                                        <p className="text-white/60">You haven't sent any suggestions yet.</p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-4">
                                                        {outboxSuggestions
                                                            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                                            .map(suggestion => (
                                                                <div
                                                                    key={suggestion.id}
                                                                    className="bg-black/10 backdrop-blur-md rounded-lg border border-white/10 overflow-hidden"
                                                                >
                                                                    <div className="p-4 flex flex-col sm:flex-row gap-4">
                                                                        <a
                                                                            href={`https://www.youtube.com/watch?v=${suggestion.videoId}`}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="w-full sm:w-36 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-black/30"
                                                                        >
                                                                            <img
                                                                                src={suggestion.videoThumbnail}
                                                                                alt={suggestion.videoTitle}
                                                                                className="w-full h-full object-cover hover:opacity-80 transition-opacity"
                                                                            />
                                                                        </a>

                                                                        <div className="flex-grow min-w-0">
                                                                            <a
                                                                                href={`https://www.youtube.com/watch?v=${suggestion.videoId}`}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="text-white font-medium hover:text-blue-400 transition-colors line-clamp-2"
                                                                            >
                                                                                {suggestion.videoTitle}
                                                                            </a>

                                                                            <div className="flex items-center text-white/50 text-sm mt-1 gap-2">
                                                                                <span className="flex items-center">
                                                                                    <Clock className="h-3 w-3 mr-1" />
                                                                                    {suggestion.videoDuration ? formatDuration(suggestion.videoDuration) : "Unknown"}
                                                                                </span>

                                                                                <span className="text-white/30">•</span>

                                                                                <span>
                                                                                    To: <span className="text-white">{suggestion.toUser?.username || "Unknown user"}</span>
                                                                                </span>

                                                                                {suggestion.read && (
                                                                                    <>
                                                                                        <span className="text-white/30">•</span>
                                                                                        <span className="text-white/60">Seen</span>
                                                                                    </>
                                                                                )}
                                                                            </div>

                                                                            {suggestion.note && (
                                                                                <div className="mt-2 bg-white/5 rounded p-2 text-sm text-white/80">
                                                                                    {suggestion.note}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    <div className="bg-black/20 px-4 py-3 flex justify-between items-center">
                                                                        <div className="text-xs text-white/50">
                                                                            {new Date(suggestion.createdAt).toLocaleString()}
                                                                        </div>

                                                                        <div className="flex items-center gap-2">
                                                                            {suggestion.accepted !== null && (
                                                                                suggestion.accepted ? (
                                                                                    <span className="text-green-400 text-sm flex items-center gap-1">
                                                                                        <CheckCircle className="w-4 h-4" /> Accepted
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="text-red-400 text-sm flex items-center gap-1">
                                                                                        <XCircle className="w-4 h-4" /> Declined
                                                                                    </span>
                                                                                )
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeSettingsTab === "stats" && (
                                    <div className="flex flex-col h-full">
                                        <div className="bg-black/20 p-6 border-b border-white/10">
                                            <h2 className="text-xl font-semibold text-white">Statistics</h2>
                                            <p className="text-white/60 text-sm mt-1">
                                                Track your viewing progress and video statistics
                                            </p>
                                        </div>

                                        <div className="p-6 flex-grow overflow-y-auto">
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                                                <div className="bg-black/30 backdrop-blur-xl rounded-lg p-4 border border-white/10 flex flex-col items-center">
                                                    <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider">Total</h3>
                                                    <p className="text-3xl font-bold text-white mt-2">{statsData.totalCount}</p>
                                                </div>
                                                <div className="bg-black/30 backdrop-blur-xl rounded-lg p-4 border border-white/10 flex flex-col items-center">
                                                    <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider">In list</h3>
                                                    <p className="text-3xl font-bold text-blue-400 mt-2">{statsData.watchLaterCount}</p>
                                                </div>
                                                <div className="bg-black/30 backdrop-blur-xl rounded-lg p-4 border border-white/10 flex flex-col items-center">
                                                    <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider">Watching</h3>
                                                    <p className="text-3xl font-bold text-purple-400 mt-2">{statsData.watchingCount}</p>
                                                </div>
                                                <div className="bg-black/30 backdrop-blur-xl rounded-lg p-4 border border-white/10 flex flex-col items-center">
                                                    <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider">Watched</h3>
                                                    <p className="text-3xl font-bold text-green-400 mt-2">{statsData.watchedCount}</p>
                                                </div>
                                            </div>

                                            <div className="mb-3 bg-black/20 backdrop-blur-xl rounded-lg p-6 border border-white/10">
                                                <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                                                    <Clock className="w-4 h-4 mr-2" />
                                                    Watch Time Statistics
                                                </h3>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div className="bg-white/5 rounded-lg p-4 text-center">
                                                        <h4 className="text-white/60 text-sm">Total Watch Time</h4>
                                                        <p className="text-2xl font-bold text-white mt-2">
                                                            {formatTotalTime(statsData.watchedCount ? columns.WATCHED.videos.reduce((total, video) => total + (video.durationSeconds || 0), 0) : 0)}
                                                        </p>
                                                    </div>
                                                    <div className="bg-white/5 rounded-lg p-4 text-center">
                                                        <h4 className="text-white/60 text-sm">Average Video Length</h4>
                                                        <p className="text-2xl font-bold text-white mt-2">
                                                            {formatDuration(statsData.totalCount ?
                                                                Math.round(
                                                                    [...columns.WATCH_LATER.videos,
                                                                    ...columns.WATCHING.videos,
                                                                    ...columns.WATCHED.videos]
                                                                        .filter(video => !video.isPlaylist)
                                                                        .reduce((total, video) => total + (video.durationSeconds || 0), 0) /
                                                                    statsData.totalCount
                                                                ) : 0
                                                            )}
                                                        </p>
                                                    </div>
                                                    <div className="bg-white/5 rounded-lg p-4 text-center">
                                                        <h4 className="text-white/60 text-sm">Completion Rate</h4>
                                                        <p className="text-2xl font-bold text-white mt-2">
                                                            {statsData.totalCount ? Math.round((statsData.watchedCount / statsData.totalCount) * 100) : 0}%
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mb-3 bg-black/20 backdrop-blur-xl rounded-lg p-6 border border-white/10">
                                                <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                                                    <PieChart className="w-4 h-4 mr-2" />
                                                    Video Distribution
                                                </h3>

                                                <div className="flex flex-col md:flex-row items-center justify-center gap-8">
                                                    <div className="h-64 w-full md:w-64">
                                                        {statsData.totalCount > 0 ? (
                                                            <Pie
                                                                data={{
                                                                    labels: ['Watch Later', 'Watching', 'Watched'],
                                                                    datasets: [
                                                                        {
                                                                            data: [statsData.watchLaterCount, statsData.watchingCount, statsData.watchedCount],
                                                                            backgroundColor: [
                                                                                'rgba(59, 130, 246, 0.6)', // Blue
                                                                                'rgba(139, 92, 246, 0.6)',  // Purple
                                                                                'rgba(16, 185, 129, 0.6)'   // Green
                                                                            ],
                                                                            borderColor: [
                                                                                'rgba(59, 130, 246, 1)',
                                                                                'rgba(139, 92, 246, 1)',
                                                                                'rgba(16, 185, 129, 1)'
                                                                            ],
                                                                            borderWidth: 1,
                                                                        },
                                                                    ],
                                                                }}
                                                                options={{
                                                                    responsive: true,
                                                                    plugins: {
                                                                        legend: {
                                                                            position: 'bottom',
                                                                            labels: {
                                                                                color: 'rgba(255, 255, 255, 0.7)'
                                                                            }
                                                                        },
                                                                        tooltip: {
                                                                            callbacks: {
                                                                                label: function (tooltipItem: TooltipItem<"pie">) {
                                                                                    const label = tooltipItem.label || '';
                                                                                    const value = typeof tooltipItem.raw === 'number' ? tooltipItem.raw : 0;
                                                                                    const percentage = statsData.totalCount
                                                                                        ? Math.round((value / statsData.totalCount) * 100)
                                                                                        : 0;
                                                                                    return `${label}: ${value} (${percentage}%)`;
                                                                                }
                                                                            }
                                                                        }
                                                                    }
                                                                }}
                                                            />
                                                        ) : (
                                                            <div className="h-full w-full flex items-center justify-center text-white/40">
                                                                No data to display
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="md:flex-1">
                                                        <div className="space-y-3">
                                                            <div>
                                                                <div className="flex justify-between items-center mb-1">
                                                                    <span className="text-sm text-white/70 flex items-center">
                                                                        <span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                                                                        Watch Later
                                                                    </span>
                                                                    <span className="text-sm font-medium text-white">
                                                                        {statsData.totalCount > 0
                                                                            ? Math.round((statsData.watchLaterCount / statsData.totalCount) * 100)
                                                                            : 0}%
                                                                    </span>
                                                                </div>
                                                                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                                                    <div
                                                                        className="h-full bg-blue-500 rounded-full"
                                                                        style={{
                                                                            width: `${statsData.totalCount > 0
                                                                                ? (statsData.watchLaterCount / statsData.totalCount) * 100
                                                                                : 0}%`
                                                                        }}
                                                                    ></div>
                                                                </div>
                                                            </div>

                                                            <div>
                                                                <div className="flex justify-between items-center mb-1">
                                                                    <span className="text-sm text-white/70 flex items-center">
                                                                        <span className="inline-block w-3 h-3 bg-purple-500 rounded-full mr-2"></span>
                                                                        Watching
                                                                    </span>
                                                                    <span className="text-sm font-medium text-white">
                                                                        {statsData.totalCount > 0
                                                                            ? Math.round((statsData.watchingCount / statsData.totalCount) * 100)
                                                                            : 0}%
                                                                    </span>
                                                                </div>
                                                                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                                                    <div
                                                                        className="h-full bg-purple-500 rounded-full"
                                                                        style={{
                                                                            width: `${statsData.totalCount > 0
                                                                                ? (statsData.watchingCount / statsData.totalCount) * 100
                                                                                : 0}%`
                                                                        }}
                                                                    ></div>
                                                                </div>
                                                            </div>

                                                            <div>
                                                                <div className="flex justify-between items-center mb-1">
                                                                    <span className="text-sm text-white/70 flex items-center">
                                                                        <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                                                                        Watched
                                                                    </span>
                                                                    <span className="text-sm font-medium text-white">
                                                                        {statsData.totalCount > 0
                                                                            ? Math.round((statsData.watchedCount / statsData.totalCount) * 100)
                                                                            : 0}%
                                                                    </span>
                                                                </div>
                                                                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                                                    <div
                                                                        className="h-full bg-green-500 rounded-full"
                                                                        style={{
                                                                            width: `${statsData.totalCount > 0
                                                                                ? (statsData.watchedCount / statsData.totalCount) * 100
                                                                                : 0}%`
                                                                        }}
                                                                    ></div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mb-3 bg-black/20 backdrop-blur-xl rounded-lg p-6 border border-white/10">
                                                <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                                                    <TrendingUp className="w-4 h-4 mr-2" />
                                                    Watched Videos Progress
                                                </h3>

                                                <div className="mb-4 flex gap-2">
                                                    <button
                                                        onClick={() => setProgressStartDate('last7days')}
                                                        className={`px-3 py-1.5 rounded-md text-sm ${progressStartDate === 'last7days'
                                                            ? 'bg-white/20 text-white'
                                                            : 'bg-transparent text-white/50 hover:text-white'
                                                            }`}
                                                    >
                                                        Last 7 days
                                                    </button>
                                                    <button
                                                        onClick={() => setProgressStartDate('last30days')}
                                                        className={`px-3 py-1.5 rounded-md text-sm ${progressStartDate === 'last30days'
                                                            ? 'bg-white/20 text-white'
                                                            : 'bg-transparent text-white/50 hover:text-white'
                                                            }`}
                                                    >
                                                        Last 30 days
                                                    </button>
                                                    <button
                                                        onClick={() => setProgressStartDate('allTime')}
                                                        className={`px-3 py-1.5 rounded-md text-sm ${progressStartDate === 'allTime'
                                                            ? 'bg-white/20 text-white'
                                                            : 'bg-transparent text-white/50 hover:text-white'
                                                            }`}
                                                    >
                                                        All time
                                                    </button>
                                                </div>

                                                <div className="relative h-64">
                                                    {progressData.length > 0 ? (
                                                        <Line
                                                            data={{
                                                                labels: progressData.map(item => item.date),
                                                                datasets: [
                                                                    {
                                                                        label: 'Watched Videos',
                                                                        data: progressData.map(item => item.count),
                                                                        borderColor: 'rgba(16, 185, 129, 1)',
                                                                        backgroundColor: 'rgba(16, 185, 129, 0.2)',
                                                                        fill: true,
                                                                        tension: 0.4,
                                                                    }
                                                                ]
                                                            }}
                                                            options={{
                                                                responsive: true,
                                                                scales: {
                                                                    x: {
                                                                        type: 'time',
                                                                        time: {
                                                                            unit: progressStartDate === 'last7days' ? 'day' :
                                                                                progressStartDate === 'last30days' ? 'week' : 'month',
                                                                            tooltipFormat: 'MMM d, yyyy',
                                                                            displayFormats: {
                                                                                day: 'MMM d',
                                                                                week: 'MMM d',
                                                                                month: 'MMM yyyy'
                                                                            }
                                                                        },
                                                                        adapters: {
                                                                            date: {
                                                                                locale: enUS
                                                                            }
                                                                        },
                                                                        grid: {
                                                                            color: 'rgba(255, 255, 255, 0.05)'
                                                                        },
                                                                        ticks: {
                                                                            color: 'rgba(255, 255, 255, 0.5)'
                                                                        }
                                                                    },
                                                                    y: {
                                                                        beginAtZero: true,
                                                                        grid: {
                                                                            color: 'rgba(255, 255, 255, 0.05)'
                                                                        },
                                                                        ticks: {
                                                                            precision: 0,
                                                                            color: 'rgba(255, 255, 255, 0.5)'
                                                                        }
                                                                    }
                                                                },
                                                                plugins: {
                                                                    legend: {
                                                                        display: false
                                                                    },
                                                                    tooltip: {
                                                                        callbacks: {
                                                                            title: function (context) {
                                                                                const date = new Date(context[0].label);
                                                                                return date.toLocaleDateString(undefined, {
                                                                                    year: 'numeric',
                                                                                    month: 'long',
                                                                                    day: 'numeric'
                                                                                });
                                                                            },
                                                                            label: function (context) {
                                                                                return `Total Watched: ${context.raw}`;
                                                                            }
                                                                        }
                                                                    }
                                                                }
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className="h-full w-full flex items-center justify-center text-white/40">
                                                            No progress data available
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Dialog.Panel>
                </div>
            </Dialog>
        </div>
    );
}