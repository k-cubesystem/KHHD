/**
 * 종합사주풀이 대상(target) 해석 — 순수 함수. 화면과 서버액션 사이의 **번역기**다.
 *
 * 🔴 함정: `v_destiny_targets` 의 «본인» 행은 id 가 `profiles.id`(= auth user id)다. 그 id 를
 *    그대로 `?target=` 으로 넘기면 `gatherSamhapInputs` 가 **family_members** 에서 찾다가 못 찾아
 *    생년월일이 통째로 비고(「생년월일 미상 — 명식 계산 불가」) 요건이 영영 안 찬다.
 *    본인은 target 을 **붙이지 않는 것**이 규약이다 — 서버액션은 targetId 없음을 본인으로 읽는다.
 *
 * 관상·손금·풍수 화면도 같은 `target` 파라미터를 읽으므로(여정 `withTarget` 과 동일 규약)
 * 「준비하기」 링크가 선택한 가족을 그대로 데리고 간다.
 */

export type SamhapTargetType = 'self' | 'family'

/** `DestinyTarget` 중 대상 해석에 필요한 두 필드만 — 도메인이 서버액션 타입에 묶이지 않게 한다. */
export interface SamhapTargetLike {
  id: string
  target_type: SamhapTargetType
}

/** 서버액션에 넘길 targetId. 본인이면 undefined. */
export function samhapTargetId(target: SamhapTargetLike | null | undefined): string | undefined {
  if (!target || target.target_type === 'self') return undefined
  return target.id
}

/** `?target=` 쿼리(본인이면 빈 문자열). 링크·URL 동기화가 이 하나만 쓴다. */
export function samhapTargetQuery(target: SamhapTargetLike | null | undefined): string {
  const id = samhapTargetId(target)
  return id ? `?target=${id}` : ''
}

/**
 * 선택 대상 결정 — 쿼리로 지목된 대상이 있으면 그것, 없으면 본인, 본인도 없으면 첫 행.
 *
 * 🔴 목록에 없는 id(남의 대상·지워진 대상)는 **조용히 무시**한다. 사용자가 URL 에 적어 넣은
 *    id 로 조회를 걸지 않는다 — RLS 가 막아 주기 전에 화면이 먼저 안 물어본다.
 */
export function resolveSamhapTarget<T extends SamhapTargetLike>(
  targets: readonly T[],
  wantedId?: string | null
): T | null {
  if (wantedId) {
    const wanted = targets.find((t) => t.id === wantedId)
    if (wanted) return wanted
  }
  return targets.find((t) => t.target_type === 'self') ?? targets[0] ?? null
}
