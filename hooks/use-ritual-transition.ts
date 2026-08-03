'use client'

import { useCallback, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  RITUAL_TRANSITION_TIMEOUT_MS,
  canRunViewTransition,
  shouldInterceptNavigation,
  type NavClickLike,
} from '@/lib/domain/shrine/view-transition'

/**
 * 의례 사이 이동에 View Transition 을 입힌다.
 *
 * 흐름: 클릭 → `startViewTransition(약속)` → 그 안에서 라우터 이동 → **새 경로가 그려지면**
 * 약속을 놓아 준다. 브라우저는 그 사이의 화면 둘을 스냅샷으로 잡아 크로스페이드한다.
 *
 * ⚠️ 약속을 놓아 주는 자리가 두 곳이다: 경로가 바뀌었을 때(정상)와 시한이 다 됐을 때(사고).
 *    뒤엣것이 없으면 이동이 실패했을 때 화면이 스냅샷을 덮어쓴 채 얼어붙는다.
 */
type ViewTransitionLike = { readonly finished: Promise<void> }
type StartViewTransition = (cb: () => Promise<void> | void) => ViewTransitionLike

function readStart(): StartViewTransition | null {
  if (typeof document === 'undefined') return null
  const d: Document & { startViewTransition?: unknown } = document
  return typeof d.startViewTransition === 'function' ? (d.startViewTransition.bind(d) as StartViewTransition) : null
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export type RitualNavigate = (href: string, e?: NavClickLike) => boolean

export function useRitualTransition(): RitualNavigate {
  const router = useRouter()
  const pathname = usePathname()
  const release = useRef<(() => void) | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const finish = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current)
      timer.current = null
    }
    const fn = release.current
    release.current = null
    fn?.()
  }, [])

  // 새 경로가 그려졌다 — 놓아 준다. (마운트 때도 한 번 도는데, 걸린 게 없으면 아무 일도 없다)
  useEffect(() => {
    finish()
  }, [pathname, finish])

  // 언마운트 중에 전환이 걸려 있으면 화면이 그대로 굳는다
  useEffect(() => finish, [finish])

  return useCallback(
    (href, e) => {
      if (e && !shouldInterceptNavigation(e)) return false

      const start = readStart()
      if (start === null || !canRunViewTransition({ hasApi: true, prefersReducedMotion: prefersReducedMotion() })) {
        router.push(href)
        return true
      }

      start(
        () =>
          new Promise<void>((resolve) => {
            release.current = resolve
            timer.current = setTimeout(finish, RITUAL_TRANSITION_TIMEOUT_MS)
            router.push(href)
          })
      )
      return true
    },
    [router, finish]
  )
}
