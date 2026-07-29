/**
 * 신당 게임필 안1 — 저사양 폴백 게이트 (ARCH-shrine-gamefeel-v1 §5 / PRD NFR U8).
 *
 * 측정치(기기 메모리·최근 프레임 평균) → 연출 등급. 'lite' 면 시차 끔·파티클 반감·시네마틱 축약.
 * 순수 함수 — 측정 자체(navigator.deviceMemory·rAF 샘플링)는 호출자(훅) 책임이다.
 */

export type EffectsTier = 'full' | 'lite'

/** 이 미만이면 저사양 (navigator.deviceMemory 는 0.25·0.5·1·2·4·8 만 보고한다). */
export const LITE_MEMORY_GB = 4
/** 최근 프레임 평균이 이 미만이면 저사양 (NFR 목표 55fps 아래로 여유를 둔 하한). */
export const LITE_FPS = 45

/** 유한·양수만 실측으로 인정. 비유한·0 이하는 '아직 못 잰 값'이라 판정 근거로 쓰지 않는다. */
function measured(v: number | null): number | null {
  if (v === null || !Number.isFinite(v) || v <= 0) return null
  return v
}

/**
 * 연출 등급 판정. 둘 중 하나라도 기준 미달이면 'lite',
 * 측정치가 하나도 없으면(브라우저 미지원·초기 렌더) 'full' — 폴백은 근거가 있을 때만 건다.
 */
export function effectsTier(deviceMemoryGb: number | null, avgFps: number | null): EffectsTier {
  const memory = measured(deviceMemoryGb)
  if (memory !== null && memory < LITE_MEMORY_GB) return 'lite'
  const fps = measured(avgFps)
  if (fps !== null && fps < LITE_FPS) return 'lite'
  return 'full'
}
