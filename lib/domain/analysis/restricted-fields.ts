/**
 * 풀이 화면에 싣지 않는 칸 — 투자 권유와 건강 진단(2026-09-29 대표 결정).
 *
 * 새 풀이는 지시문에서 이 칸을 요구하지 않는다(`app/actions/ai/cheonjiin.ts`). 예전 저장본에는
 * 남아 있으므로 화면이 한 번 더 거른다 — 사주 풀이 화면과 천지인·기록 화면이 같은 기준을 쓴다.
 */
const RESTRICTED_HEALTH_KEYS = ['overall', 'weakOrgans', 'warningPeriod'] as const

/**
 * 건강 칸에서 진단 성격의 값(전체 건강 상태·취약 장기·주의 시기)을 뺀다.
 * 문자열 하나로 저장된 옛 건강 칸은 통째로 진단 문장이라 싣지 않는다.
 * 남는 것이 없으면 undefined — 화면이 빈 칸을 그리지 않게.
 */
export function withoutRestrictedHealth(health: unknown): Record<string, unknown> | undefined {
  if (!health || typeof health !== 'object' || Array.isArray(health)) return undefined
  const kept = Object.fromEntries(
    Object.entries(health).filter(([key]) => !(RESTRICTED_HEALTH_KEYS as readonly string[]).includes(key))
  )
  return Object.keys(kept).length > 0 ? kept : undefined
}
