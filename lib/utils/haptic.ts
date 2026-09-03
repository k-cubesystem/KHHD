import { GAMEFEEL_V1 } from '@/lib/config/gamefeel'

/**
 * 짧은 진동 한 번 — 엽전이 쟁반에 닿을 때, 불씨가 부적에 붙을 때.
 *
 * 룸의 useCinematics 에 같은 것이 있지만 그 훅은 룸 무대 전체(rAF·카메라)를 끌고 온다.
 * 의식 시트 셋이 진동 한 줄 때문에 룸 훅을 마운트할 이유가 없어 여기로 뺐다.
 * 브라우저가 사용자 제스처 밖 호출을 막아도 연출에는 영향이 없다 — 조용히 넘긴다.
 */
export function hapticPulse(ms: number): void {
  if (!GAMEFEEL_V1) return
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
  try {
    navigator.vibrate(ms)
  } catch {
    // 제스처 밖 호출 거부 — 햅틱 실패는 연출과 무관하다
  }
}
