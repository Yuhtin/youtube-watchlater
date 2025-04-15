import React from 'react';
import { useDroppable } from '@dnd-kit/core';

interface DroppableColumnProps {
    id: string;
    children: React.ReactNode;
    className?: string;
}

export function DroppableColumn({ id, children, className }: DroppableColumnProps) {
    const { isOver, setNodeRef } = useDroppable({
        id,
        data: {
            type: 'column',
            id: id
        }
    });

    return (
        <div
            ref={setNodeRef}
            className={`${className} ${isOver ? 'bg-white/5' : ''} transition-colors`}
            data-column-id={id}
        >
            {children}
        </div>
    );
}