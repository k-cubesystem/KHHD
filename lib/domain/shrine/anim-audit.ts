/**
 * 연출 계측 — **클래스는 붙었는데 안 도는 것**을 찾는다.
 *
 * 지금 게이트(scripts/check-animation-css.mjs)는 빌드 산출물에 규칙이 실재하는지까지만 본다.
 * 그것만으로는 부족하다는 걸 두 번 배웠다:
 *   · 2026-07-30 — styled-jsx 로 넣은 CSS 가 산출물에 한 줄도 안 실렸다. DOM 에 클래스는 붙고
 *     콘솔은 조용해서 배포 내내 무증상으로 죽어 있었다.
 *   · 헤드리스 프리뷰는 compositing 을 안 해서 rAF·애니메이션이 아예 안 돈다 — 죽은 걸 못 본다.
 *
 * 그래서 판정을 뒤집었다. "이 이름이 돌아야 한다"는 고정 목록을 두지 않는다 —
 * **화면에 그 클래스를 단 요소가 있는가**를 먼저 보고, 있을 때만 "그런데 안 돈다"를 사고로 친다.
 * 배치가 없어서 안 도는 것과, CSS 가 없어서 안 도는 것은 전혀 다른 일이다.
 */

/** 계측 대상 — 신당 계열의 **상시(infinite)** 연출 클래스. CSS 원본과의 대조는 테스트가 한다. */
export const SHRINE_ANIM_CLASSES: readonly string[] = Object.freeze([
  // 무대 idle
  'shrine-idle-sway',
  'shrine-idle-wallsway',
  'shrine-idle-breathe',
  'shrine-idle-glow',
  'shrine-glow-breathe',
  // 좌정 신위
  'deity-stand',
  // 거니는 신당지기
  'shrine-keeper-wander',
  'shrine-keeper-bob',
  'shrine-keeper-tread',
  'shrine-keeper-face',
  // 배치 앵커 · 창방 팻말
  'shrine-anchor-ring',
  'shrine-plaque-glow',
  // 가족 사랑방
  'fh-flicker',
  'fh-bloom',
  // 시렁 축복 · 팻말 처마 등
  'shelf-blessed-aura',
  'shrine-plaque-ember',
])

/** 한 클래스에 대한 관측값 — DOM 을 모르는 순수 함수가 받도록 숫자만 담는다. */
export interface ClassProbe {
  readonly className: string
  /** 화면에 이 클래스를 단 요소가 몇 개인가 */
  readonly nodes: number
  /** 그중 실제로 애니메이션이 돌고 있는 요소가 몇 개인가 */
  readonly animated: number
}

export interface AnimAuditResult {
  /** 클래스는 붙었는데 **하나도 안 돈다** — 이게 사고다 */
  readonly dead: string[]
  /** 붙었고 돈다 */
  readonly alive: string[]
  /** 일부만 돈다 — 조건부 요소가 섞였을 수 있어 사고로 치지 않고 눈에만 띄게 한다 */
  readonly partial: string[]
  /** 화면에 없다 — 배치·상태 때문이지 연출이 죽은 게 아니다. 판정하지 않는다 */
  readonly absent: string[]
}

/**
 * 관측값을 넷으로 가른다.
 *
 * ⚠️ `absent` 를 사고로 치지 않는 것이 이 함수의 전부다. 화면에 없는 것을 죽었다고 하면 경보가
 *    상시로 울리고, 상시로 울리는 경보는 아무도 안 본다 — 그러면 진짜가 왔을 때도 안 본다.
 */
export function auditProbes(probes: readonly ClassProbe[]): AnimAuditResult {
  const dead: string[] = []
  const alive: string[] = []
  const partial: string[] = []
  const absent: string[] = []

  for (const p of probes) {
    const nodes = Math.max(0, Math.floor(p.nodes))
    const animated = Math.min(nodes, Math.max(0, Math.floor(p.animated)))
    if (nodes === 0) absent.push(p.className)
    else if (animated === 0) dead.push(p.className)
    else if (animated < nodes) partial.push(p.className)
    else alive.push(p.className)
  }

  return { dead, alive, partial, absent }
}

/** 배지에 적을 한 줄. 죽은 게 있으면 그것부터 말한다. */
export function auditSummary(r: AnimAuditResult): string {
  if (r.dead.length > 0) return `연출 ${r.dead.length}종이 죽어 있음`
  const seen = r.alive.length + r.partial.length
  if (seen === 0) return '화면에 상시 연출이 없음'
  return `연출 ${seen}종 구동 중`
}
