"use client";

import Link from "next/link";
import { ArrowRight, Flower } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const slides = [
  {
    id: 1,
    image: "/images/hanok-night-hero.jpg",
    headline: <>모두가 부러워하는 당신의 삶,<br />하지만 정작 당신은 행복하십니까?</>,
    subhead: "남들의 시선에 맞춰 완벽해야 했던 지난날들. 화려한 조명이 꺼진 뒤 밀려오는 알 수 없는 공허함까지, 아무에게도 말 못한 당신의 그 깊은 외로움을 청담해화당이 안아드립니다.",
    buttonText: "내 마음의 매듭 풀기",
    link: "/auth/login"
  },
  {
    id: 2,
    image: "/images/intro-wealth.jpg",
    headline: <>그 집 아이가 유독 잘 풀리는 이유,<br />엄마들 사이의 '비밀'은 따로 있습니다.</>,
    subhead: "노력만으로는 닿을 수 없는 운의 영역이 있습니다. 알 만한 청담동 엄마들이 조용히 다녀간 그곳. 우리 아이가 가진 운명의 그릇을 가장 크게 키워줄 '결정적 시기'를 놓치지 마세요.",
    buttonText: "합격운 & 재물운 확인하기",
    link: "/auth/login"
  },
  {
    id: 3,
    image: "/images/intro-relationship.jpg",
    headline: <>다시, 내 인생에도<br />봄바람이 불어올까요?</>,
    subhead: "메마른 가슴에 단비처럼 찾아올 귀한 인연. 당신을 아껴줄 그 사람이 지금 어디쯤 오고 있는지, 해화당이 미리 짚어드립니다.",
    buttonText: "새로운 인연이 있을까?",
    link: "/auth/login"
  }
];

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    // Random start on client mount
    setCurrentSlide(Math.floor(Math.random() * slides.length));
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 8000); // 8 seconds interval
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative min-h-screen w-full flex flex-col bg-ink-950 text-white overflow-x-hidden antialiased font-serif selection:bg-gold-500/30">

      {/* Screen 1: Hanok Night Intro (Carousel) */}
      <main className="relative z-40 w-full min-h-[100dvh] flex flex-col items-center justify-end pb-32 md:pb-48 lg:pb-64 text-center overflow-hidden">

        {/* Background Layer (Transitioning) */}
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={cn(
              "absolute inset-0 w-full h-full z-0 transition-opacity duration-1000 ease-in-out",
              index === currentSlide ? "opacity-100" : "opacity-0"
            )}
          >
            {/* Image */}
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-[20s] hover:scale-105"
              style={{ backgroundImage: `url('${slide.image}')` }}
            />
            {/* Dark Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-ink-900/30 via-ink-950/60 to-ink-950/90" />
          </div>
        ))}

        {/* Content Container */}
        <div className="relative z-10 flex flex-col items-center gap-14 md:gap-24 lg:gap-32 px-6 max-w-4xl pb-safe">

          {/* Header Group */}
          <div className="flex flex-col items-center gap-4 md:gap-6">
            {/* Welcome Label */}
            <span className="font-gungseo text-sm md:text-base lg:text-lg font-bold tracking-[0.5em] text-gold-400 animate-in fade-in duration-1000">
              청담해화당
            </span>

            {/* Decorative Divider */}
            <div className="flex items-center gap-3 md:gap-4 opacity-80 animate-in fade-in duration-1000 delay-100">
              <div className="h-px w-8 md:w-12 bg-gold-400/50" />
              <Flower className="w-4 h-4 md:w-5 md:h-5 text-gold-400" strokeWidth={1} />
              <div className="h-px w-8 md:w-12 bg-gold-400/50" />
            </div>
          </div>

          {/* Dynamic Content (Keyed for Re-animation) */}
          <div key={currentSlide} className="flex flex-col items-center gap-8 md:gap-14 lg:gap-20 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Headline */}
            <h1 className="font-gungseo text-2xl sm:text-3xl md:text-5xl lg:text-7xl font-light leading-relaxed tracking-tight text-white drop-shadow-2xl break-keep">
              {slides[currentSlide].headline}
            </h1>

            {/* Subhead */}
            <p className="font-sans text-white/80 font-light text-xs sm:text-sm md:text-base tracking-wide leading-loose max-w-[85%] md:max-w-2xl break-keep opacity-90 line-clamp-3 md:line-clamp-none">
              {slides[currentSlide].subhead}
            </p>

            {/* CTA Button */}
            <Link href={slides[currentSlide].link} className="pt-4 md:pt-8">
              <button className="group relative px-8 py-3 md:px-12 md:py-5 bg-white/5 backdrop-blur-[2px] rounded-xl border border-white/20 shadow-lg flex items-center gap-3 md:gap-5 transition-all duration-500 hover:bg-cinnabar/80 hover:border-cinnabar hover:shadow-cinnabar/30 hover:scale-[1.02]">
                <span className="font-gungseo font-medium text-sm md:text-lg tracking-widest pt-1 text-white/90 group-hover:text-white transition-colors">
                  {slides[currentSlide].buttonText}
                </span>
                <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                  <ArrowRight className="w-3 h-3 md:w-4 md:h-4 text-white/70 group-hover:text-white transition-colors" />
                </div>
              </button>
            </Link>
          </div>

        </div>

        {/* Pagination Dots */}
        <div className="absolute bottom-12 flex gap-3 z-10">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-300",
                index === currentSlide ? "bg-gold-400 w-6" : "bg-white/20 hover:bg-white/40"
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

      </main>

    </div>
  );
}
