'use client'

/**
 * 신당 사운드 — Web Audio 오실레이터 합성 (외부 파일 0).
 * 첫 제스처에서 AudioContext resume (모바일 autoplay 정책).
 * 국악 팔레트: 목탁·풍경·종·낙수·촛불·바라.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { SoundKey } from '@/lib/domain/shrine/types'

type AC = AudioContext

// 테마별 오음(五音) 펜타토닉 루트 — 절차적 BGM 톤 결정
const BGM_ROOT: Record<string, number> = {
  banga: 220, // A3 — 가야금 느낌
  choga: 196, // G3 — 소박한 대금
  yonggung: 174, // F3 — 물빛 해금
  dokkaebi: 246.94, // B3 — 장구 리듬감
}
// 국악 펜타토닉(궁상각치우) 상대 비율
const PENTA = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2]

export function useShrineAudio() {
  const acRef = useRef<AC | null>(null)
  const [muted, setMuted] = useState(false)
  const mutedRef = useRef(false)
  // 절차적 배경음(BGM)
  const bgmRef = useRef<{ master: GainNode; drones: OscillatorNode[]; timer: number } | null>(null)
  const bgmRootRef = useRef<number>(196)
  const [bgmOn, setBgmOn] = useState(false)

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

  const play = useCallback(
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

  // ── 절차적 배경음(BGM) — 국악 앰비언트 생성(외부 파일 0) ──
  const stopBgm = useCallback(() => {
    const b = bgmRef.current
    if (!b) return
    bgmRef.current = null
    setBgmOn(false)
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
  }, [])

  const startBgm = useCallback(
    (themeCode?: string) => {
      if (mutedRef.current) return
      const c = ctx()
      if (!c) return
      const root = (themeCode && BGM_ROOT[themeCode]) || bgmRootRef.current
      bgmRootRef.current = root
      if (bgmRef.current) return // 이미 재생 중

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

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m
      mutedRef.current = next
      if (next) stopBgm()
      else startBgm(bgmRootRef.current === 0 ? undefined : undefined)
      return next
    })
  }, [startBgm, stopBgm])

  useEffect(() => {
    return () => stopBgm()
  }, [stopBgm])

  return { play, muted, toggleMute, startBgm, stopBgm, bgmOn }
}
