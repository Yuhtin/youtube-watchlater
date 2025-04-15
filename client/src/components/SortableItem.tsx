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
  isPlaylist?: boolean;
}

export function SortableItem({ id, video, status, onOpen, onRemove, isPlaylist }: SortableItemProps) {
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
      className={`mb-4 rounded-lg overflow-hidden shadow-md cursor-pointer backdrop-blur-md ${
        isPlaylist 
          ? "bg-purple-500/20 border-2 border-purple-500/40" 
          : "bg-white/10 border border-white/20"
      } hover:bg-white/15 transition-all duration-300`}
      {...attributes}
      {...listeners}
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