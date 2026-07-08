'use client'

/**
 * 신당 사운드 — Web Audio 오실레이터 합성 (외부 파일 0).
 * 첫 제스처에서 AudioContext resume (모바일 autoplay 정책).
 * 국악 팔레트: 목탁·풍경·종·낙수·촛불·바라.
 */

import { useCallback, useRef, useState } from 'react'
import type { SoundKey } from '@/lib/domain/shrine/types'

type AC = AudioContext

export function useShrineAudio() {
  const acRef = useRef<AC | null>(null)
  const [muted, setMuted] = useState(false)
  const mutedRef = useRef(false)

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

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      mutedRef.current = !m
      return !m
    })
  }, [])

  return { play, muted, toggleMute }
}
