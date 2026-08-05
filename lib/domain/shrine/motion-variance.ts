/**
 * 연출 위상 변주 — **전부 같은 박자로 숨쉬는 것**이 부자연의 뿌리다.
 *
 * 같은 클래스의 idle 애니메이션(흔들림·숨·글로)은 시작 시각과 길이가 같아서, 촛불 세 개가
 * 군대처럼 함께 흔들린다. 실물은 그러지 않는다 — 바람은 같아도 물건마다 받는 결이 다르다.
 * 여기서는 배치 id 로 **결정론** 위상·박자 편차를 만들어 요소마다 다르게 준다.
 *
 * ⚠️ 반드시 결정론이어야 한다. Math.random() 을 쓰면 서버 렌더와 클라 렌더가 달라
 *    하이드레이션이 깨진다(react-hooks/purity 도 막는다). 같은 id → 언제나 같은 편차.
 * ⚠️ 음수 delay 를 쓴다 — 양수로 미루면 처음 몇 초 동안 얼어 있다가 움직이기 시작하는 게
 *    보인다. 음수는 "이미 그만큼 진행된 채" 시작해 처음부터 살아 있다.
 */

/** 문자열 → 32bit 해시(FNV-1a). 균등하진 않아도 위상 편차엔 충분하고, 무엇보다 결정론이다. */
export function hashId(id: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

export interface MotionVariance {
  /** 초 단위 음수 위상(이미 진행된 채 시작). "-3.7s" 처럼 붙인다 */
  delaySec: number
  /** 박자 배율 0.92~1.12 — 길이가 다르면 겹쳤다 떨어졌다 하며 영원히 안 맞는다 */
  durScale: number
}

/** 위상은 한 호흡(기본 8초) 안에서 고르게 흩는다. */
export const VARIANCE_PHASE_SPAN_SEC = 8
export const VARIANCE_DUR_MIN = 0.92
export const VARIANCE_DUR_MAX = 1.12

export function motionVariance(id: string): MotionVariance {
  const h = hashId(id)
  const phase = (h % 1000) / 1000 // 0~0.999
  const beat = ((h >>> 10) % 1000) / 1000
  return {
    delaySec: -Number((phase * VARIANCE_PHASE_SPAN_SEC).toFixed(2)),
    durScale: Number((VARIANCE_DUR_MIN + beat * (VARIANCE_DUR_MAX - VARIANCE_DUR_MIN)).toFixed(3)),
  }
}

/**
 * 인라인 style 값 — 요소의 **모든** 애니메이션에 일괄 적용된다.
 *
 * ⚠️ durScale 은 `animation-duration` 을 직접 덮지 않는다. 한 요소에 유한 연출(펼침)과 무한
 *    연출(펄럭임)이 겹쳐 있을 때 duration 을 덮으면 유한 쪽 박자가 깨진다 — 그래서 위상만
 *    기본 적용하고, 박자 배율은 idle **전용** 요소에만 쓰도록 호출부가 고른다.
 */
export function varianceStyle(
  id: string,
  withDuration: boolean,
  baseDurSec: number
): {
  animationDelay: string
  animationDuration?: string
} {
  const v = motionVariance(id)
  if (!withDuration) return { animationDelay: `${v.delaySec}s` }
  return {
    animationDelay: `${v.delaySec}s`,
    animationDuration: `${Number((baseDurSec * v.durScale).toFixed(2))}s`,
  }
}
