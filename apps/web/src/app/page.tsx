import Link from 'next/link';

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-paper text-ink font-mono">
            {/* nav */}
            <nav className="border-b-2 border-ink px-6 py-3 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <span className="font-bold text-[14px]">[WATCHLATER]</span>
                    <span className="text-[9px] text-neutral-500">v0.2 · open source</span>
                </div>
                <div className="flex items-center gap-4 text-[11px] font-bold">
                    <a href="#features">Features</a>
                    <a href="#about">About</a>
                    <Link
                        href="/collections"
                        className="bg-ink text-paper px-3 py-1.5 border-2 border-ink shadow-brutal-red"
                    >
                        Sign in →
                    </Link>
                </div>
            </nav>

            {/* hero */}
            <section className="max-w-3xl mx-auto px-6 py-20 text-center">
                <div className="text-[10px] font-bold tracking-[2px] mb-4">// THE PROBLEM</div>
                <h1 className="font-display font-black text-[64px] md:text-[88px] leading-[0.95] tracking-tighter lowercase mb-6">
                    finish what<br />you saved.
                </h1>
                <p className="text-[13px] text-neutral-600 max-w-md mx-auto mb-8 leading-relaxed">
                    800 videos in your YouTube watch later. you'll never finish them.
                    this is a kanban that helps.
                </p>
                <div className="flex gap-2 justify-center">
                    <Link
                        href="/collections"
                        className="bg-ink text-paper px-6 py-3 border-2 border-ink shadow-brutal-red font-bold text-[12px]"
                    >
                        ▶ OPEN_BOARD()
                    </Link>
                    <Link
                        href="/collections"
                        className="border-2 border-ink px-5 py-3 font-bold text-[12px]"
                    >
                        LIVE_DEMO()
                    </Link>
                </div>
            </section>

            {/* features */}
            <section id="features" className="border-t-2 border-ink bg-white">
                <div className="max-w-5xl mx-auto px-6 py-16 grid md:grid-cols-3 gap-px bg-ink">
                    {([
                        ['KANBAN', 'drag across watch_later → watching → watched.'],
                        ['LISTS', 'group by topic. each list has its own board.'],
                        ['SMART_PICK()', 'algorithm picks what fits your time slot.'],
                    ] as const).map(([title, desc]) => (
                        <div key={title} className="bg-white p-6">
                            <div className="text-[10px] font-bold tracking-wider mb-3">[{title}]</div>
                            <p className="text-[12px] text-neutral-700 leading-relaxed">{desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* screenshot */}
            <section className="border-t-2 border-ink">
                <div className="max-w-5xl mx-auto px-6 py-16">
                    <div className="bg-white border-1.5 border-ink p-4 aspect-video flex items-center justify-center text-[11px] text-neutral-500">
                        [ board screenshot — coming soon ]
                    </div>
                </div>
            </section>

            {/* footer */}
            <footer id="about" className="border-t-2 border-ink bg-white">
                <div className="max-w-5xl mx-auto px-6 py-8 flex justify-between text-[10px]">
                    <div>
                        made by <strong>Davi Duarte</strong> · <a href="https://github.com/Yuhtin" className="underline">@Yuhtin</a>
                    </div>
                    <div className="flex gap-4">
                        <a href="https://github.com/Yuhtin/youtube-watchlater" className="underline">github</a>
                        <a href="https://linkedin.com/in/daviduarte" className="underline">linkedin</a>
                        <span>MIT licensed</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
