'use client'

import { useSyncExternalStore } from 'react'

// 스토어가 바뀔 일이 없다 — 구독은 no-op, 스냅샷은 서버/클라이언트 고정값이다.
const subscribe = () => () => {}
const getSnapshot = () => true
const getServerSnapshot = () => false

/**
 * 하이드레이션 완료 여부. 서버 렌더와 첫 하이드레이션 렌더에서 false, 그 직후 true.
 *
 * `useState(false)` + `useEffect(() => setMounted(true), [])` 관용구와 결과가 같지만
 * 이펙트에서 setState 를 하지 않아 React 컴파일러 규칙(set-state-in-effect)에 걸리지 않는다.
 * 클라이언트 전용 값(navigator·speechSynthesis 등)을 읽는 렌더를 하이드레이션 뒤로 미룰 때 쓴다.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
