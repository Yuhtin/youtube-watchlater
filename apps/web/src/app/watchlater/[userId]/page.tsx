"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Plus, X, Youtube, Trash2, AlertCircle, ListVideo, Eye, EyeOff, List, Settings, LogOut, Camera, UploadCloud, Mail, Send, UserSearch, CheckCircle, XCircle, MessageSquare, Clock, ArrowLeft, User, BarChart2, PieChart, TrendingUp } from "lucide-react";
import { toast, Toaster } from "sonner";
import { useRouter, useParams } from "next/navigation";
import { Dialog } from '@headlessui/react';
import { KanbanBoard, Column as KanbanColumn, CardItem } from '../../../components/KanbanBoard';
import { Sidebar } from '@/src/components/Sidebar';
import { CreateListModal } from '@/src/components/CreateListModal';
import { ImportPlaylistModal } from '@/src/components/ImportPlaylistModal';
import { apiRequest } from '@/src/auth/utility';
import { jwtDecode } from "jwt-decode";
import { FilterBar, FilterOptions } from "@/src/components/FilterBar";
import { SmartPickModal } from "@/src/components/SmartPickModal";
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
        const data = await apiRequest(`/youtube/videos/${videoId}`);
        if (!data || data.success === false || !data.title) return null;
        return {
            title: data.title,
            durationSeconds: data.durationSeconds ?? null,
        };
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


