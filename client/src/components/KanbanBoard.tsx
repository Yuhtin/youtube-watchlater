import React from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
} from "@dnd-kit/core";
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableItem } from "./SortableItem";
import { DroppableColumn } from "./DroppableColumn";
import { toast } from "sonner";

export interface CardItem {
    id: string;
    title: string;
    thumbnailUrl: string;
    url: string;
    addedAt: number;
    status: string;
    updatedAt?: number;
    playlistId?: string;
    isPlaylist?: boolean;
    durationSeconds?: number;
    _count?: {
        cards?: number
    };
}

export interface Column {
    id: string;
    title: string;
    videos: CardItem[];
}

interface KanbanBoardProps {
    columns: { [key: string]: Column };
    columnIcons: { [key: string]: string };
    onDragStart: (event: any) => void;
    onDragEnd: (event: any) => void;
    onDragCancel: () => void;
    onItemOpen: (status: string, item: CardItem) => void;
    onItemRemove: (status: string, itemId: string) => void;
    activeId: string | null;
    activeItem: CardItem | null;
    hidePlaylistVideos: boolean;
    disableDragFor?: (itemId: string) => boolean;
    showEmptyColumns?: boolean;
    emptyStateMessage?: string;
    emptyStateSubMessage?: string;
}

export function KanbanBoard({
    columns,
    columnIcons,
    onDragStart,
    onDragEnd,
    onDragCancel,
    onItemOpen,
    onItemRemove,
    activeId,
    activeItem,
    hidePlaylistVideos = true,
    disableDragFor = () => false,
    showEmptyColumns = true,
    emptyStateMessage = "No videos yet",
    emptyStateSubMessage = "Drag videos here or add new ones"
}: KanbanBoardProps) {
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            }
        }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragCancel={onDragCancel}
        >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Object.entries(columns).map(([columnKey, column]) => {
                    const colorClasses = columnKey === 'WATCH_LATER'
                        ? 'bg-blue-500/10 border-blue-300/30'
                        : columnKey === 'WATCHING'
                            ? 'bg-amber-500/10 border-amber-300/30'
                            : 'bg-green-500/10 border-green-300/30';

                    const icon = columnIcons[columnKey as keyof typeof columnIcons];

                    return (
                        <div
                            key={column.id}
                            className={`backdrop-blur-xl backdrop-saturate-150 border ${colorClasses} rounded-xl shadow-xl overflow-hidden flex flex-col h-full`}
                        >
                            <div className="p-5 border-b border-white/10 backdrop-blur-sm bg-black/10">
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
                                className="flex-1 min-h-[400px] max-h-[600px] flex flex-col"
                            >
                                <SortableContext
                                    items={column.videos.map((video) => video.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div className="p-4 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                        {column.videos.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-full text-white/50 py-8">
                                                <div className="text-5xl mb-3">🎬</div>
                                                <p>{emptyStateMessage}</p>
                                                <p className="text-sm">{emptyStateSubMessage}</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {column.videos.filter(video => hidePlaylistVideos ? !video.playlistId : !!video.playlistId).map((video) => (
                                                    <SortableItem
                                                        key={video.id}
                                                        id={video.id}
                                                        video={video}
                                                        status={column.id}
                                                        onOpen={() => onItemOpen(column.id, video)}
                                                        onRemove={() => onItemRemove(column.id, video.id)}
                                                        disabled={disableDragFor(video.id)}
                                                        isPlaylist={video.isPlaylist}
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

            <DragOverlay adjustScale={false} zIndex={9999}>
                {activeId && activeItem ? (
                    <div className="w-full" style={{ maxWidth: "300px" }}>
                        <div className="bg-white/15 backdrop-blur-xl border border-white/30 rounded-lg overflow-hidden shadow-xl">
                            <div className="relative">
                                <img
                                    src={activeItem.thumbnailUrl}
                                    alt={activeItem.title}
                                    className="w-full h-32 object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                            </div>
                            <div className="p-3">
                                <h3 className="font-medium text-white text-sm line-clamp-2">
                                    {activeItem.title}
                                </h3>
                            </div>
                        </div>
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}