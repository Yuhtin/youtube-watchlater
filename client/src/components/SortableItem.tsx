import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { time } from 'console';
import { Trash2, ExternalLink } from 'lucide-react';

interface Video {
  id: string;
  title: string;
  thumbnailUrl: string;
  url: string;
  addedAt: number;
  status: string;
  updatedAt?: number;
}

interface SortableItemProps {
  id: string;
  video: Video;
  status: string;
  onOpen: () => void;
  onRemove: () => void;
}

export function SortableItem({ id, video, status, onOpen, onRemove }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
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

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-all cursor-move group"
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

        <div className="absolute bottom-2 right-2 bg-black/40 backdrop-blur-sm text-xs text-white px-2 py-1 rounded">
          {formatDate(video.addedAt)}
        </div>

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
        <h3 className="font-medium text-white text-sm line-clamp-2 mb-2">{video.title}</h3>

        <div className="flex justify-end mt-1 space-x-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
            className="text-white/60 hover:text-white p-1 rounded transition-colors"
            title="Open video"
          >
            <ExternalLink size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Card({ card, onDelete }) {
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="mb-3 bg-white/10 backdrop-blur-sm border border-white/10 rounded-lg overflow-hidden">
      <div className="relative">
        <img
          src={card.thumbnailUrl}
          alt={card.title}
          className="w-full h-32 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
        
        {/* Duration Badge */}
        {card.durationSeconds && (
          <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
            {formatDuration(card.durationSeconds)}
          </div>
        )}
        
        {/* Added Date Badge */}
        <div className="absolute top-1 left-1 bg-black/70 text-white/70 text-xs px-1.5 py-0.5 rounded">
          {new Date(card.addedAt).toLocaleDateString()}
        </div>
      </div>
      <div className="p-3">
        <div className="flex justify-between">
          <h3 className="font-medium text-white text-sm line-clamp-2 flex-1">
            {card.title}
          </h3>
          <div className="ml-2 flex flex-shrink-0">
            <a
              href={card.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-4 w-4" />
            </a>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="text-white/70 hover:text-red-400 p-1 rounded-full hover:bg-white/10 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        {card.playlistId && (
          <div className="mt-1.5 flex items-center">
            <span className="text-xs text-white/50 bg-white/10 px-1.5 py-0.5 rounded-full flex items-center">
              <PlaylistIcon className="w-3 h-3 mr-1" />
              Playlist
            </span>
          </div>
        )}
      </div>
    </div>
  );
}