export default function WatchLaterPage() {
    const [videoUrl, setVideoUrl] = useState("");
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
    const [activeListId, setActiveListId] = useState<string | null>(null);
    const [sidebarRefresh, setSidebarRefresh] = useState(0);
    const [isSmartPickOpen, setIsSmartPickOpen] = useState(false);
    const [isCreateListOpen, setIsCreateListOpen] = useState(false);
    const [isImportPlaylistOpen, setIsImportPlaylistOpen] = useState(false);
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

            setIsAuthenticated(true);
            fetchSuggestions();
        } catch (error) {
            console.error('Invalid token:', error);
            localStorage.removeItem("token");
            router.push(`/login/${userId}`);
        }
    }, [userId, router]);

    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) return;
        apiRequest('/lists').then((lists) => {
            if (!Array.isArray(lists) || lists.length === 0) return;
            const def = lists.find((l: any) => l.isDefault) ?? lists[0];
            setActiveListId(def.id);
        });
    }, [isAuthenticated, sidebarRefresh]);

    useEffect(() => {
        if (!isAuthenticated || activeListId === null) return;
        fetchColumns();
    }, [activeListId, isAuthenticated]);

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
            const listParam = activeListId ? `&listId=${activeListId}` : '';
            const data = await apiRequest(`/cards?userId=${userId}${listParam}`);

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
            toast.info("Use Import from YouTube to add a playlist", {
                description: "Click '+ IMPORT_FROM_YT()' in the sidebar"
            });
            setVideoUrl("");
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
                listId: activeListId ?? undefined,
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
        try {
            const data = await apiRequest(`/youtube/playlists/${playlistId}`);
            if (!data || data.success === false || !data.title) {
                return { title: `Playlist ${playlistId}`, thumbnailUrl: '' };
            }
            return {
                title: data.title,
                thumbnailUrl: data.thumbnailUrl ?? '',
            };
        } catch (error) {
            console.log("Issue fetching playlist details:", error);
            return { title: `Playlist ${playlistId}`, thumbnailUrl: '' };
        }
    };

    const fetchPlaylistVideos = async (playlistId: string) => {
        try {
            const data = await apiRequest(`/youtube/playlists/${playlistId}/items`);
            if (!Array.isArray(data)) return [];
            return data;
        } catch (error) {
            console.log("Issue fetching playlist videos:", error);
            return [];
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
                    listId: activeListId ?? undefined,
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
        if (activeSettingsTab === "stats" && isSettingsModalOpen) {
            calculateStats();
        }
    }, [activeSettingsTab, isSettingsModalOpen, columns]);

    return (
        <div className="flex h-screen bg-paper text-ink">
            <Sidebar
                activeListId={activeListId}
                onSelect={setActiveListId}
                onNewList={() => setIsCreateListOpen(true)}
                onImportPlaylist={() => setIsImportPlaylistOpen(true)}
                onDelete={(_, defaultId) => {
                    setActiveListId(defaultId);
                    setSidebarRefresh((n) => n + 1);
                }}
                refreshKey={sidebarRefresh}
            />
            <div className="flex-1 overflow-y-auto">
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
                        onClick={() => setIsSmartPickOpen(true)}
                        className="border-2 border-ink px-3 py-1.5 text-[11px] font-bold font-mono hover:bg-ink hover:text-paper"
                    >
                        ▸ SMART_PICK()
                    </button>
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
                    <Dialog.Panel className="w-full max-w-md bg-paper border-2 border-ink shadow-brutal-red">
                        <div className="border-b-2 border-ink p-2 px-3 flex justify-between text-[11px] font-bold">
                            <span>▶ DELETE_ACCOUNT</span>
                            <button onClick={() => !isDeleting && setIsDeleteModalOpen(false)}>[x]</button>
                        </div>

                        <div className="p-4">
                            <div className="border-2 border-accent bg-accent/5 p-3 mb-4">
                                <p className="text-[11px] font-mono">
                                    This action <span className="font-bold text-accent">cannot be undone</span>.
                                    All your data, including your videos and preferences will be permanently deleted.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-[10px] font-bold mb-2">CONFIRM USERNAME</label>
                                    <input
                                        type="text"
                                        value={deleteUsername}
                                        onChange={(e) => setDeleteUsername(e.target.value)}
                                        className="w-full border-1.5 border-ink bg-white px-2 py-1.5 text-[12px] font-mono"
                                        placeholder="Enter your username"
                                        disabled={isDeleting}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold mb-2">CONFIRM PASSWORD</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={deletePassword}
                                            onChange={(e) => setDeletePassword(e.target.value)}
                                            className="w-full border-1.5 border-ink bg-white px-2 py-1.5 text-[12px] font-mono pr-8"
                                            placeholder="Enter your password"
                                            disabled={isDeleting}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-ink/50 hover:text-ink"
                                        >
                                            {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold mb-2">SECURITY VERIFICATION</label>
                                    <div className="mb-2 p-2 bg-ink/5 border-1.5 border-ink font-mono text-[12px] tracking-wider">
                                        {generatedCode}
                                    </div>
                                    <input
                                        type="text"
                                        value={deleteConfirmationCode}
                                        onChange={(e) => setDeleteConfirmationCode(e.target.value)}
                                        className="w-full border-1.5 border-ink bg-white px-2 py-1.5 text-[12px] font-mono"
                                        placeholder="Type the code exactly as shown above"
                                        disabled={isDeleting}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-1.5 mt-4">
                                <button
                                    onClick={handleDeleteAccount}
                                    className={`flex-1 bg-accent text-paper px-4 py-2 text-[11px] font-bold border-2 border-accent shadow-brutal-red flex items-center justify-center disabled:opacity-50`}
                                    disabled={isDeleting || !deleteUsername || !deletePassword || !deleteConfirmationCode}
                                >
                                    {isDeleting ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-2 h-3.5 w-3.5 text-paper" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            DELETING...
                                        </>
                                    ) : (
                                        <>▶ DELETE FOREVER</>
                                    )}
                                </button>
                                <button
                                    onClick={() => setIsDeleteModalOpen(false)}
                                    className="border-2 border-ink px-3 py-2 text-[11px] font-bold"
                                    disabled={isDeleting}
                                >
                                    CANCEL
                                </button>
                            </div>
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
                            <Dialog.Panel className="w-full max-w-5xl h-[80vh] bg-paper border-2 border-ink shadow-brutal-red overflow-hidden flex flex-col">
                                <div className="border-b-2 border-ink p-2 px-3 flex justify-between items-center text-[11px] font-bold flex-shrink-0">
                                    <div className="flex items-center gap-2">
                                        <span>▶ PLAYLIST</span>
                                        <span className="font-mono text-ink/60 truncate max-w-xs">{selectedPlaylist.title}</span>
                                        <span className="font-mono text-ink/40">· {selectedPlaylist._count?.cards || 0} videos</span>
                                        <a
                                            href={`https://www.youtube.com/playlist?list=${selectedPlaylist.playlistId}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center border-1.5 border-accent text-accent text-[10px] font-mono px-2 py-0.5 hover:bg-accent hover:text-paper transition-colors"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Youtube className="w-3 h-3 mr-1" />
                                            YT
                                        </a>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm(`Are you sure you want to delete the playlist "${selectedPlaylist.title}"?`)) {
                                                    removeVideo("WATCH_LATER", `playlist-${selectedPlaylist.playlistId}`);
                                                    setSelectedPlaylist(null);
                                                }
                                            }}
                                            className="text-accent hover:bg-accent hover:text-paper p-1 transition-colors"
                                            title="Delete playlist"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedPlaylist(null);
                                            }}
                                            className="font-bold"
                                            title="Close"
                                        >
                                            [x]
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-grow overflow-y-auto p-4">
                                    {selectedPlaylist && renderPlaylistKanban()}
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
                    <Dialog.Panel className="w-full max-w-md bg-paper border-2 border-ink shadow-brutal-red">
                        <div className="border-b-2 border-ink p-2 px-3 flex justify-between text-[11px] font-bold">
                            <span>▶ BULK_ADD_VIDEOS</span>
                            <button onClick={() => !isProcessing && setIsBulkAddModalOpen(false)}>[x]</button>
                        </div>

                        <div className="p-4">
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-[10px] font-bold mb-2">YOUTUBE URLS (ONE PER LINE)</label>
                                    <textarea
                                        value={bulkUrls}
                                        onChange={(e) => setBulkUrls(e.target.value)}
                                        className="w-full h-40 border-1.5 border-ink bg-white px-2 py-1.5 text-[12px] font-mono resize-none"
                                        placeholder="https://www.youtube.com/watch?v=..."
                                        disabled={isProcessing}
                                    />
                                </div>

                                {showResults && (
                                    <div className="border-1.5 border-ink bg-ink/5 p-3 font-mono text-[11px] space-y-1">
                                        <p><span className="font-bold">{processedResults.success}</span> videos added.</p>
                                        <p><span className="font-bold">{processedResults.duplicates}</span> duplicates found.</p>
                                        <p><span className="font-bold text-accent">{processedResults.failed}</span> failed.</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-1.5 mt-3">
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
                                                listId: activeListId ?? undefined,
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
                                    className="flex-1 bg-ink text-paper px-4 py-2 text-[11px] font-bold border-2 border-ink shadow-brutal-red flex items-center justify-center disabled:opacity-50"
                                    disabled={isProcessing || !bulkUrls.trim()}
                                >
                                    {isProcessing ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-2 h-3.5 w-3.5 text-paper" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            PROCESSING...
                                        </>
                                    ) : (
                                        <>▶ ADD VIDEOS</>
                                    )}
                                </button>
                                <button
                                    onClick={() => setIsBulkAddModalOpen(false)}
                                    className="border-2 border-ink px-3 py-2 text-[11px] font-bold"
                                    disabled={isProcessing}
                                >
                                    CANCEL
                                </button>
                            </div>
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
                    className="fixed inset-0 bg-black/70"
                    aria-hidden="true"
                    onClick={() => setIsSettingsModalOpen(false)}
                />

                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <Dialog.Panel className="w-full max-w-3xl h-[85vh] bg-paper border-2 border-ink shadow-brutal-red overflow-hidden flex flex-col">
                        <div className="border-b-2 border-ink p-2 px-3 flex justify-between items-center text-[11px] font-bold flex-shrink-0">
                            <span>▶ SETTINGS</span>
                            <button onClick={() => setIsSettingsModalOpen(false)}>[x]</button>
                        </div>

                        <div className="relative flex-1 flex overflow-hidden">
                            <div className="w-12 md:w-48 flex flex-col border-r-2 border-ink bg-ink/5">
                                <Dialog.Title className="text-[10px] font-bold mb-2 hidden md:block px-3 pt-3 uppercase tracking-wide text-ink/50">
                                    Navigation
                                </Dialog.Title>

                                <div className="space-y-0.5 p-1 md:p-2">
                                    <button
                                        onClick={() => setActiveSettingsTab("profile")}
                                        className={`w-full flex text-[10px] font-bold font-mono transition-colors border ${activeSettingsTab === "profile"
                                            ? "bg-ink text-paper border-ink"
                                            : "border-transparent text-ink/60 hover:text-ink hover:border-ink/30"
                                            } px-1 md:px-2 py-1.5`}
                                    >
                                        <div className="md:hidden w-full flex justify-center">
                                            <User className="w-4 h-4" />
                                        </div>
                                        <div className="hidden md:flex items-center">
                                            <User className="w-3 h-3 mr-1.5" />
                                            PROFILE
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => setActiveSettingsTab("inbox")}
                                        className={`w-full flex text-[10px] font-bold font-mono transition-colors border relative ${activeSettingsTab === "inbox"
                                            ? "bg-ink text-paper border-ink"
                                            : "border-transparent text-ink/60 hover:text-ink hover:border-ink/30"
                                            } px-1 md:px-2 py-1.5`}
                                    >
                                        <div className="md:hidden w-full flex justify-center">
                                            <Mail className="w-4 h-4" />
                                            {unreadSuggestions > 0 && (
                                                <span className="absolute -top-1 -right-1 bg-accent text-paper text-[8px] w-3.5 h-3.5 flex items-center justify-center font-bold">
                                                    {unreadSuggestions}
                                                </span>
                                            )}
                                        </div>
                                        <div className="hidden md:flex items-center justify-between w-full">
                                            <div className="flex items-center">
                                                <Mail className="w-3 h-3 mr-1.5" />
                                                INBOX
                                            </div>
                                            {unreadSuggestions > 0 && (
                                                <span className="bg-accent text-paper text-[8px] px-1 py-0.5 font-bold">
                                                    {unreadSuggestions}
                                                </span>
                                            )}
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => setActiveSettingsTab("stats")}
                                        className={`w-full flex text-[10px] font-bold font-mono transition-colors border ${activeSettingsTab === "stats"
                                            ? "bg-ink text-paper border-ink"
                                            : "border-transparent text-ink/60 hover:text-ink hover:border-ink/30"
                                            } px-1 md:px-2 py-1.5`}
                                    >
                                        <div className="md:hidden w-full flex justify-center">
                                            <BarChart2 className="w-4 h-4" />
                                        </div>
                                        <div className="hidden md:flex items-center">
                                            <BarChart2 className="w-3 h-3 mr-1.5" />
                                            STATS
                                        </div>
                                    </button>
                                </div>

                                <div className="flex-grow"></div>

                                <div className="p-1 md:p-2 border-t-2 border-ink">
                                    <button
                                        onClick={logout}
                                        className="w-full flex text-[10px] font-bold font-mono text-accent hover:bg-accent hover:text-paper border border-accent transition-colors px-1 md:px-2 py-1.5"
                                    >
                                        <div className="md:hidden w-full flex justify-center">
                                            <LogOut className="w-4 h-4" />
                                        </div>
                                        <div className="hidden md:flex items-center">
                                            <LogOut className="w-3 h-3 mr-1.5" />
                                            SIGN OUT
                                        </div>
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto bg-paper">
                                {activeSettingsTab === "profile" && (
                                    <div className="p-4">
                                        <h2 className="text-[11px] font-bold uppercase tracking-wide mb-4 border-b-2 border-ink pb-1">Profile Settings</h2>

                                        <div className="flex flex-col items-center mb-6">
                                            <div className="relative group">
                                                <div className="w-20 h-20 overflow-hidden flex items-center justify-center bg-ink/10 border-2 border-ink">
                                                    {profileImagePreview ? (
                                                        <img
                                                            src={profileImagePreview}
                                                            alt={username}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="text-ink text-2xl font-black font-display">
                                                            {username?.charAt(0)?.toUpperCase() || "U"}
                                                        </div>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="absolute bottom-0 right-0 w-7 h-7 bg-ink text-paper flex items-center justify-center border-2 border-ink"
                                                >
                                                    <Camera className="w-3.5 h-3.5" />
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
                                                <div className="mt-2 flex items-center gap-1.5">
                                                    <button
                                                        onClick={async () => {
                                                            /* função existente */
                                                        }}
                                                        className="flex items-center gap-1 bg-ink text-paper text-[10px] font-bold px-2 py-1 border-2 border-ink shadow-brutal-red"
                                                    >
                                                        <UploadCloud className="w-3 h-3" />
                                                        ▶ SAVE IMAGE
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setProfileImageFile(null);
                                                            setProfileImagePreview(userImage);
                                                        }}
                                                        className="border-2 border-ink text-[10px] font-bold px-2 py-1"
                                                    >
                                                        CANCEL
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <h3 className="text-[10px] font-bold uppercase tracking-wide mb-3">Change Username</h3>
                                                <div className="space-y-2">
                                                    <div>
                                                        <label className="block text-[10px] font-bold mb-1.5">CURRENT USERNAME</label>
                                                        <input
                                                            type="text"
                                                            value={username}
                                                            disabled
                                                            className="w-full border-1.5 border-ink bg-ink/5 px-2 py-1.5 text-[12px] font-mono opacity-60"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold mb-1.5">NEW USERNAME</label>
                                                        <input
                                                            type="text"
                                                            value={newUsername}
                                                            onChange={(e) => setNewUsername(e.target.value)}
                                                            placeholder="Enter new username"
                                                            className="w-full border-1.5 border-ink bg-white px-2 py-1.5 text-[12px] font-mono"
                                                        />
                                                    </div>
                                                    {newUsername && (
                                                        <button
                                                            onClick={async () => {
                                                                /* função existente */
                                                            }}
                                                            className="bg-ink text-paper px-3 py-1.5 text-[10px] font-bold border-2 border-ink shadow-brutal-red"
                                                        >
                                                            ▶ UPDATE USERNAME
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <div>
                                                <h3 className="text-[10px] font-bold uppercase tracking-wide mb-3">Change Password</h3>
                                                <div className="space-y-2">
                                                    <div>
                                                        <label className="block text-[10px] font-bold mb-1.5">CURRENT PASSWORD</label>
                                                        <input
                                                            type="password"
                                                            value={currentPassword}
                                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                                            placeholder="Enter current password"
                                                            className="w-full border-1.5 border-ink bg-white px-2 py-1.5 text-[12px] font-mono"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold mb-1.5">NEW PASSWORD</label>
                                                        <input
                                                            type="password"
                                                            value={newPassword}
                                                            onChange={(e) => setNewPassword(e.target.value)}
                                                            placeholder="Enter new password"
                                                            className="w-full border-1.5 border-ink bg-white px-2 py-1.5 text-[12px] font-mono"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold mb-1.5">CONFIRM NEW PASSWORD</label>
                                                        <input
                                                            type="password"
                                                            value={confirmNewPassword}
                                                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                                                            placeholder="Confirm new password"
                                                            className="w-full border-1.5 border-ink bg-white px-2 py-1.5 text-[12px] font-mono"
                                                        />
                                                    </div>
                                                    {currentPassword && newPassword && confirmNewPassword && (
                                                        <button
                                                            onClick={async () => {
                                                                /* função existente */
                                                            }}
                                                            className="bg-ink text-paper px-3 py-1.5 text-[10px] font-bold border-2 border-ink shadow-brutal-red disabled:opacity-50"
                                                            disabled={!currentPassword || !newPassword || !confirmNewPassword || newPassword !== confirmNewPassword}
                                                        >
                                                            ▶ UPDATE PASSWORD
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="pt-4 border-t-2 border-ink">
                                                <h3 className="text-[10px] font-bold uppercase tracking-wide mb-2 text-accent">Danger Zone</h3>
                                                <p className="text-[10px] font-mono text-ink/50 mb-3">
                                                    Once you delete your account, there is no going back. This action cannot be undone.
                                                </p>
                                                <button
                                                    onClick={openDeleteModal}
                                                    className="flex items-center gap-1.5 bg-accent text-paper px-3 py-1.5 text-[10px] font-bold border-2 border-accent shadow-brutal-red"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                    DELETE ACCOUNT
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeSettingsTab === "inbox" && (
                                    <div className="flex flex-col h-full">
                                        <div className="p-4 border-b-2 border-ink">
                                            <h2 className="text-[11px] font-bold uppercase tracking-wide">Video Suggestions</h2>
                                            <p className="text-[10px] font-mono text-ink/50 mt-0.5">
                                                Share and receive video suggestions with other users.
                                            </p>
                                        </div>

                                        <div className="p-4 flex-grow overflow-y-auto space-y-4">
                                            <div>
                                                <h3 className="text-[10px] font-bold uppercase tracking-wide mb-2 flex items-center">
                                                    <Send className="w-3 h-3 mr-1.5" />
                                                    Send a Suggestion
                                                </h3>

                                                <div className="border-1.5 border-ink bg-ink/5 p-3">
                                                    <div className="space-y-3">
                                                        <div>
                                                            <label className="block text-[10px] font-bold mb-1.5">TO USER</label>
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
                                                                    className="w-full border-1.5 border-ink bg-white pl-7 pr-7 py-1.5 text-[12px] font-mono"
                                                                    disabled={!!selectedUser}
                                                                />
                                                                <UserSearch className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink/40" />

                                                                {sendToUsername && !selectedUser && (
                                                                    <button
                                                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink"
                                                                        onClick={() => {
                                                                            setSendToUsername("");
                                                                            setUserSearchResults([]);
                                                                        }}
                                                                    >
                                                                        <X className="h-3.5 w-3.5" />
                                                                    </button>
                                                                )}
                                                            </div>

                                                            {userSearchResults.length > 0 && !selectedUser && (
                                                                <div className="mt-0.5 bg-paper border-2 border-ink overflow-hidden absolute z-10 w-[calc(100%-3rem)] max-h-48 overflow-y-auto shadow-brutal-red">
                                                                    {userSearchResults.map(user => (
                                                                        <button
                                                                            key={user.id}
                                                                            className="flex items-center w-full p-2 hover:bg-ink hover:text-paper text-left text-[11px] font-mono border-b border-ink/20 last:border-0"
                                                                            onClick={() => {
                                                                                setSelectedUser(user);
                                                                                setSendToUsername(user.username);
                                                                                setUserSearchResults([]);
                                                                            }}
                                                                        >
                                                                            <div className="w-6 h-6 bg-ink/10 mr-2 flex items-center justify-center overflow-hidden border border-ink/20">
                                                                                {user.imageUrl ? (
                                                                                    <img src={user.imageUrl} alt={user.username} className="w-full h-full object-cover" />
                                                                                ) : (
                                                                                    <span className="text-[10px] font-bold">
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
                                                                <div className="mt-1.5 text-[10px] font-mono text-ink/50 flex items-center">
                                                                    <svg className="animate-spin h-3 w-3 mr-1.5 text-ink" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                    </svg>
                                                                    Searching...
                                                                </div>
                                                            )}

                                                            {selectedUser && (
                                                                <div className="mt-1.5 flex items-center border-1.5 border-ink bg-ink/5 p-1.5">
                                                                    <div className="w-6 h-6 bg-ink/10 mr-1.5 flex items-center justify-center overflow-hidden border border-ink/20">
                                                                        {selectedUser.imageUrl ? (
                                                                            <img src={selectedUser.imageUrl} alt={selectedUser.username} className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            <span className="text-[10px] font-bold">
                                                                                {selectedUser.username.charAt(0).toUpperCase()}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <span className="text-[11px] font-mono font-bold">{selectedUser.username}</span>
                                                                    <button
                                                                        className="ml-auto text-ink/40 hover:text-ink"
                                                                        onClick={() => {
                                                                            setSelectedUser(null);
                                                                            setSendToUsername("");
                                                                        }}
                                                                    >
                                                                        <X className="h-3.5 w-3.5" />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div>
                                                            <label className="block text-[10px] font-bold mb-1.5">YOUTUBE VIDEO URL</label>
                                                            <div className="relative">
                                                                <input
                                                                    type="text"
                                                                    value={suggestVideoUrl}
                                                                    onChange={(e) => setSuggestVideoUrl(e.target.value)}
                                                                    placeholder="Paste YouTube video URL"
                                                                    className="w-full border-1.5 border-ink bg-white pl-7 pr-2 py-1.5 text-[12px] font-mono"
                                                                />
                                                                <Youtube className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-accent" />
                                                            </div>
                                                            <p className="text-[9px] font-mono text-ink/40 mt-1">Playlists are not supported for suggestions.</p>
                                                        </div>

                                                        <div>
                                                            <label className="block text-[10px] font-bold mb-1.5">NOTE (OPTIONAL)</label>
                                                            <textarea
                                                                value={suggestNote}
                                                                onChange={(e) => setSuggestNote(e.target.value)}
                                                                placeholder="Why are you recommending this video?"
                                                                className="w-full border-1.5 border-ink bg-white px-2 py-1.5 text-[12px] font-mono h-20 resize-none"
                                                            />
                                                        </div>

                                                        <button
                                                            onClick={sendVideoSuggestion}
                                                            disabled={!selectedUser || !suggestVideoUrl.trim() || sendingMessage}
                                                            className="flex items-center justify-center gap-1.5 bg-ink text-paper px-3 py-1.5 text-[10px] font-bold border-2 border-ink shadow-brutal-red disabled:opacity-50 w-full"
                                                        >
                                                            {sendingMessage ? (
                                                                <>
                                                                    <svg className="animate-spin h-3.5 w-3.5 text-paper" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                    </svg>
                                                                    SENDING...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Send className="h-3 w-3" />
                                                                    ▶ SEND SUGGESTION
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <h3 className="text-[10px] font-bold uppercase tracking-wide mb-2 flex items-center">
                                                    <MessageSquare className="w-3 h-3 mr-1.5" />
                                                    INBOX
                                                    {unreadSuggestions > 0 && (
                                                        <span className="ml-2 bg-accent text-paper text-[8px] px-1 py-0.5 font-bold">
                                                            {unreadSuggestions} NEW
                                                        </span>
                                                    )}
                                                </h3>

                                                {inboxSuggestions.length === 0 ? (
                                                    <div className="border-1.5 border-ink p-6 text-center font-mono text-[10px] text-ink/40">
                                                        [ EMPTY ] — No suggestions received yet.
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {inboxSuggestions
                                                            .sort((a, b) => {
                                                                if (a.read !== b.read) return a.read ? 1 : -1;
                                                                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                                                            })
                                                            .map(suggestion => (
                                                                <div
                                                                    key={suggestion.id}
                                                                    className={`border-1.5 ${suggestion.read ? 'border-ink/30' : 'border-ink'} overflow-hidden bg-white`}
                                                                    onMouseEnter={() => !suggestion.read && markAsRead(suggestion)}
                                                                >
                                                                    <div className="p-3 flex flex-col sm:flex-row gap-3">
                                                                        <a
                                                                            href={`https://www.youtube.com/watch?v=${suggestion.videoId}`}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="w-full sm:w-28 h-20 flex-shrink-0 overflow-hidden border-1.5 border-ink/30"
                                                                        >
                                                                            <img
                                                                                src={suggestion.videoThumbnail}
                                                                                alt={suggestion.videoTitle}
                                                                                className="w-full h-full object-cover hover:opacity-80 transition-opacity"
                                                                            />
                                                                        </a>

                                                                        <div className="flex-grow min-w-0">
                                                                            <div className="flex items-start justify-between gap-2">
                                                                                <a
                                                                                    href={`https://www.youtube.com/watch?v=${suggestion.videoId}`}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="text-[11px] font-bold hover:text-accent transition-colors line-clamp-2"
                                                                                >
                                                                                    {suggestion.videoTitle}
                                                                                </a>
                                                                                {!suggestion.read && (
                                                                                    <span className="bg-ink text-paper text-[8px] px-1 py-0.5 font-mono flex-shrink-0">
                                                                                        NEW
                                                                                    </span>
                                                                                )}
                                                                            </div>

                                                                            <div className="flex items-center text-ink/40 text-[9px] font-mono mt-1 gap-2">
                                                                                <span className="flex items-center">
                                                                                    <Clock className="h-2.5 w-2.5 mr-1" />
                                                                                    {suggestion.videoDuration ? formatDuration(suggestion.videoDuration) : "Unknown"}
                                                                                </span>
                                                                                <span>·</span>
                                                                                <span>
                                                                                    From: <span className="font-bold text-ink">{suggestion.fromUser?.username || "Unknown user"}</span>
                                                                                </span>
                                                                            </div>

                                                                            {suggestion.note && (
                                                                                <div className="mt-1.5 border-1.5 border-ink/20 bg-ink/5 p-1.5 text-[10px] font-mono text-ink/70">
                                                                                    {suggestion.note}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    <div className="border-t-1.5 border-ink/20 px-3 py-2 flex justify-between items-center bg-ink/5">
                                                                        <div className="text-[9px] font-mono text-ink/40">
                                                                            {new Date(suggestion.createdAt).toLocaleString()}
                                                                        </div>

                                                                        <div className="flex items-center gap-1.5">
                                                                            {suggestion.accepted === null ? (
                                                                                <>
                                                                                    <button
                                                                                        onClick={() => declineSuggestion(suggestion)}
                                                                                        className="flex items-center gap-1 border-2 border-ink text-[10px] font-bold px-2 py-1 hover:bg-accent hover:text-paper hover:border-accent transition-colors"
                                                                                    >
                                                                                        <XCircle className="w-3 h-3" />
                                                                                        DECLINE
                                                                                    </button>

                                                                                    <button
                                                                                        onClick={() => acceptSuggestion(suggestion)}
                                                                                        className="flex items-center gap-1 bg-ink text-paper border-2 border-ink text-[10px] font-bold px-2 py-1 shadow-brutal-red hover:bg-ink/80 transition-colors"
                                                                                    >
                                                                                        <CheckCircle className="w-3 h-3" />
                                                                                        ▶ ACCEPT
                                                                                    </button>
                                                                                </>
                                                                            ) : suggestion.accepted ? (
                                                                                <span className="text-green-700 text-[10px] font-bold font-mono flex items-center gap-1">
                                                                                    <CheckCircle className="w-3 h-3" /> ACCEPTED
                                                                                </span>
                                                                            ) : (
                                                                                <span className="text-accent text-[10px] font-bold font-mono flex items-center gap-1">
                                                                                    <XCircle className="w-3 h-3" /> DECLINED
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
                                                <h3 className="text-[10px] font-bold uppercase tracking-wide mb-2 flex items-center">
                                                    <ArrowLeft className="w-3 h-3 mr-1.5" />
                                                    SENT SUGGESTIONS
                                                </h3>

                                                {outboxSuggestions.length === 0 ? (
                                                    <div className="border-1.5 border-ink p-6 text-center font-mono text-[10px] text-ink/40">
                                                        [ EMPTY ] — No suggestions sent yet.
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {outboxSuggestions
                                                            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                                            .map(suggestion => (
                                                                <div
                                                                    key={suggestion.id}
                                                                    className="border-1.5 border-ink/30 overflow-hidden bg-white"
                                                                >
                                                                    <div className="p-3 flex flex-col sm:flex-row gap-3">
                                                                        <a
                                                                            href={`https://www.youtube.com/watch?v=${suggestion.videoId}`}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="w-full sm:w-28 h-20 flex-shrink-0 overflow-hidden border-1.5 border-ink/30"
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
                                                                                className="text-[11px] font-bold hover:text-accent transition-colors line-clamp-2"
                                                                            >
                                                                                {suggestion.videoTitle}
                                                                            </a>

                                                                            <div className="flex items-center text-ink/40 text-[9px] font-mono mt-1 gap-2">
                                                                                <span className="flex items-center">
                                                                                    <Clock className="h-2.5 w-2.5 mr-1" />
                                                                                    {suggestion.videoDuration ? formatDuration(suggestion.videoDuration) : "Unknown"}
                                                                                </span>
                                                                                <span>·</span>
                                                                                <span>
                                                                                    To: <span className="font-bold text-ink">{suggestion.toUser?.username || "Unknown user"}</span>
                                                                                </span>
                                                                                {suggestion.read && (
                                                                                    <>
                                                                                        <span>·</span>
                                                                                        <span>SEEN</span>
                                                                                    </>
                                                                                )}
                                                                            </div>

                                                                            {suggestion.note && (
                                                                                <div className="mt-1.5 border-1.5 border-ink/20 bg-ink/5 p-1.5 text-[10px] font-mono text-ink/70">
                                                                                    {suggestion.note}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    <div className="border-t-1.5 border-ink/20 px-3 py-2 flex justify-between items-center bg-ink/5">
                                                                        <div className="text-[9px] font-mono text-ink/40">
                                                                            {new Date(suggestion.createdAt).toLocaleString()}
                                                                        </div>

                                                                        <div className="flex items-center gap-1.5">
                                                                            {suggestion.accepted !== null && (
                                                                                suggestion.accepted ? (
                                                                                    <span className="text-green-700 text-[10px] font-bold font-mono flex items-center gap-1">
                                                                                        <CheckCircle className="w-3 h-3" /> ACCEPTED
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="text-accent text-[10px] font-bold font-mono flex items-center gap-1">
                                                                                        <XCircle className="w-3 h-3" /> DECLINED
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
                                        <div className="p-4 border-b-2 border-ink">
                                            <h2 className="text-[11px] font-bold uppercase tracking-wide">Statistics</h2>
                                            <p className="text-[10px] font-mono text-ink/50 mt-0.5">
                                                Track your viewing progress and video statistics
                                            </p>
                                        </div>

                                        <div className="p-4 flex-grow overflow-y-auto space-y-3">
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                                <div className="border-2 border-ink p-3 flex flex-col items-center bg-white">
                                                    <h3 className="text-[9px] font-bold font-mono uppercase tracking-wide text-ink/50">TOTAL</h3>
                                                    <p className="text-2xl font-black font-display mt-1">{statsData.totalCount}</p>
                                                </div>
                                                <div className="border-2 border-ink p-3 flex flex-col items-center bg-white">
                                                    <h3 className="text-[9px] font-bold font-mono uppercase tracking-wide text-ink/50">IN LIST</h3>
                                                    <p className="text-2xl font-black font-display mt-1">{statsData.watchLaterCount}</p>
                                                </div>
                                                <div className="border-2 border-accent p-3 flex flex-col items-center bg-white">
                                                    <h3 className="text-[9px] font-bold font-mono uppercase tracking-wide text-accent">WATCHING</h3>
                                                    <p className="text-2xl font-black font-display mt-1 text-accent">{statsData.watchingCount}</p>
                                                </div>
                                                <div className="border-2 border-green-600 p-3 flex flex-col items-center bg-white">
                                                    <h3 className="text-[9px] font-bold font-mono uppercase tracking-wide text-green-700">WATCHED</h3>
                                                    <p className="text-2xl font-black font-display mt-1 text-green-700">{statsData.watchedCount}</p>
                                                </div>
                                            </div>

                                            <div className="border-2 border-ink p-4">
                                                <h3 className="text-[10px] font-bold uppercase tracking-wide mb-3 flex items-center">
                                                    <Clock className="w-3 h-3 mr-1.5" />
                                                    Watch Time Statistics
                                                </h3>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                                    <div className="border-1.5 border-ink/30 p-3 text-center bg-white">
                                                        <h4 className="text-[9px] font-mono text-ink/50 uppercase">Total Watch Time</h4>
                                                        <p className="text-lg font-black font-display mt-1">
                                                            {formatTotalTime(statsData.watchedCount ? columns.WATCHED.videos.reduce((total, video) => total + (video.durationSeconds || 0), 0) : 0)}
                                                        </p>
                                                    </div>
                                                    <div className="border-1.5 border-ink/30 p-3 text-center bg-white">
                                                        <h4 className="text-[9px] font-mono text-ink/50 uppercase">Avg Video Length</h4>
                                                        <p className="text-lg font-black font-display mt-1">
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
                                                    <div className="border-1.5 border-ink/30 p-3 text-center bg-white">
                                                        <h4 className="text-[9px] font-mono text-ink/50 uppercase">Completion Rate</h4>
                                                        <p className="text-lg font-black font-display mt-1">
                                                            {statsData.totalCount ? Math.round((statsData.watchedCount / statsData.totalCount) * 100) : 0}%
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="border-2 border-ink p-4">
                                                <h3 className="text-[10px] font-bold uppercase tracking-wide mb-3 flex items-center">
                                                    <PieChart className="w-3 h-3 mr-1.5" />
                                                    Video Distribution
                                                </h3>

                                                <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                                                    <div className="h-56 w-full md:w-56">
                                                        {statsData.totalCount > 0 ? (
                                                            <Pie
                                                                data={{
                                                                    labels: ['Watch Later', 'Watching', 'Watched'],
                                                                    datasets: [
                                                                        {
                                                                            data: [statsData.watchLaterCount, statsData.watchingCount, statsData.watchedCount],
                                                                            backgroundColor: [
                                                                                'rgba(10, 10, 10, 0.7)',
                                                                                'rgba(220, 38, 38, 0.7)',
                                                                                'rgba(22, 101, 52, 0.7)'
                                                                            ],
                                                                            borderColor: [
                                                                                'rgba(10, 10, 10, 1)',
                                                                                'rgba(220, 38, 38, 1)',
                                                                                'rgba(22, 101, 52, 1)'
                                                                            ],
                                                                            borderWidth: 2,
                                                                        },
                                                                    ],
                                                                }}
                                                                options={{
                                                                    responsive: true,
                                                                    plugins: {
                                                                        legend: {
                                                                            position: 'bottom',
                                                                            labels: {
                                                                                color: 'rgba(10, 10, 10, 0.7)',
                                                                                font: { size: 10, weight: 'bold' }
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
                                                            <div className="h-full w-full flex items-center justify-center font-mono text-[10px] text-ink/40">
                                                                [ NO DATA ]
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="md:flex-1 w-full space-y-2">
                                                        <div>
                                                            <div className="flex justify-between items-center mb-1">
                                                                <span className="text-[10px] font-bold font-mono flex items-center">
                                                                    <span className="inline-block w-3 h-3 bg-ink mr-1.5"></span>
                                                                    WATCH LATER
                                                                </span>
                                                                <span className="text-[10px] font-bold font-mono">
                                                                    {statsData.totalCount > 0
                                                                        ? Math.round((statsData.watchLaterCount / statsData.totalCount) * 100)
                                                                        : 0}%
                                                                </span>
                                                            </div>
                                                            <div className="h-2 bg-ink/10 border border-ink/20 overflow-hidden">
                                                                <div
                                                                    className="h-full bg-ink"
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
                                                                <span className="text-[10px] font-bold font-mono flex items-center">
                                                                    <span className="inline-block w-3 h-3 bg-accent mr-1.5"></span>
                                                                    WATCHING
                                                                </span>
                                                                <span className="text-[10px] font-bold font-mono">
                                                                    {statsData.totalCount > 0
                                                                        ? Math.round((statsData.watchingCount / statsData.totalCount) * 100)
                                                                        : 0}%
                                                                </span>
                                                            </div>
                                                            <div className="h-2 bg-accent/10 border border-accent/20 overflow-hidden">
                                                                <div
                                                                    className="h-full bg-accent"
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
                                                                <span className="text-[10px] font-bold font-mono flex items-center">
                                                                    <span className="inline-block w-3 h-3 bg-green-600 mr-1.5"></span>
                                                                    WATCHED
                                                                </span>
                                                                <span className="text-[10px] font-bold font-mono">
                                                                    {statsData.totalCount > 0
                                                                        ? Math.round((statsData.watchedCount / statsData.totalCount) * 100)
                                                                        : 0}%
                                                                </span>
                                                            </div>
                                                            <div className="h-2 bg-green-600/10 border border-green-600/20 overflow-hidden">
                                                                <div
                                                                    className="h-full bg-green-600"
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

                                            <div className="border-2 border-ink p-4">
                                                <h3 className="text-[10px] font-bold uppercase tracking-wide mb-3 flex items-center">
                                                    <TrendingUp className="w-3 h-3 mr-1.5" />
                                                    Watched Videos Progress
                                                </h3>

                                                <div className="mb-3 flex gap-1">
                                                    <button
                                                        onClick={() => setProgressStartDate('last7days')}
                                                        className={`px-2 py-1 text-[9px] font-bold font-mono border transition-colors ${progressStartDate === 'last7days'
                                                            ? 'bg-ink text-paper border-ink'
                                                            : 'border-ink/30 text-ink/50 hover:border-ink hover:text-ink'
                                                            }`}
                                                    >
                                                        7D
                                                    </button>
                                                    <button
                                                        onClick={() => setProgressStartDate('last30days')}
                                                        className={`px-2 py-1 text-[9px] font-bold font-mono border transition-colors ${progressStartDate === 'last30days'
                                                            ? 'bg-ink text-paper border-ink'
                                                            : 'border-ink/30 text-ink/50 hover:border-ink hover:text-ink'
                                                            }`}
                                                    >
                                                        30D
                                                    </button>
                                                    <button
                                                        onClick={() => setProgressStartDate('allTime')}
                                                        className={`px-2 py-1 text-[9px] font-bold font-mono border transition-colors ${progressStartDate === 'allTime'
                                                            ? 'bg-ink text-paper border-ink'
                                                            : 'border-ink/30 text-ink/50 hover:border-ink hover:text-ink'
                                                            }`}
                                                    >
                                                        ALL
                                                    </button>
                                                </div>

                                                <div className="relative h-56">
                                                    {progressData.length > 0 ? (
                                                        <Line
                                                            data={{
                                                                labels: progressData.map(item => item.date),
                                                                datasets: [
                                                                    {
                                                                        label: 'Watched Videos',
                                                                        data: progressData.map(item => item.count),
                                                                        borderColor: 'rgba(10, 10, 10, 1)',
                                                                        backgroundColor: 'rgba(10, 10, 10, 0.1)',
                                                                        fill: true,
                                                                        tension: 0.2,
                                                                        borderWidth: 2,
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
                                                                            color: 'rgba(10, 10, 10, 0.05)'
                                                                        },
                                                                        ticks: {
                                                                            color: 'rgba(10, 10, 10, 0.5)',
                                                                            font: { size: 9 }
                                                                        }
                                                                    },
                                                                    y: {
                                                                        beginAtZero: true,
                                                                        grid: {
                                                                            color: 'rgba(10, 10, 10, 0.05)'
                                                                        },
                                                                        ticks: {
                                                                            precision: 0,
                                                                            color: 'rgba(10, 10, 10, 0.5)',
                                                                            font: { size: 9 }
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
                                                        <div className="h-full w-full flex items-center justify-center font-mono text-[10px] text-ink/40">
                                                            [ NO PROGRESS DATA ]
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
            </div>

            <CreateListModal
                open={isCreateListOpen}
                onClose={() => setIsCreateListOpen(false)}
                onCreated={() => setSidebarRefresh((n) => n + 1)}
            />
            <ImportPlaylistModal
                open={isImportPlaylistOpen}
                onClose={() => setIsImportPlaylistOpen(false)}
                onImported={() => setSidebarRefresh((n) => n + 1)}
            />
            <SmartPickModal
                open={isSmartPickOpen}
                onClose={() => setIsSmartPickOpen(false)}
                activeListId={activeListId}
                onWatch={async (card) => {
                    // open in YouTube
                    if (card.url) window.open(card.url, '_blank');
                    // mark as WATCHING
                    await apiRequest(`/cards/${card.videoId}`, {
                        method: 'PATCH',
                        body: { status: 'WATCHING' },
                    });
                    // refresh board
                    setSidebarRefresh((n) => n + 1);
                    setIsSmartPickOpen(false);
                }}
            />
        </div>
    );
}