import Link from "next/link";

export default function AnalysisResultPage() {
    // Static Placeholder Data for Presentation
    const saju = {
        year: { gan: "갑", ji: "진", element: "Wood", color: "bg-green-700" },
        month: { gan: "병", ji: "인", element: "Fire", color: "bg-red-600" },
        day: { gan: "무", ji: "자", element: "Earth", color: "bg-yellow-600" },
        time: { gan: "경", ji: "신", element: "Metal", color: "bg-gray-400" },
    };

    const fiveElements = [
        { label: "Wood", level: 30, color: "text-green-500", icon: "木" },
        { label: "Fire", level: 45, color: "text-red-500", icon: "火" },
        { label: "Earth", level: 10, color: "text-yellow-600", icon: "土" },
        { label: "Metal", level: 15, color: "text-gray-400", icon: "金" },
        { label: "Water", level: 0, color: "text-blue-500", icon: "水" },
    ];

    return (
        <div className="min-h-screen w-full bg-[#1c1c1e] text-hanji font-serif flex flex-col relative overflow-hidden">

            {/* Background: Dark Dyed Hanji + Gold Dust */}
            <div className="absolute inset-0 bg-[#1c1c1e]">
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] mix-blend-overlay" />
                <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/rice-paper-3.png')]" />
            </div>

            {/* Header */}
            <header className="relative z-10 p-6 flex items-center justify-between border-b border-white/5">
                <Link href="/protected/saju/new" className="text-white/40 hover:text-gold-500 transition-colors">
                    ← Re-analyze
                </Link>
                <span className="font-gungseo text-gold-500 tracking-[0.3em]">
                    運命
                </span>
                <div className="w-6" />
            </header>

            {/* Main Content */}
            <main className="relative z-10 px-6 py-8 flex flex-col gap-12">

                {/* Section 1: The Four Pillars (Calligraphy) */}
                <section className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-1000">
                    <h2 className="text-center text-xs font-sans tracking-[0.4em] text-white/30 uppercase">The Four Pillars</h2>

                    <div className="flex justify-center gap-4 lg:gap-8">
                        {['시 (Time)', '일 (Day)', '월 (Month)', '년 (Year)'].map((col, idx) => {
                            const pillar = [saju.time, saju.day, saju.month, saju.year][idx];
                            return (
                                <div key={idx} className="flex flex-col gap-4 items-center group">
                                    <span className="text-[10px] text-white/20 tracking-widest uppercase font-sans mb-2 vertical-rl">{col}</span>
                                    <div className="w-16 h-32 lg:w-20 lg:h-40 border border-white/10 bg-white/5 backdrop-blur-sm rounded-sm flex flex-col items-center justify-center gap-4 relative overflow-hidden transition-all duration-500 group-hover:border-gold-500/30">
                                        <span className={`font-gungseo text-2xl lg:text-3xl font-bold ${pillar.element === 'Fire' ? 'text-red-400' : pillar.element === 'Wood' ? 'text-green-400' : pillar.element === 'Earth' ? 'text-yellow-400' : pillar.element === 'Metal' ? 'text-gray-300' : 'text-blue-400'}`}>
                                            {pillar.gan}
                                        </span>
                                        <span className="w-8 h-px bg-white/10" />
                                        <span className="font-gungseo text-2xl lg:text-3xl font-bold text-white/90">
                                            {pillar.ji}
                                        </span>
                                        {/* Element Aura */}
                                        <div className={`absolute top-0 right-0 w-12 h-12 blur-[30px] opacity-20 ${pillar.color}`} />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </section>

                {/* Section 2: Five Elements Analysis (Dancheong Colors) */}
                <section className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-1000 delay-200">
                    <div className="flex items-center gap-4 justify-center">
                        <div className="h-px w-12 bg-gold-500/30" />
                        <h2 className="text-center text-xs font-sans tracking-[0.4em] text-gold-500 uppercase">Five Elements Balance</h2>
                        <div className="h-px w-12 bg-gold-500/30" />
                    </div>

                    <div className="grid grid-cols-5 gap-2 lg:gap-4 px-2">
                        {fiveElements.map((el, i) => (
                            <div key={i} className="flex flex-col items-center gap-3">
                                <div className={`w-10 h-10 rounded-full border border-white/10 flex items-center justify-center font-serif text-lg ${el.color} bg-white/5`}>
                                    {el.icon}
                                </div>
                                <div className="w-full h-32 bg-white/5 rounded-full relative overflow-hidden">
                                    <div className={`absolute bottom-0 left-0 w-full transition-all duration-[2s] ease-out opacity-60 ${el.label === 'Wood' ? 'bg-green-600' : el.label === 'Fire' ? 'bg-red-600' : el.label === 'Earth' ? 'bg-yellow-600' : el.label === 'Metal' ? 'bg-gray-400' : 'bg-blue-600'}`} style={{ height: `${el.level}%` }} />
                                </div>
                                <span className="text-[10px] uppercase tracking-widest text-white/30 font-sans">{el.label}</span>
                            </div>
                        ))}
                    </div>

                    <div className="text-center">
                        <p className="font-gungseo text-xl text-white/80 leading-relaxed">
                            <span className="text-red-400">화(火)</span>의 기운이 강하고<br />
                            <span className="text-blue-400">수(水)</span>가 부족하여<br />
                            열정을 다스릴 지혜가 필요합니다.
                        </p>
                    </div>
                </section>

                {/* Call to Action: Full Report */}
                <div className="pt-12 text-center pb-24">
                    <button className="px-8 py-3 bg-gold-600/20 border border-gold-500/50 hover:bg-gold-600/30 transition-all rounded-sm">
                        <span className="font-sans text-xs tracking-[0.2em] text-gold-400 uppercase">View Full Interpretation</span>
                    </button>
                </div>

            </main>

        </div>
    );
}
