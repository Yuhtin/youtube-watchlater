import React from "react";
import { useDroppable } from "@dnd-kit/core";

export function DroppableColumn({ id, children, className = "" }: { id: string; children: React.ReactNode; className?: string }) {
    const { setNodeRef, isOver } = useDroppable({
        id,
        data: {
            type: "column",
            id,
        }
    });

    const isOverClass = isOver ? "bg-ink/5" : "";

    return (
        <div
            ref={setNodeRef}
            className={`${className} ${isOverClass} transition-colors duration-200 h-full`}
            data-column-id={id}
        >
            {children}
        </div>
    );
}
