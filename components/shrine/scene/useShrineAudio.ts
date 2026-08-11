'use client'

/**
 * 신당 사운드 — 실음원 우선 + 오실레이터 합성 폴백.
 *  - public/sounds/shrine/fx-{soundKey}.mp3 있으면 실음원(Web Audio buffer), 없으면 합성.
 *  - public/sounds/shrine/bgm-{theme}.mp3 있으면 실음원(HTMLAudioElement, loop, vol 0.25), 없으면 절차 국악 앰비언트.
 *    16테마 전부 실음원 상주(싱잉볼 합성 트랙 60초 seamless loop) — 생성기는
 *    scripts/media-assets/shrine-ambience.mjs, 라이선스 대장은 public/sounds/shrine/CREDITS.md.
 * 첫 제스처에서 AudioContext resume (모바일 autoplay 정책).
 * 음소거는 localStorage 공유(전역) — 모든 useShrineAudio 인스턴스가 존중.
 * 국악 팔레트: 목탁·풍경·종·낙수·촛불·바라.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { SoundKey } from '@/lib/domain/shrine/types'

type AC = AudioContext

const SHRINE_SOUND_BASE = '/sounds/shrine'
const MUTE_KEY = 'hhd_shrine_muted' // 전역 음소거(모든 인스턴스 공유)
const BGM_VOLUME = 0.25 // 실음원 BGM 음량(은은하게)

/**
 * 테마별 루트 주파수(Hz) — 16테마 완비. **실음원 트랙과 같은 음높이 체계**라야 파일이 빠졌을 때
 * 폴백이 «다른 곡»으로 들리지 않는다(생성기: scripts/media-assets/shrine-ambience.mjs).
 *
 * 임의 배정이 아니라 파생값이다: 黃鍾 F3(174.61Hz) 위의 평조(平調) 5음 [1, 9/8, 4/3, 3/2, 27/16] 에서
 * **오행-오음 정통 대응**(宮=土 · 商=金 · 角=木 · 徵=火 · 羽=水)으로 도수를 고르고,
 * 무드 무게로 옥타브(×1 / ×1/2)를 정한다. 오행 출처는 theme-stage-geometry.json 의 themeElements.
 * 같은 오행끼리 값이 겹치는 것은 의도다 — 오음 대응이 그렇고, 트랙 정체성은 템포·음색·자연음이 낸다.
 * 표 재생성: `node scripts/media-assets/shrine-ambience.mjs --roots` (손으로 계산하지 말 것)
 */
export const BGM_ROOT: Record<string, number> = {
  // 土 宮/黃 174.61
  jangdok: 174.61,
  seonang: 174.61,
  daljip: 87.31, // ×1/2 — 대보름 큰 불의 울림
  // 金 商/太 196.44
  seolbit: 196.44,
  daejanggan: 196.44,
  jonggak: 98.22, // ×1/2 — 범종 여운
  // 木 角/仲 232.81
  banga: 232.81,
  dangsan: 116.41, // ×1/2 — 숲의 깊이
  // 火 徵/林 261.92
  dokkaebi: 261.92,
  yeondeung: 261.92,
  hongsal: 130.96, // ×1/2 — 노을의 넓이
  // 水 羽/南 294.65
  saemgut: 294.65,
  yonggung: 147.33, // ×1/2 — 심해
  naru: 147.33, // ×1/2 — 강폭
  // 오행 없는 테마(themeElements = null) — 살림의 기본인 宮 에 둔다
  choga: 174.61,
  byeolbat: 87.31, // ×1/2 — 은하의 광대함
}
/** 평조(平調) 5음 상대 비율 — 黃 太 仲 林 南. 서양 장음계를 쓰면 국악풍이 안 난다. */
export const PENTA = [1, 9 / 8, 4 / 3, 3 / 2, 27 / 16]

/**
 * 자동재생 정책 차단인가. 브라우저마다 DOMException 이 아닌 Error 로 거절하기도 해서
 * instanceof 가 아니라 name 으로 판정한다(any 금지 — unknown + 타입 가드).
 */
function isAutoplayBlocked(err: unknown): boolean {
  return (
    typeof err === 'object' && err !== null && 'name' in err && (err as { name?: unknown }).name === 'NotAllowedError'
  )
}

