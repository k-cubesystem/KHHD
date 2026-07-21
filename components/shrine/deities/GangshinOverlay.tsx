'use client'

import { X } from 'lucide-react'
import type { Deity } from '@/app/actions/shrine/deities'
import { DeityMedallion } from './DeityMedallion'
import { AmbientVideo } from '@/components/shared/AmbientVideo'

interface GangshinOverlayProps {
  deity: Deity
  /** 강신(降神)=실제 좌정 시점, 봉안(奉安)=구매 완료(좌정 CTA 제공) */
  mode: 'gangshin' | 'bongan'
  /** 강신 모드 하단 인용구 대체 (예: 가족 사주 기반 카피) */
  flavorText?: string
  pending?: boolean
  onClose: () => void
  /** 봉안 모드 「지금 좌정하기」 CTA */
  onSeatNow?: (deity: Deity) => void
  /** 배경 앰비언트 영상 id(public/videos/{id}). 없으면 기존 CSS 연출만(폴백). */
  backgroundVideoId?: string
}

/** 강신(降神)/봉안(奉安) 연출 오버레이 — 신위전·가족 신당 첫 진입 공용. */
export function GangshinOverlay({
  deity,
  mode,
  flavorText,
  pending,
  onClose,
  onSeatNow,
  backgroundVideoId,
}: GangshinOverlayProps) {
  return (
    <div
      className="gangshin-overlay fixed inset-0 z-50 flex flex-col items-center justify-center px-6 cursor-pointer overflow-hidden"
      style={{ background: 'radial-gradient(circle at 50% 44%, #1a140a, #000 70%)' }}
      onClick={onClose}
    >
      {/* 강신 배경 영상(있을 때만) — 기존 CSS 연출 위에 은은히. 없으면 렌더 안 함(폴백) */}
      {backgroundVideoId ? (
        <AmbientVideo
          id={backgroundVideoId}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{ opacity: 0.5, mixBlendMode: 'screen' }}
        />
      ) : null}
      {/* 스킵 — 시퀀스 시작부터 즉시 노출 */}
      <button
        aria-label="연출 건너뛰기"
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        className="absolute top-5 right-5 z-10 flex items-center gap-1 px-3 py-1.5 rounded-full border border-ink-light/15 text-[11px] text-ink-light/50 hover:text-ink-light/80 transition"
      >
        건너뛰기 <X className="w-3.5 h-3.5" />
      </button>

      {/* 아우라 링 (확산 파티클) */}
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="gangshin-ring absolute rounded-full"
          style={{
            borderColor: deity.aura.accent ?? '#c9a84c',
            animationDelay: `${0.4 + i * 0.55}s`,
          }}
        />
      ))}
      {/* 강림 발광 */}
      <div className="gangshin-glow absolute rounded-full" style={{ background: deity.aura.accent ?? '#c9a84c' }} />

      <div className="gangshin-deity relative deity-breathe">
        <DeityMedallion deity={deity} size={188} />
      </div>
      <p className="gangshin-t1 mt-6 text-[11px] tracking-[0.55em] text-gold-500/70 font-serif">
        {mode === 'gangshin' ? '降 神' : '奉 安'}
      </p>
      <h2 className="gangshin-t2 mt-1 text-2xl font-serif font-bold text-ink-light">
        {deity.name}
        {deity.nameHanja ? <span className="text-ink-light/40 text-base ml-1">{deity.nameHanja}</span> : null}
      </h2>
      <p className="gangshin-t3 text-sm text-ink-light/60 mt-1 font-serif">
        {mode === 'gangshin'
          ? `「${deity.domains.join(' · ')}」의 신위가 좌정하였습니다`
          : `「${deity.domains.join(' · ')}」의 신위를 봉안하였습니다`}
      </p>
      {mode === 'gangshin' ? (
        <p className="gangshin-t4 mt-4 text-[13px] text-gold-200/85 font-serif italic max-w-xs text-center leading-relaxed">
          {flavorText ?? `“${deity.domains[0]}, 이제 내가 그대와 함께하리라.”`}
        </p>
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onSeatNow?.(deity)
          }}
          disabled={pending}
          className="gangshin-t4 mt-5 px-6 py-2.5 rounded-full bg-seal text-white font-serif text-sm shadow-lg shadow-seal/20 disabled:opacity-60 transition active:scale-95"
        >
          지금 主神으로 좌정하기
        </button>
      )}
      <button className="gangshin-t4 mt-6 text-xs text-ink-light/45 underline underline-offset-4">닫기</button>

      <style>{`
        @keyframes deity-breathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.016); } }
        .deity-breathe { animation: deity-breathe 4s ease-in-out infinite; }
        /* 강신 의식 시퀀스 */
        .gangshin-overlay { animation: gangshin-fade 0.5s ease-out; }
        @keyframes gangshin-fade { from { opacity: 0; } to { opacity: 1; } }
        .gangshin-ring {
          width: 60px; height: 60px; top: 44%; border-width: 1.5px; border-style: solid; opacity: 0;
          transform: translateY(-50%); animation: gangshin-ring 2.4s ease-out infinite;
        }
        @keyframes gangshin-ring {
          0% { width: 40px; height: 40px; opacity: 0.7; }
          100% { width: 460px; height: 460px; opacity: 0; }
        }
        .gangshin-glow {
          width: 260px; height: 260px; top: 44%; transform: translateY(-50%);
          filter: blur(60px); opacity: 0; animation: gangshin-glow 3s ease-out forwards;
        }
        @keyframes gangshin-glow { 0% { opacity: 0; } 30% { opacity: 0.4; } 100% { opacity: 0.18; } }
        .gangshin-deity { opacity: 0; animation: gangshin-descend 1.6s cubic-bezier(0.16,1,0.3,1) 0.6s forwards; }
        @keyframes gangshin-descend {
          0% { opacity: 0; transform: translateY(-40px) scale(0.82); filter: brightness(3) blur(6px); }
          60% { opacity: 1; filter: brightness(1.4) blur(0); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: brightness(1); }
        }
        .gangshin-t1 { opacity: 0; animation: gangshin-rise 0.7s ease-out 1.9s forwards; }
        .gangshin-t2 { opacity: 0; animation: gangshin-rise 0.7s ease-out 2.3s forwards; }
        .gangshin-t3 { opacity: 0; animation: gangshin-rise 0.7s ease-out 2.8s forwards; }
        .gangshin-t4 { opacity: 0; animation: gangshin-rise 0.9s ease-out 3.5s forwards; }
        @keyframes gangshin-rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) {
          .deity-breathe, .gangshin-overlay, .gangshin-ring, .gangshin-glow, .gangshin-deity,
          .gangshin-t1, .gangshin-t2, .gangshin-t3, .gangshin-t4 { animation: none !important; opacity: 1 !important; }
        }
      `}</style>
    </div>
  )
}
