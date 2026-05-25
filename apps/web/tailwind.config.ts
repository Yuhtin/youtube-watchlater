import type { Config } from 'tailwindcss';

const config: Config = {
    content: ['./src/**/*.{ts,tsx}'],
    theme: {
        extend: {
            colors: {
                paper: '#f5f1e8',
                ink: '#0a0a0a',
                accent: '#dc2626',
            },
            fontFamily: {
                display: ['var(--font-display)', 'Inter', 'sans-serif'],
                mono: ['var(--font-mono)', 'JetBrains Mono', 'monospace'],
            },
            boxShadow: {
                brutal: '3px 3px 0 #0a0a0a',
                'brutal-red': '3px 3px 0 #dc2626',
            },
            borderWidth: {
                '1.5': '1.5px',
            },
        },
    },
};
export default config;