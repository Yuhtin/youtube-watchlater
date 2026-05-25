import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number | null | undefined): string {
    if (!seconds) return '--:--';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
}

export function getRandomColor(username: string): string {
    const colors = [
        "from-indigo-400 to-purple-600",
        "from-blue-400 to-cyan-600",
        "from-emerald-400 to-teal-600",
        "from-amber-400 to-orange-600",
        "from-pink-400 to-rose-600",
        "from-violet-400 to-purple-600",
    ];

    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        hash += username.charCodeAt(i);
    }

    return colors[hash % colors.length];
};