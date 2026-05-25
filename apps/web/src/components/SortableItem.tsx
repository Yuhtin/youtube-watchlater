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

  const isWatching = status === 'WATCHING';
  const isWatched = status === 'WATCHED';

  const cardBorder = isWatching ? 'border-accent' : 'border-ink';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`mb-1.5 bg-white border-1.5 ${cardBorder} p-2 cursor-pointer group ${isWatched ? 'opacity-55' : ''} ${isPlaylist ? 'border-dashed' : ''}`}
      {...(disabled ? {} : attributes)}
      {...(disabled ? {} : listeners)}
    >
      <div className="relative">
        <div className="relative">
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className={`w-full h-32 object-cover border-1.5 ${cardBorder}`}
          />

          <div
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-ink/30"
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
          >
            <div className="w-10 h-10 bg-paper border-2 border-ink flex items-center justify-center cursor-pointer">
              <div className="w-0 h-0 border-t-6 border-t-transparent border-l-10 border-l-ink border-b-6 border-b-transparent ml-1"></div>
            </div>
          </div>
        </div>

        {isPlaylist && (
          <div className="absolute top-1 left-1 bg-ink text-paper px-1.5 py-0.5 text-[9px] font-bold font-mono flex items-center">
            <ListVideo className="w-3 h-3 mr-1" />
            PLAYLIST · {video._count?.cards || 0}
          </div>
        )}

        {video.durationSeconds && video.durationSeconds > 0 && (
          <div className="absolute bottom-1 left-1 bg-ink text-paper text-[9px] font-mono px-1.5 py-0.5 flex items-center">
            <Clock size={8} className="mr-1" />
            {formatDuration(video.durationSeconds)}
          </div>
        )}

        {video.addedAt && (
          <div className="absolute bottom-1 right-1 bg-ink text-paper text-[9px] font-mono px-1.5 py-0.5">
            {formatDate(video.addedAt)}
          </div>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute top-1 right-1 bg-accent p-1 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 size={12} className="text-paper" />
        </button>
      </div>

      <div className="pt-1.5">
        <div className="flex justify-between">
          <h3
            className={`text-[10px] font-bold line-clamp-2 flex-1 ${isWatched ? 'line-through' : ''}`}
            onClick={onOpen}
          >
            {video.title}
          </h3>
          <div className="ml-1 flex-shrink-0">
            <a
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink/60 hover:text-accent p-0.5 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>

      {disabled && isPlaylist && (
        <div className="absolute top-0 left-0 w-full h-full bg-ink/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" onClick={onOpen}>
          <div className="bg-ink px-2 py-1 text-[9px] font-mono text-paper">
            OPEN TO MANAGE
          </div>
        </div>
      )}
    </div>
  );
}
