/**
 * 의례 전환(View Transitions) — 순수 판정부.
 *
 * 신당 ↔ 오방기 ↔ 척전 ↔ 백일기도 이동을 문 여닫는 호흡으로 잇는다. 브라우저 API
 * `document.startViewTransition()` 을 쓰되, **판정은 전부 여기 모아** 단위테스트로 고정한다.
 *
 * ⚠️ React 의 `<ViewTransition>` 은 쓰지 않는다 — react@19.2.4 정식 빌드에 `unstable_ViewTransition`
 *    이 없다(experimental 빌드 전용). 그것 하나 때문에 React 를 실험판으로 바꾸는 건 이 앱이 질
 *    위험이 아니다. 네이티브 API 는 없으면 그냥 안 도는 것이라 폴백이 "즉시 이동"으로 안전하다.
 */

/**
 * 전환을 강제로 끝내는 시한(ms).
 *
 * ⚠️ 이 값이 이 파일에서 제일 중요하다. `startViewTransition` 에 넘긴 약속이 끝나지 않으면 화면은
 *    전환용 스냅샷을 덮어쓴 채 **영원히 멈춘다** — 클릭도 스크롤도 안 먹는다. 신당은 이미 같은
 *    종류의 무증상 교착을 겪었다(국면 전환이 animationend 를 기다리다 영영 멎음).
 *    이동이 실패해도 1.2초 뒤엔 반드시 놓아 준다.
 */
export const RITUAL_TRANSITION_TIMEOUT_MS = 1200

/** 클릭 이벤트에서 우리가 보는 것만 추린 모양 — 테스트가 DOM 없이 부를 수 있게. */
export interface NavClickLike {
  readonly button: number
  readonly metaKey: boolean
  readonly ctrlKey: boolean
  readonly shiftKey: boolean
  readonly altKey: boolean
  readonly defaultPrevented: boolean
}

/**
 * 이 클릭을 가로채도 되는가.
 *
 * ⚠️ 보조키가 눌린 클릭은 **브라우저 것이다** — 새 탭(⌘/Ctrl), 새 창(Shift), 다운로드(Alt).
 *    연출 좀 넣자고 그걸 뺏으면 "새 탭으로 열기가 안 되는 사이트"가 된다.
 */
export function shouldInterceptNavigation(e: NavClickLike): boolean {
  if (e.defaultPrevented) return false
  if (e.button !== 0) return false
  return !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
}

/** 전환을 실제로 돌릴 자리인가 — API 유무와 감속 선호를 함께 본다. */
export function canRunViewTransition(input: {
  readonly hasApi: boolean
  readonly prefersReducedMotion: boolean
}): boolean {
  return input.hasApi && !input.prefersReducedMotion
}
