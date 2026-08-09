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

// ─── 3티어 (ARCH-shrine-living-background-v1 §6) ────────────────
// 앰비언트는 상한이 3단이라 'full'|'lite' 2단으로는 mid 를 표현할 수 없다.
// 기존 effectsTier 는 ShrineRoomClient 가 쓰는 중이라 그대로 두고, 아래를 새 계약으로 얹는다.

export type PerfTier = 'low' | 'mid' | 'high'

/** 코어가 이 이하면 저사양. deviceMemory 를 안 주는 브라우저(사파리)에서 유일한 하드웨어 근거다. */
export const LOW_CONCURRENCY = 4

/** 판정 신호. 측정 자체(navigator·rAF 샘플링·미디어쿼리)는 호출자(훅) 책임 — 이 파일은 순수하다. */
export interface PerfSignals {
  deviceMemoryGb: number | null
  hardwareConcurrency: number | null
  avgFps: number | null
  /** 모바일이면 mid 로 내린다. 모르면 null — 근거 없이 등급을 낮추지 않는다(기존 규율 승계). */
  mobile: boolean | null
}

/**
 * 3단 판정. 저사양 근거가 하나라도 있으면 'low',
 * 아니면 모바일은 'mid' · 데스크톱/미상은 'high'.
 */
export function perfTier(signals: PerfSignals): PerfTier {
  const memory = measured(signals.deviceMemoryGb)
  if (memory !== null && memory < LITE_MEMORY_GB) return 'low'
  const cores = measured(signals.hardwareConcurrency)
  if (cores !== null && cores <= LOW_CONCURRENCY) return 'low'
  const fps = measured(signals.avgFps)
  if (fps !== null && fps < LITE_FPS) return 'low'
  return signals.mobile === true ? 'mid' : 'high'
}

/** 3티어 → 기존 2티어. mid 는 시차·시네마틱을 감당하므로 'full' 쪽이다. */
export function toEffectsTier(tier: PerfTier): EffectsTier {
  return tier === 'low' ? 'lite' : 'full'
}

/** 기존 2티어 → 3티어. 'full' 은 mid/high 를 구분할 근거가 없어 상한인 'high' 로 올린다. */
export function fromEffectsTier(tier: EffectsTier): PerfTier {
  return tier === 'lite' ? 'low' : 'high'
}
