'use client'

import { Flame } from 'lucide-react'

export default function NewYearLoading() {
  return (
    <div className="min-h-screen bg-charcoal-deep text-ink-light flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-noise-pattern opacity-10 pointer-events-none" />

      {/* Central Oracle */}
      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Rotating Rings (CSS Animation) */}
        <div className="relative w-64 h-64 flex items-center justify-center">
          <div className="absolute inset-0 border border-dashed border-red-500/20 rounded-full animate-spin-slow opacity-50" style={{ animationDuration: '15s' }} />
          <div className="absolute inset-4 border border-dotted border-primary/30 rounded-full animate-spin-reverse-slow opacity-50" style={{ animationDuration: '12s' }} />
          <div className="absolute inset-0 bg-red-900/5 blur-3xl rounded-full" />

          {/* Center Icon */}
          <div className="relative z-20 w-24 h-24 bg-gradient-to-b from-red-900/40 to-black rounded-full flex items-center justify-center border border-red-500/30 shadow-[0_0_40px_rgba(220,38,38,0.25)]">
            <Flame className="w-10 h-10 text-red-500 animate-pulse" />
          </div>
        </div>

        {/* Text */}
        <div className="space-y-3 text-center">
          <h3 className="font-serif text-xl text-ink-light font-medium tracking-wide animate-pulse">
            천기의 흐름을 읽고 있습니다
          </h3>
          <p className="text-sm text-ink-light/50 font-light">
            2026년 병오년의 기운을 불러오는 중...
          </p>
        </div>
      </div>

      <style jsx global>{`
         @keyframes spin-slow {
           from { transform: rotate(0deg); }
           to { transform: rotate(360deg); }
         }
         @keyframes spin-reverse-slow {
           from { transform: rotate(360deg); }
           to { transform: rotate(0deg); }
         }
         .animate-spin-slow {
           animation: spin-slow linear infinite;
         }
         .animate-spin-reverse-slow {
           animation: spin-reverse-slow linear infinite;
         }
       `}</style>
    </div>
  )
}
