'use client'

import { useSyncExternalStore, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

const noopSubscribe = () => () => {}

/**
 * 채팅 화면의 오버레이(바텀시트·지난 대화 패널)를 body 로 내보낸다.
 *
 * 채팅 루트가 `position:fixed` + `zIndex:10` 이라 **독립 스택 컨텍스트**를 만든다.
 * 그 안에서는 자식이 z-50 을 줘도 부모의 10 안에 갇히므로, 루트 컨텍스트에 있는
 * 하단 네비(--z-nav: 40)가 오버레이 위에 그려져 시트 하단이 잘려 보였다.
 * 포털로 body 에 붙이면 같은 컨텍스트에서 z-index 로 정상 경쟁한다.
 *
 * SSR 에서는 아무것도 렌더하지 않는다(document 부재) — 마운트 후에만 붙인다.
 */
export function OverlayPortal({ children }: { children: ReactNode }) {
  // 서버 스냅샷 false / 클라이언트 스냅샷 true — 하이드레이션 불일치 없이 클라이언트 여부를 얻는다.
  // effect + setState 마운트 가드보다 이쪽이 React 19 권장 형태다.
  const isClient = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  )
  if (!isClient) return null
  return createPortal(children, document.body)
}
