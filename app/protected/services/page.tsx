"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowLeft, CloudRain, Compass, Heart, Sparkles, Home, User, Hand } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";

export default function ServicesPage() {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    });

    const opacity1 = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
    const opacity2 = useTransform(scrollYProgress, [0.2, 0.4, 0.6], [0, 1, 0]);
    const opacity3 = useTransform(scrollYProgress, [0.4, 0.6, 0.8], [0, 1, 0]);
    const opacity4 = useTransform(scrollYProgress, [0.6, 0.8], [0, 1]);

    return (
        <div ref={containerRef} className="min-h-screen bg-background text-ink-light font-sans relative overflow-x-hidden">
            {/* Hanji Overlay */}
            <div className="hanji-overlay" />

            {/* Fixed Header */}
            <header className="fixed top-0 left-0 right-0 z-50 border-b border-primary/10 bg-background/90 backdrop-blur-md">
                <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
                    <Link href="/protected" className="p-2 -ml-2 text-ink-light/60 hover:text-primary transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <h1 className="text-sm font-serif tracking-[0.2em] text-ink-light/90 uppercase">Our Story</h1>
                    <div className="w-10" />
                </div>
            </header>

            {/* Scroll Container */}
            <div className="pt-20">
                {/* Chapter 1: 공감 (The Pain) */}
                <motion.section
                    style={{ opacity: opacity1 }}
                    className="min-h-screen flex items-center justify-center px-6 relative"
                >
                    <div className="max-w-3xl mx-auto text-center space-y-8">
                        <motion.div
                            initial={{ y: 30, opacity: 0 }}
                            whileInView={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.8 }}
                            viewport={{ once: true }}
                        >
                            <CloudRain className="w-16 h-16 text-primary/60 mx-auto mb-8" strokeWidth={1} />
                            <h2 className="text-5xl md:text-6xl font-serif font-bold text-ink-light mb-6 leading-tight">
                                불안한 시대,<br />
                                흔들리는 당신에게
                            </h2>
                            <div className="w-20 h-px bg-primary mx-auto mb-8" />
                            <p className="text-lg md:text-xl text-ink-light/70 leading-relaxed font-light max-w-2xl mx-auto">
                                수많은 데이터와 정보 속에서도,<br />
                                정작 <span className="text-primary font-medium">'나'</span>를 위한 답은 어디에도 없었습니다.<br /><br />
                                막막한 선택의 순간, 보이지 않는 미래 앞에서<br />
                                우리는 여전히 길을 잃습니다.
                            </p>
                        </motion.div>
                    </div>
                </motion.section>

                {/* Chapter 2: 탄생 (The Origin) */}
                <motion.section
                    style={{ opacity: opacity2 }}
                    className="min-h-screen flex items-center justify-center px-6 relative"
                >
                    <div className="max-w-3xl mx-auto text-center space-y-8">
                        <motion.div
                            initial={{ y: 30, opacity: 0 }}
                            whileInView={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.8 }}
                            viewport={{ once: true }}
                        >
                            <div className="w-24 h-24 border-2 border-primary/30 flex items-center justify-center mx-auto mb-8 relative">
                                <span className="text-5xl font-serif text-primary">海</span>
                                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-seal flex items-center justify-center">
                                    <span className="text-xl font-serif text-background">化</span>
                                </div>
                            </div>
                            <h2 className="text-5xl md:text-6xl font-serif font-bold text-ink-light mb-6 leading-tight">
                                해화당(解化堂)
                            </h2>
                            <p className="text-2xl text-primary mb-4 font-light">
                                풀어낼 해(解), 될 화(化), 집 당(堂)
                            </p>
                            <div className="w-20 h-px bg-primary mx-auto mb-8" />
                            <p className="text-lg md:text-xl text-ink-light/70 leading-relaxed font-light max-w-2xl mx-auto">
                                꼬인 매듭을 풀고<span className="text-primary">(解)</span>,<br />
                                새로운 가능성으로 변화<span className="text-primary">(化)</span>시키는 집.<br /><br />
                                고전 성리학의 이치와 현대 데이터 과학을 결합하여,<br />
                                미신이 아닌 <span className="text-primary font-medium">'통계와 자연의 이치'</span>로 접근합니다.
                            </p>
                        </motion.div>
                    </div>
                </motion.section>

                {/* Chapter 3: 천지인(天地人)의 비밀 */}
                <motion.section
                    style={{ opacity: opacity3 }}
                    className="min-h-screen flex items-center justify-center px-6 relative"
                >
                    <div className="max-w-4xl mx-auto space-y-12">
                        <motion.div
                            initial={{ y: 30, opacity: 0 }}
                            whileInView={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.8 }}
                            viewport={{ once: true }}
                            className="text-center mb-16"
                        >
                            <h2 className="text-5xl md:text-6xl font-serif font-bold text-ink-light mb-6 leading-tight">
                                운명을 완성하는<br />
                                세 가지 조각
                            </h2>
                            <div className="w-20 h-px bg-primary mx-auto mb-8" />
                            <p className="text-lg text-ink-light/70 font-light max-w-2xl mx-auto">
                                우리는 반쪽짜리 운세만 보고 있지 않나요?<br />
                                생년월일만으로는 <span className="text-seal font-medium">33%</span>밖에 알 수 없습니다.
                            </p>
                        </motion.div>

                        {/* 천지인 카드 */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* 천 (天) */}
                            <motion.div
                                initial={{ y: 50, opacity: 0 }}
                                whileInView={{ y: 0, opacity: 1 }}
                                transition={{ duration: 0.6, delay: 0.1 }}
                                viewport={{ once: true }}
                                className="bg-surface/30 border border-primary/20 p-8 hover:border-primary/50 transition-all group"
                            >
                                <Sparkles className="w-12 h-12 text-primary mb-6 group-hover:scale-110 transition-transform" strokeWidth={1} />
                                <h3 className="text-2xl font-serif font-bold text-ink-light mb-3">天 하늘</h3>
                                <p className="text-sm text-primary/80 mb-4 font-medium">사주명리</p>
                                <p className="text-sm text-ink-light/60 leading-relaxed font-light">
                                    바꿀 수 없는 선천적 기질과 타이밍. 하늘이 준 설계도.
                                </p>
                            </motion.div>

                            {/* 지 (地) */}
                            <motion.div
                                initial={{ y: 50, opacity: 0 }}
                                whileInView={{ y: 0, opacity: 1 }}
                                transition={{ duration: 0.6, delay: 0.2 }}
                                viewport={{ once: true }}
                                className="bg-surface/30 border border-primary/20 p-8 hover:border-primary/50 transition-all group"
                            >
                                <Compass className="w-12 h-12 text-primary mb-6 group-hover:scale-110 transition-transform" strokeWidth={1} />
                                <h3 className="text-2xl font-serif font-bold text-ink-light mb-3">地 땅</h3>
                                <p className="text-sm text-primary/80 mb-4 font-medium">풍수지리</p>
                                <p className="text-sm text-ink-light/60 leading-relaxed font-light">
                                    나를 감싸는 환경. 공간의 에너지를 바꿔 운을 틔웁니다.
                                </p>
                            </motion.div>

                            {/* 인 (人) */}
                            <motion.div
                                initial={{ y: 50, opacity: 0 }}
                                whileInView={{ y: 0, opacity: 1 }}
                                transition={{ duration: 0.6, delay: 0.3 }}
                                viewport={{ once: true }}
                                className="bg-surface/30 border border-primary/20 p-8 hover:border-primary/50 transition-all group"
                            >
                                <User className="w-12 h-12 text-primary mb-6 group-hover:scale-110 transition-transform" strokeWidth={1} />
                                <h3 className="text-2xl font-serif font-bold text-ink-light mb-3">人 사람</h3>
                                <p className="text-sm text-primary/80 mb-4 font-medium">관상/손금</p>
                                <p className="text-sm text-ink-light/60 leading-relaxed font-light">
                                    나의 의지와 행동. 살아온 삶이 만든 얼굴과 손, 앞으로의 선택.
                                </p>
                            </motion.div>
                        </div>

                        {/* Key Message */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            transition={{ duration: 1, delay: 0.5 }}
                            viewport={{ once: true }}
                            className="text-center pt-12"
                        >
                            <div className="bg-primary/5 border border-primary/20 p-8 max-w-2xl mx-auto">
                                <p className="text-lg text-ink-light font-light leading-relaxed italic">
                                    "하늘이 비를 내려도<span className="text-primary">(天)</span>, <br />
                                    땅이 척박하면 꽃을 피울 수 없고<span className="text-primary">(地)</span>, <br />
                                    농부가 게으르면 열매를 맺을 수 없습니다<span className="text-primary">(人)</span>."
                                </p>
                            </div>
                        </motion.div>
                    </div>
                </motion.section>

                {/* Chapter 4: 약속 (Promise) */}
                <motion.section
                    style={{ opacity: opacity4 }}
                    className="min-h-screen flex items-center justify-center px-6 relative pb-32"
                >
                    <div className="max-w-3xl mx-auto text-center space-y-12">
                        <motion.div
                            initial={{ y: 30, opacity: 0 }}
                            whileInView={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.8 }}
                            viewport={{ once: true }}
                        >
                            <Compass className="w-16 h-16 text-seal/60 mx-auto mb-8" strokeWidth={1} />
                            <h2 className="text-5xl md:text-6xl font-serif font-bold text-ink-light mb-6 leading-tight">
                                당신의 삶을 위한<br />
                                내비게이션
                            </h2>
                            <div className="w-20 h-px bg-primary mx-auto mb-8" />
                            <p className="text-lg md:text-xl text-ink-light/70 leading-relaxed font-light max-w-2xl mx-auto mb-12">
                                해화당은 <span className="text-seal font-medium">'좋다/나쁘다'</span>를 단정 짓지 않습니다.<br /><br />
                                비가 오면 우산을, 바람이 불면 닻을 내리라고 조언합니다.<br /><br />
                                2026년, 해화당과 함께<br />
                                당신만의 스토리를 써 내려가세요.
                            </p>

                            {/* CTA */}
                            <Link href="/protected">
                                <motion.button
                                    className="px-10 py-5 bg-primary hover:bg-primary-dim text-background font-serif font-bold text-lg shadow-[0_0_30px_rgba(236,182,19,0.3)] hover:shadow-[0_0_50px_rgba(236,182,19,0.5)] transition-all"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    대시보드로 돌아가기
                                </motion.button>
                            </Link>
                        </motion.div>

                        {/* Footer Mark */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            transition={{ duration: 1, delay: 0.3 }}
                            viewport={{ once: true }}
                            className="pt-16 border-t border-primary/10"
                        >
                            <div className="flex items-center justify-center gap-4 text-ink-light/40 text-xs uppercase tracking-[0.2em]">
                                <span>Haehwadang</span>
                                <div className="w-1 h-1 bg-primary" />
                                <span>Cheongdam</span>
                                <div className="w-1 h-1 bg-primary" />
                                <span>Est. 2026</span>
                            </div>
                        </motion.div>
                    </div>
                </motion.section>
            </div>
        </div>
    );
}
