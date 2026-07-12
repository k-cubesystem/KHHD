'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export interface TtsOptions {
  /** 0.1~2.0, 신위 페르소나별 속도 */
  rate?: number
  /** 0~2, 음높이 */
  pitch?: number
  lang?: string
}

/**
 * 신과의 대화 TTS (무료·즉시 동작 + 교체 가능).
 * 제공자 추상화:
 *  - `NEXT_PUBLIC_TTS_ENDPOINT` 설정 시 → 그 엔드포인트에 POST(text,lang) → audio 재생.
 *    (추후 GitHub 뉴럴TTS: Piper/Coqui/XTTS 등을 서버로 띄우고 이 env만 지정하면 됨)
 *  - 미설정 시 → 브라우저 표준 Web Speech API(무료, 한국어 ko-KR). 기본값.
 */
export function useTts() {
  const [supported, setSupported] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const endpoint = process.env.NEXT_PUBLIC_TTS_ENDPOINT

  useEffect(() => {
    if (typeof window === 'undefined') return
    const hasWebSpeech = 'speechSynthesis' in window
    setSupported(Boolean(endpoint) || hasWebSpeech)
    if (!hasWebSpeech) return

    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices()
      voiceRef.current = voices.find((v) => v.lang?.toLowerCase().startsWith('ko')) ?? voices[0] ?? null
    }
    pickVoice()
    window.speechSynthesis.addEventListener('voiceschanged', pickVoice)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', pickVoice)
  }, [endpoint])

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setSpeaking(false)
  }, [])

  /** 지문 서사(*별표*)·응답 태그([[...]])·과한 공백 제거 후 발화용 텍스트 정제. */
  const clean = (text: string) =>
    text
      .replace(/\[\[[^\]]*\]\]/g, '')
      .replace(/\*[^*\n]+\*/g, '')
      .replace(/[#>*_`]/g, '')
      .replace(/\s+/g, ' ')
      .trim()

  const speak = useCallback(
    async (text: string, opts?: TtsOptions) => {
      const say = clean(text)
      if (typeof window === 'undefined' || !say) return
      stop()
      const lang = opts?.lang ?? 'ko-KR'

      // 1) 뉴럴 TTS 엔드포인트(설정 시)
      if (endpoint) {
        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: say, lang, rate: opts?.rate, pitch: opts?.pitch }),
          })
          if (res.ok) {
            const blob = await res.blob()
            const audio = new Audio(URL.createObjectURL(blob))
            audioRef.current = audio
            audio.onended = () => setSpeaking(false)
            audio.onerror = () => setSpeaking(false)
            setSpeaking(true)
            await audio.play()
            return
          }
        } catch {
          // 엔드포인트 실패 → Web Speech 폴백
        }
      }

      // 2) Web Speech(기본, 무료)
      if (!('speechSynthesis' in window)) return
      const u = new SpeechSynthesisUtterance(say)
      u.lang = lang
      if (voiceRef.current) u.voice = voiceRef.current
      u.rate = opts?.rate ?? 0.98
      u.pitch = opts?.pitch ?? 1.0
      u.onend = () => setSpeaking(false)
      u.onerror = () => setSpeaking(false)
      setSpeaking(true)
      window.speechSynthesis.speak(u)
    },
    [endpoint, stop]
  )

  return { supported, speaking, speak, stop }
}
