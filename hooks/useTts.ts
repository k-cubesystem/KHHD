'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useHydrated } from '@/hooks/use-hydrated'

export interface TtsOptions {
  /** 0.1~2.0, 신위 페르소나별 속도 */
  rate?: number
  /** 0~2, 음높이 */
  pitch?: number
  lang?: string
  /** 성별 힌트 — 보이스 목록에서 이름 휴리스틱 선택 시도(실패 시 기본 한국어 보이스) */
  voiceHint?: 'male' | 'female' | null
  /** 좌정 신위 코드 — 서버 뉴럴 TTS 가 실제 보이스(SunHi/InJoon/Hyunsu)를 고르는 키 */
  deityCode?: string | null
  /**
   * «무엇을 읽고 있는지» 식별자(메시지 timestamp 등). 화면이 그 말풍선만 재생 상태로 그리고
   * 「정지·처음부터」를 붙일 수 있게 한다. 없으면 재생 여부만 알 수 있다.
   */
  trackId?: string
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
 * 제공자 추상화 — 2단 폴백:
 *  1) 서버 뉴럴 TTS `/api/tts`(edge-tts, 무료·신위별 실제 다른 보이스) — 기본.
 *     `NEXT_PUBLIC_TTS_ENDPOINT` 로 다른 서버로 교체 가능.
 *  2) 서버 실패(비공식 엔드포인트 다운 등) 시 → 브라우저 Web Speech API 폴백.
 *
 * 🔴 **소리가 겹치던 버그와 그 처방**(2026-08-24 CEO 보고: 「듣기를 또 누르면 뒤에 한 번 더 나온다」)
 *    `speak()` 는 시작할 때 `stop()` 을 불렀지만, 서버 음성을 **받아오는 동안**(await fetch) 두 번째
 *    호출이 들어오면 그 시점엔 멈출 audio 객체가 아직 없다. 그래서 1·2차 응답이 차례로 도착해 둘 다
 *    재생되고, `audioRef` 는 2차만 가리키므로 1차는 정지로도 못 멈추는 «유령»이 됐다.
 *    → 호출마다 **세대 번호(genRef)** 를 매겨 뒤처진 응답은 폐기하고, 진행 중 요청은 abort 한다.
 *    이 방어가 없으면 느린 네트워크에서 언제든 재발한다 — 세대 검사를 지우지 말 것.
 */
export function useTts() {
  const [speaking, setSpeaking] = useState(false)
  /** 지금 읽고 있는 대상의 trackId (없으면 null) — 화면이 «이 말풍선만» 재생 UI 로 그린다. */
  const [speakingId, setSpeakingId] = useState<string | null>(null)
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  /** 재생 요청 세대 — 늦게 도착한 응답을 버리는 기준 */
  const genRef = useRef(0)
  const abortRef = useRef<AbortController | null>(null)
  const endpoint = process.env.NEXT_PUBLIC_TTS_ENDPOINT ?? '/api/tts'

  // 지원 여부는 브라우저 능력 조회다 — 서버 렌더에선 false, 하이드레이션 후 판정(기존 동작 동일).
  const hydrated = useHydrated()
  const supported = hydrated && (Boolean(endpoint) || 'speechSynthesis' in window)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const hasWebSpeech = 'speechSynthesis' in window
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
    // 세대를 올리면 «지금 날아오는 중인» 응답도 전부 무효가 된다(도착해도 재생하지 않는다).
    genRef.current += 1
    abortRef.current?.abort()
    abortRef.current = null
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }
    setSpeaking(false)
    setSpeakingId(null)
  }, [])

  // 화면을 떠날 때 소리가 따라다니지 않게 정리한다.
  useEffect(() => stop, [stop])

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
      stop() // 앞선 재생·요청을 끊고
      const myGen = genRef.current // 이번 요청의 세대를 기억한다
      const trackId = opts?.trackId ?? null
      const lang = opts?.lang ?? 'ko-KR'
      setSpeaking(true)
      setSpeakingId(trackId)

      // 1) 뉴럴 TTS 엔드포인트(설정 시)
      if (endpoint) {
        try {
          const controller = new AbortController()
          abortRef.current = controller
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: say,
              lang,
              rate: opts?.rate,
              pitch: opts?.pitch,
              deityCode: opts?.deityCode ?? null,
            }),
            signal: controller.signal,
          })
          // 🔴 응답이 오는 사이 다른 재생이 시작됐으면 이 소리는 버린다(겹침 방지).
          if (genRef.current !== myGen) return
          if (res.ok) {
            const blob = await res.blob()
            if (genRef.current !== myGen) return
            const audio = new Audio(URL.createObjectURL(blob))
            audioRef.current = audio
            const finish = () => {
              if (genRef.current !== myGen) return // 이미 다음 재생이 시작됐으면 그쪽 상태를 건드리지 않는다
              setSpeaking(false)
              setSpeakingId(null)
            }
            audio.onended = finish
            audio.onerror = finish
            await audio.play()
            return
          }
        } catch {
          // abort(정지·재클릭)면 여기서 끝. 그 외엔 아래 Web Speech 폴백으로 내려간다.
          if (genRef.current !== myGen) return
        }
      }

      // 2) Web Speech(기본, 무료)
      if (!('speechSynthesis' in window)) {
        setSpeaking(false)
        setSpeakingId(null)
        return
      }
      if (genRef.current !== myGen) return
      const u = new SpeechSynthesisUtterance(say)
      u.lang = lang
      // 신위 성별 힌트로 보이스 선택 시도(다중 보이스 환경만) → 실패 시 기본 한국어 보이스
      const chosen = pickKoreanVoiceByHint(window.speechSynthesis.getVoices(), opts?.voiceHint, voiceRef.current)
      if (chosen) u.voice = chosen
      u.rate = opts?.rate ?? 0.98
      u.pitch = opts?.pitch ?? 1.0
      const finish = () => {
        if (genRef.current !== myGen) return
        setSpeaking(false)
        setSpeakingId(null)
      }
      u.onend = finish
      u.onerror = finish
      window.speechSynthesis.speak(u)
    },
    [endpoint, stop]
  )

  return { supported, speaking, speakingId, speak, stop }
}
