import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Trash2, ExternalLink, Clock, ListVideo } from "lucide-react";

interface Video {
  id: string;
  title: string;
  thumbnailUrl: string;
  url: string;
  status?: string;
  isPlaylist?: boolean;
  addedAt?: number;
  durationSeconds?: number;
  _count?: {
    cards?: number;
  };
}

interface SortableItemProps {
  id: string;
  video: Video;
  status: string;
  onOpen: () => void;
  onRemove: () => void;
  isPlaylist?: boolean;
  disabled?: boolean;
}

const formatDuration = (seconds: number | undefined): string => {
  if (!seconds) return '';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

export function SortableItem({ id, video, status, onOpen, onRemove, isPlaylist, disabled = false }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    disabled,
    data: {
      type: 'video',
      video,
      status,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms ease',
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 9999 : 1,
    position: isDragging ? 'relative' : 'static' as any,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`mb-4 rounded-lg overflow-hidden shadow-md cursor-pointer backdrop-blur-md group ${isPlaylist
          ? "bg-purple-500/20 border-2 border-purple-500/40"
          : "bg-white/10 border border-white/20"
        } hover:bg-white/15 transition-all duration-300`}
      {...(disabled ? {} : attributes)}
      {...(disabled ? {} : listeners)}
    >
      <div className="relative">
        <div className="relative">
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="w-full h-32 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>

          <div
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
          >
            <div className="w-12 h-12 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center cursor-pointer hover:bg-white/40 transition-all">
              <div className="w-0 h-0 border-t-8 border-t-transparent border-l-12 border-l-white border-b-8 border-b-transparent ml-1"></div>
            </div>
          </div>
        </div>

        {isPlaylist && (
          <div className="absolute top-2 left-2 bg-purple-500/90 text-white rounded-md px-1.5 py-0.5 text-xs font-medium flex items-center">
            <ListVideo className="w-3 h-3 mr-1" />
            Playlist • {video._count?.cards || 0} videos
          </div>
        )}

        {video.durationSeconds && video.durationSeconds > 0 && (
          <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-xs text-white px-2 py-1 rounded flex items-center">
            <Clock size={10} className="mr-1" />
            {formatDuration(video.durationSeconds)}
          </div>
        )}

        {video.addedAt && (
          <div className="absolute bottom-2 right-2 bg-black/40 backdrop-blur-sm text-xs text-white/80 px-2 py-1 rounded">
            {formatDate(video.addedAt)}
          </div>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute top-2 right-2 bg-black/40 backdrop-blur-sm p-1.5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-500/70 transition-all"
        >
          <Trash2 size={14} className="text-white" />
        </button>
      </div>

      <div className="p-3">
        <div className="flex justify-between">
          <h3 className="font-medium text-white text-sm line-clamp-2 flex-1" onClick={onOpen}>
            {video.title}
          </h3>
          <div className="ml-2 flex-shrink-0">
            <a
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>

      {disabled && isPlaylist && (
        <div className="absolute top-0 left-0 w-full h-full bg-black/10 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" onClick={onOpen}>
          <div className="bg-black/50 px-2 py-1 rounded text-xs text-white">
            Open to manage videos
          </div>
        </div>
      )}
    </div>
  );
}