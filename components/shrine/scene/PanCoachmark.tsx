'use client'

/**
 * 첫 슬라이드 코치마크 — 「이 방은 옆으로 이어진다」를 **한 번만** 알려 준다
 * (PLAN-theme-stage-common-v2 §4 개선 A).
 *
 * 두루마리 방(폭 320%)에서는 화면에 보이는 것이 방의 1/3 뿐이다. 반가 한 테마일 때는 소수가
 * 겪는 일이었지만 16테마로 퍼지면 **모든 사용자가 처음 만나는 조작**이 된다 — 발견성이 없으면
 * 가족 선반장도 의식각도 화면 밖에 있는 채로 끝난다.
 *
 * 규율 셋:
 *  · **1회** — localStorage 에 표식을 남긴다(기기 단위). 진입마다 다시 뜨면 안내가 아니라 소음이다.
 *  · **새 @keyframes 금지** — 사라짐은 transition-opacity 하나로 한다(CSS 게이트 불변).
 *  · **렌더 중 matchMedia 금지** — 마운트 전에는 문구를 정할 수 없다. 서버와 첫 클라 렌더가
 *    달라지면 하이드레이션 오류(#418)가 난다. 그래서 effect 가 돌기 전에는 아무것도 그리지 않는다.
 */

import { useEffect, useState, useSyncExternalStore } from 'react'

/** 1회 규율의 표식. 문구·자리를 바꿔 다시 보이고 싶으면 v2 로 올린다. */
const COACH_KEY = 'hhd-shrine-pan-coach-v1'
/** 손대지 않아도 사라지는 시간 — 읽고도 남을 만큼, 방을 오래 가리지 않을 만큼 */
const AUTO_MS = 8000
/** 카메라가 제자리(대청 정렬점)에서 이만큼만 벗어나도 «이미 둘러보는 중» 으로 본다(%p) */
const MOVED_PCT = 0.5

/** 프라이빗 모드에서는 storage 접근 자체가 던진다 — 실패해도 안내가 한 번 더 뜰 뿐이다. */
function readSeen(): boolean {
  try {
    return window.localStorage.getItem(COACH_KEY) !== null
  } catch {
    return false
  }
}
function markSeen(): void {
  try {
    window.localStorage.setItem(COACH_KEY, '1')
  } catch {
    // 저장 실패 = 다음 진입에 한 번 더 표시. 그 외 부작용 없음
  }
}

// ─── 포인터 종류 구독 (SSR 안전) ────────────────────────────────
// `useSyncExternalStore` 를 쓰는 이유는 규율 때문이다: **서버 스냅샷은 하이드레이션 렌더에도
// 쓰인다.** 즉 첫 클라 렌더가 서버와 반드시 같아지고(#418 차단), 그 다음 커밋에서 실제 기기값으로
// 바뀐다. effect 로 setState 하는 흉내를 내지 않아도 같은 결과를 얻는다.

let pointerMql: MediaQueryList | null = null
function mql(): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null
  if (pointerMql === null) pointerMql = window.matchMedia('(pointer: fine)')
  return pointerMql
}
function subscribePointer(onChange: () => void): () => void {
  const m = mql()
  if (m === null) return () => {}
  m.addEventListener('change', onChange)
  return () => m.removeEventListener('change', onChange)
}
/** 클라이언트 스냅샷 — 원시값이라 매 호출 같은 값이 나온다(무한 리렌더 없음) */
function pointerSnapshot(): boolean | null {
  return mql()?.matches ?? null
}
/** 서버·하이드레이션 스냅샷 — 기기를 모른다. null 인 동안에는 아무것도 그리지 않는다 */
function pointerServerSnapshot(): boolean | null {
  return null
}

interface Props {
  /** 카메라 위치(world %) */
  camX: number
  /**
   * 입장·꾸미기·테마 전환이 카메라를 모으는 자리(대청 정렬점).
   *
   * 「카메라가 움직였다」를 기준점 없이 재면 **입장 팬**(마당 0 → 대청, 마운트 직후 자동)이
   * 곧바로 사용자 조작으로 오인된다. 그래서 이동 판정을 «집에서 벗어났는가» 로 뒤집었다 —
   * 파생값이라 상태도 타이머도 없고, 입장 팬이 끝나 카메라가 집에 서는 순간 안내가 뜬다.
   */
  homeCamX: number
}

export function PanCoachmark({ camX, homeCamX }: Props) {
  /**
   * 이미 본 사용자인가 — 마운트 1회 판정으로 **얼린다**. 표식을 쓰는 것이 우리 자신이라,
   * 매 렌더 다시 읽으면 표식을 남기는 순간 컴포넌트가 즉시 사라져 사라짐 전환이 잘린다.
   * (서버에서는 storage 가 없어 false 로 떨어지지만, 그 렌더의 산출물은 아래 pointer 스냅샷이
   *  null 이라 어차피 없다 — 하이드레이션 불일치가 생기지 않는다.)
   */
  const [seen] = useState(readSeen)
  /** null = 아직 기기를 모른다(서버·하이드레이션 렌더) → 아무것도 그리지 않는다 */
  const pointerFine = useSyncExternalStore(subscribePointer, pointerSnapshot, pointerServerSnapshot)
  const [closed, setClosed] = useState(false)

  /**
   * 보임 = 아직 안 봤고 · 닫지 않았고 · 카메라가 제자리다.
   * 카메라가 떠나면(=사용자가 둘러보기 시작하면) 조건이 저절로 거짓이 되어 사라진다 — 파생값이라
   * 상태도 감시 effect 도 없다.
   */
  const visible = !seen && !closed && pointerFine !== null && Math.abs(camX - homeCamX) <= MOVED_PCT

  /**
   * 화면에 실제로 걸린 동안만 자동 소멸을 걸고, **사라지는 순간에 표식**을 남긴다
   * (닫기·카메라 이동·언마운트가 전부 이 정리 함수로 모인다).
   * 입장 연출 중에 조용히 「봤다」로 처리하면 아무것도 못 본 사용자가 안내를 영영 놓친다.
   */
  useEffect(() => {
    if (!visible) return
    const t = window.setTimeout(() => setClosed(true), AUTO_MS)
    return () => {
      markSeen()
      window.clearTimeout(t)
    }
  }, [visible])

  if (seen || pointerFine === null) return null

  return (
    <div
      className={`absolute top-[52px] left-1/2 z-30 -translate-x-1/2 transition-opacity duration-500 ${
        visible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
      aria-hidden={!visible}
    >
      <div
        role="status"
        className="flex items-center gap-2 rounded-full border border-gold-500/30 bg-black/55 px-3 py-1.5 backdrop-blur-[2px]"
      >
        <span className="font-serif text-[11px] leading-none whitespace-nowrap text-gold-200">
          {pointerFine ? '휠 · ‹ › · 방향키로 방을 둘러보세요' : '옆으로 밀어 방을 둘러보세요'}
        </span>
        <button
          type="button"
          aria-label="안내 닫기"
          tabIndex={visible ? 0 : -1}
          onClick={() => setClosed(true)}
          className="grid h-5 w-5 place-items-center rounded-full text-[11px] leading-none text-gold-300/80 hover:text-gold-200"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