export function useShrineAudio() {
  const acRef = useRef<AC | null>(null)
  const [muted, setMuted] = useState(false)
  const mutedRef = useRef(false)
  // 절차적 배경음(BGM)
  const bgmRef = useRef<{ master: GainNode; drones: OscillatorNode[]; timer: number } | null>(null)
  const bgmAudioRef = useRef<HTMLAudioElement | null>(null) // 실음원 BGM
  const bgmRootRef = useRef<number>(196)
  const lastThemeRef = useRef<string | undefined>(undefined)
  const [bgmOn, setBgmOn] = useState(false)
  // FX 실음원 버퍼 캐시: AudioBuffer=재생, null=파일없음(합성 폴백 고정), 미보유=아직 미시도
  const fxBufRef = useRef<Map<SoundKey, AudioBuffer | null>>(new Map())
  const fxLoadingRef = useRef<Set<SoundKey>>(new Set())

  // 전역 음소거 초기화 (localStorage 공유)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.localStorage.getItem(MUTE_KEY) === '1') {
      mutedRef.current = true
      setMuted(true)
    }
  }, [])

  const ctx = useCallback((): AC | null => {
    if (typeof window === 'undefined') return null
    if (!acRef.current) {
      const Ctor =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      acRef.current = new Ctor()
    }
    if (acRef.current.state === 'suspended') void acRef.current.resume()
    return acRef.current
  }, [])

  // ── FX 실음원: 비동기 1회 로드 후 캐시(없으면 null=합성 폴백 고정) ──
  const loadFx = useCallback(
    async (key: SoundKey) => {
      if (fxLoadingRef.current.has(key) || fxBufRef.current.has(key)) return
      fxLoadingRef.current.add(key)
      try {
        const res = await fetch(`${SHRINE_SOUND_BASE}/fx-${key}.mp3`)
        if (!res.ok) {
          fxBufRef.current.set(key, null)
          return
        }
        const arr = await res.arrayBuffer()
        const c = ctx()
        if (!c) {
          fxBufRef.current.set(key, null)
          return
        }
        const buf = await c.decodeAudioData(arr)
        fxBufRef.current.set(key, buf)
      } catch {
        fxBufRef.current.set(key, null) // 파일 없음/디코드 실패 → 합성 폴백
      } finally {
        fxLoadingRef.current.delete(key)
      }
    },
    [ctx]
  )

  const playBuffer = useCallback(
    (buf: AudioBuffer) => {
      const c = ctx()
      if (!c) return
      const src = c.createBufferSource()
      const g = c.createGain()
      src.buffer = buf
      g.gain.value = 0.9
      src.connect(g).connect(c.destination)
      src.start()
    },
    [ctx]
  )

  const tone = useCallback(
    (freq: number, dur: number, vol: number, type: OscillatorType = 'sine', bend?: number) => {
      if (mutedRef.current) return
      const c = ctx()
      if (!c) return
      const t = c.currentTime
      const o = c.createOscillator()
      const g = c.createGain()
      o.type = type
      o.frequency.setValueAtTime(freq, t)
      if (bend) o.frequency.exponentialRampToValueAtTime(bend, t + dur * 0.6)
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(vol, t + 0.006)
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
      o.connect(g).connect(c.destination)
      o.start(t)
      o.stop(t + dur + 0.05)
    },
    [ctx]
  )

  // 합성 폴백(외부 파일 없을 때)
  const synth = useCallback(
    (key: SoundKey) => {
      switch (key) {
        case 'moktak':
          tone(760, 0.16, 0.35, 'sine', 300)
          break
        case 'chime':
          tone(1318, 1.5, 0.13)
          window.setTimeout(() => tone(1760, 1.3, 0.09), 70)
          window.setTimeout(() => tone(2217, 1.1, 0.06), 150)
          break
        case 'bell':
          tone(523, 1.7, 0.18)
          tone(784, 1.4, 0.09)
          break
        case 'water':
          tone(420, 0.25, 0.18, 'sine', 180)
          window.setTimeout(() => tone(520, 0.2, 0.11, 'sine', 240), 90)
          break
        case 'crackle':
          tone(200, 0.1, 0.15, 'triangle', 90)
          window.setTimeout(() => tone(300, 0.08, 0.09, 'triangle', 140), 60)
          break
        case 'bara':
          tone(880, 2.0, 0.12)
          tone(1174, 1.7, 0.08)
          tone(659, 2.2, 0.07)
          break
      }
    },
    [tone]
  )

  const play = useCallback(
    (key: SoundKey) => {
      if (mutedRef.current) return
      const buf = fxBufRef.current.get(key)
      if (buf) {
        playBuffer(buf) // 실음원
        return
      }
      if (buf === undefined) void loadFx(key) // 다음 재생을 위해 로드(이번엔 합성)
      synth(key) // 폴백: 합성 (파일 없거나 로딩 중)
    },
    [playBuffer, loadFx, synth]
  )

  // ── BGM 정지(실음원 + 절차 모두) ──
  const stopBgm = useCallback(() => {
    if (bgmAudioRef.current) {
      try {
        bgmAudioRef.current.pause()
      } catch {
        /* noop */
      }
      bgmAudioRef.current = null
    }
    const b = bgmRef.current
    if (b) {
      bgmRef.current = null
      window.clearInterval(b.timer)
      const c = acRef.current
      const t = c ? c.currentTime : 0
      try {
        b.master.gain.cancelScheduledValues(t)
        b.master.gain.setValueAtTime(b.master.gain.value, t)
        b.master.gain.linearRampToValueAtTime(0.0001, t + 1.2)
        b.drones.forEach((o) => o.stop(t + 1.4))
      } catch {
        /* noop */
      }
    }
    setBgmOn(false)
  }, [])

  // ── 절차적 국악 앰비언트(외부 파일 없을 때 폴백) ──
  const startProceduralBgm = useCallback(
    (root: number) => {
      const c = ctx()
      if (!c || bgmRef.current) return
      bgmRootRef.current = root

      const master = c.createGain()
      master.gain.setValueAtTime(0.0001, c.currentTime)
      master.gain.linearRampToValueAtTime(0.05, c.currentTime + 2.5) // 아주 은은하게 페이드인
      master.connect(c.destination)

      // 지속 드론 2겹(루트 + 5도) — 공간감
      const drones = [root / 2, (root / 2) * (3 / 2)].map((f, i) => {
        const o = c.createOscillator()
        const g = c.createGain()
        o.type = 'sine'
        o.frequency.value = f
        g.gain.value = i === 0 ? 0.5 : 0.28
        // 느린 흔들림(LFO)로 숨쉬는 느낌
        const lfo = c.createOscillator()
        const lfoGain = c.createGain()
        lfo.frequency.value = 0.06 + i * 0.03
        lfoGain.gain.value = 0.12
        lfo.connect(lfoGain).connect(g.gain)
        lfo.start()
        o.connect(g).connect(master)
        o.start()
        return o
      })

      // 펜타토닉 음을 느긋하게 흩뿌리는 스케줄러(생성적)
      let step = 0
      const timer = window.setInterval(() => {
        if (mutedRef.current || !bgmRef.current) return
        // 3번에 1번 정도만 소리내 여백을 둠
        if (step++ % 3 === 1) {
          const ratio = PENTA[Math.floor((step * 2654435761) % PENTA.length)] ?? 1
          const freq = root * ratio
          const o = c.createOscillator()
          const g = c.createGain()
          o.type = 'triangle'
          o.frequency.value = freq
          const t = c.currentTime
          g.gain.setValueAtTime(0, t)
          g.gain.linearRampToValueAtTime(0.06, t + 0.4)
          g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6)
          o.connect(g).connect(master)
          o.start(t)
          o.stop(t + 2.8)
        }
      }, 2400)

      bgmRef.current = { master, drones, timer }
      setBgmOn(true)
    },
    [ctx]
  )

  // ── BGM 시작: 실음원 우선 → 실패(파일 없음/정책) 시 절차 합성 ──
  const startBgm = useCallback(
    (themeCode?: string) => {
      if (mutedRef.current) return
      if (bgmRef.current || bgmAudioRef.current) return // 이미 재생 중
      const theme = themeCode && BGM_ROOT[themeCode] ? themeCode : (lastThemeRef.current ?? 'choga')
      lastThemeRef.current = theme
      const root = BGM_ROOT[theme] ?? bgmRootRef.current
      bgmRootRef.current = root

      if (typeof window === 'undefined' || typeof Audio === 'undefined') {
        startProceduralBgm(root)
        return
      }

      const audio = new Audio(`${SHRINE_SOUND_BASE}/bgm-${theme}.mp3`)
      audio.loop = true
      audio.volume = BGM_VOLUME
      let fellBack = false
      const fallback = () => {
        if (fellBack) return
        fellBack = true
        if (bgmAudioRef.current === audio) bgmAudioRef.current = null
        startProceduralBgm(root)
      }
      audio.onerror = fallback // 404·디코드 실패 → 절차 합성
      bgmAudioRef.current = audio
      audio.play().then(
        () => {
          if (!fellBack) setBgmOn(true)
        },
        (err: unknown) => {
          // 🔴 «자동재생 차단»과 «파일 없음»을 구분해야 한다. 16테마 실음원이 다 있는 지금
          // 차단을 폴백으로 처리하면, 진입 즉시 절차 합성이 자리를 잡아 버리고(bgmRef 점유)
          // 첫 제스처 재호출이 조기 return 되어 **실음원이 영원히 안 나온다**.
          // 정책 차단이면 element 만 비우고 물러난다 — 첫 제스처의 재호출에서 그대로 살아난다.
          if (isAutoplayBlocked(err)) {
            audio.onerror = null // 버려진 element 의 뒤늦은 error 가 합성 폴백을 깨우지 못하게
            if (bgmAudioRef.current === audio) bgmAudioRef.current = null
            return
          }
          fallback()
        }
      )
    },
    [startProceduralBgm]
  )

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m
      mutedRef.current = next
      if (typeof window !== 'undefined') window.localStorage.setItem(MUTE_KEY, next ? '1' : '0')
      if (next) stopBgm()
      else startBgm(lastThemeRef.current)
      return next
    })
  }, [startBgm, stopBgm])

  useEffect(() => {
    return () => stopBgm()
  }, [stopBgm])

  return { play, muted, toggleMute, startBgm, stopBgm, bgmOn }
}
