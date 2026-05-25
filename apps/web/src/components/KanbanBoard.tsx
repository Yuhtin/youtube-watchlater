import React, { useRef, useEffect, useState } from 'react';
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
import { FixedSizeList as List } from 'react-window';
import { useInView } from 'react-intersection-observer';

export interface CardItem {
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-2 border-ink">
                {Object.entries(columns).map(([columnKey, column], index, arr) => {
                    const isWatching = columnKey === 'WATCHING';
                    const isWatched = columnKey === 'WATCHED';

                    const headerClass = isWatching
                        ? 'border-b-2 border-accent text-accent'
                        : isWatched
                            ? 'border-b-2 border-green-600 text-green-700'
                            : 'border-b-2 border-ink';

                    const totalVideos = column.videos.reduce((total, video) => {
                        if (video.isPlaylist && video._count?.cards) {
                            return total + video._count.cards;
                        }
                        return total + 1;
                    }, 0);

                    const isLast = index === arr.length - 1;

                    return (
                        <div
                            key={column.id}
                            className={`bg-paper flex flex-col h-full ${!isLast ? 'border-r-2 border-ink/20' : ''}`}
                        >
                            <div className={`p-3 ${headerClass}`}>
                                <h2 className="font-bold text-[9px] tracking-wide font-mono uppercase">
                                    [ {column.title} · {totalVideos} ]
                                </h2>
                            </div>

                            <DroppableColumn
                                id={column.id}
                                className="flex-1 min-h-[400px] max-h-[600px] flex flex-col"
                            >
                                <SortableContext
                                    items={column.videos.map((video) => video.videoId)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div className="p-2 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-ink/20 scrollbar-track-transparent">
                                        {column.videos.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-full text-ink/30 py-8 font-mono text-[10px]">
                                                [ EMPTY ]
                                            </div>
                                        ) : (
                                            <VirtualizedVideoList
                                                videos={column.videos.filter(video => hidePlaylistVideos ? !video.playlistId : !!video.playlistId)}
                                                columnId={column.id}
                                                onOpen={onItemOpen}
                                                onRemove={onItemRemove}
                                                disableDragFor={disableDragFor}
                                            />
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
                        <div className="bg-white border-2 border-ink shadow-brutal-red overflow-hidden">
                            <img
                                src={activeItem.thumbnailUrl}
                                alt={activeItem.title}
                                className="w-full h-32 object-cover border-b-2 border-ink"
                            />
                            <div className="p-2">
                                <h3 className="font-bold text-[10px] line-clamp-2">
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

function VirtualizedVideoList(
    {
        videos,
        columnId,
        onOpen,
        onRemove,
        disableDragFor
    }: {
        videos: CardItem[];
        columnId: string;
        onOpen: (status: string, video: CardItem) => void;
        onRemove: (status: string, videoId: string) => void;
        disableDragFor: (itemId: string) => boolean;
    }) {

    const containerRef = useRef<HTMLDivElement>(null);
    const [containerHeight, setContainerHeight] = useState(500);

    useEffect(() => {
        if (containerRef.current) {
            setContainerHeight(containerRef.current.clientHeight);

            const resizeObserver = new ResizeObserver(entries => {
                for (let entry of entries) {
                    setContainerHeight(entry.contentRect.height);
                }
            });

            resizeObserver.observe(containerRef.current);
            return () => {
                if (containerRef.current) {
                    resizeObserver.unobserve(containerRef.current);
                }
            };
        }
    }, []);

    return (
        <div ref={containerRef} className="h-full">
            <List
                height={containerHeight}
                itemCount={videos.length}
                itemSize={230}
                width="100%"
                overscanCount={5}
            >
                {({ index, style }) => {
                    const video = videos[index];
                    return (
                        <div style={{ ...style, paddingBottom: '6px' }}>
                            <LazyVideoItem
                                key={video.videoId}
                                id={video.videoId}
                                video={video}
                                status={columnId}
                                onOpen={() => onOpen(columnId, video)}
                                onRemove={() => onRemove(columnId, video.videoId)}
                                disabled={disableDragFor(video.videoId)}
                                isPlaylist={video.isPlaylist ?? false}
                            />
                        </div>
                    );
                }}
            </List>
        </div>
    );
}

function LazyVideoItem(
    {
        id,
        video,
        status,
        onOpen,
        onRemove,
        disabled,
        isPlaylist
    }: {
        id: string,
        video: CardItem,
        status: string,
        onOpen: () => void,
        onRemove: () => void,
        disabled: boolean,
        isPlaylist: boolean
    }) {
    const { ref, inView } = useInView({
        threshold: 0,
        triggerOnce: false,
        rootMargin: '200px 0px',
    });

    return (
        <div ref={ref}>
            {inView ? (
                <SortableItem
                    id={id}
                    video={video}
                    status={status}
                    onOpen={onOpen}
                    onRemove={onRemove}
                    disabled={disabled}
                    isPlaylist={isPlaylist}
                />
            ) : (
                <div
                    className="bg-white border-1.5 border-ink"
                    style={{ height: '50px' }}
                >
                    <div className="animate-pulse flex">
                        <div className="h-12 w-20 bg-ink/5"></div>
                        <div className="flex-1 p-2 space-y-1.5">
                            <div className="h-2 bg-ink/5 w-3/4"></div>
                            <div className="h-2 bg-ink/5 w-1/2"></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
