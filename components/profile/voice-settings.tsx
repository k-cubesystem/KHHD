'use client'

import { useCallback, useEffect, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { useTts } from '@/hooks/useTts'
import { cn } from '@/lib/utils'

/**
 * 신위 음성 설정 — 속풀이에서 신위의 답을 소리로 읽어줄지(CEO 지시 2026-08-24: 설정으로 옮길 것).
 *
 * 🔴 저장소가 localStorage(`hhd_tts_auto`)인 것은 의도다 — 기기마다 다른 설정이기 때문이다
 *    (사무실 PC에선 끄고 집 폰에선 켜는 것이 자연스럽다). 계정 단위로 묶으려면 DB 스키마가 필요한데
 *    그러면 «이어폰 낀 기기»와 «스피커 켠 기기»가 같은 값을 쓰게 된다. 지금은 기기별이 맞다.
 * ⚠️ 채팅 더보기 시트의 토글과 «같은 키»를 본다 — 한쪽에서 바꾸면 다른 쪽도 따라간다.
 *    (키를 바꾸려면 components/ai/shaman-chat-interface.tsx 도 함께 고칠 것)
 */
const TTS_AUTO_KEY = 'hhd_tts_auto'

export function VoiceSettings() {
  const { supported, speak, stop } = useTts()
  const [autoSpeak, setAutoSpeak] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') setAutoSpeak(window.localStorage.getItem(TTS_AUTO_KEY) === '1')
  }, [])

  const toggle = useCallback(() => {
    setAutoSpeak((v) => {
      const next = !v
      if (typeof window !== 'undefined') window.localStorage.setItem(TTS_AUTO_KEY, next ? '1' : '0')
      if (!next) stop()
      return next
    })
  }, [stop])

  if (!supported) return null

  return (
    <div className="rounded-2xl border border-primary/15 bg-surface/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-serif text-[14px] text-ink-light">신위 음성 자동 읽기</p>
          <p className="mt-1 font-sans text-[11.5px] leading-relaxed text-ink-light/50">
            속풀이에서 신위가 답할 때 소리로 읽어 드립니다. 이 기기에만 적용됩니다.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={autoSpeak}
          onClick={toggle}
          className={cn(
            'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] transition-colors',
            autoSpeak
              ? 'border-gold-500/45 bg-gold-500/15 text-gold-200'
              : 'border-white/[0.12] bg-white/[0.04] text-ink-light/55'
          )}
        >
          {autoSpeak ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          {autoSpeak ? '켜짐' : '꺼짐'}
        </button>
      </div>

      {/* 켜기 전에 «어떤 목소리인지» 들어볼 수 있어야 고르는 의미가 있다. */}
      <button
        type="button"
        onClick={() => speak('오셨군요. 오늘은 어떤 마음으로 앉으셨는지요.')}
        className="mt-3 w-full rounded-xl border border-white/[0.12] bg-white/[0.03] py-2 font-sans text-[12px] text-ink-light/70 transition-colors hover:border-gold-500/35 hover:text-gold-200"
      >
        목소리 미리 들어보기
      </button>
    </div>
  )
}
