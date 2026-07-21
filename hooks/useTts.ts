'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export interface TtsOptions {
  /** 0.1~2.0, 신위 페르소나별 속도 */
  rate?: number
  /** 0~2, 음높이 */
  pitch?: number
  lang?: string
  /** 성별 힌트 — 보이스 목록에서 이름 휴리스틱 선택 시도(실패 시 기본 한국어 보이스) */
  voiceHint?: 'male' | 'female' | null
}

// 한국어 보이스 성별 휴리스틱(플랫폼별 이름 파편). 단일 보이스 환경이면 매칭 실패 → 폴백.
const MALE_VOICE_HINTS = ['injoon', 'male', '남성', '남자', 'minsu', 'hyunsu', 'sangjun']
const FEMALE_VOICE_HINTS = ['heami', 'yuna', 'female', '여성', '여자', 'sora', 'nari', 'jimin', 'sunhi']

function pickKoreanVoiceByHint(
  voices: SpeechSynthesisVoice[],
  hint: 'male' | 'female' | null | undefined,
  fallback: SpeechSynthesisVoice | null
): SpeechSynthesisVoice | null {
  if (!hint) return fallback
  const ko = voices.filter((v) => v.lang?.toLowerCase().startsWith('ko'))
  if (ko.length <= 1) return fallback // 단일(또는 0) 보이스면 힌트 무의미 — 폴백
  const needles = hint === 'male' ? MALE_VOICE_HINTS : FEMALE_VOICE_HINTS
  const match = ko.find((v) => {
    const name = v.name.toLowerCase()
    return needles.some((n) => name.includes(n))
  })
  return match ?? fallback
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
      // 신위 성별 힌트로 보이스 선택 시도(다중 보이스 환경만) → 실패 시 기본 한국어 보이스
      const chosen = pickKoreanVoiceByHint(window.speechSynthesis.getVoices(), opts?.voiceHint, voiceRef.current)
      if (chosen) u.voice = chosen
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
