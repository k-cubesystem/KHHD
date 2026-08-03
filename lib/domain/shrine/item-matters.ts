/**
 * 신물이 어느 기도에 좋은가 — 카탈로그의 `matters` 를 읽고 쓰는 자리.
 *
 * 갈래는 오방기 문복의 7종을 **그대로 쓴다**(신수·재수·관재·혼사·터·몸·자손). 새로 만들지 않은
 * 이유가 있다 — 사용자가 오방기에서 "재수를 여쭙니다"라고 고른 그 말과, 상점에서 "재수에 좋은
 * 물건"이라고 읽는 그 말이 **같아야** 두 화면이 한 세계로 읽힌다.
 *
 * ⚠️ 문자열이 세 곳에 산다: 이 파일이 참조하는 obangki.ts, DB CHECK 제약, 그리고 카탈로그 행.
 *    셋이 어긋나면 조용히 빈 배열이 되어 "아무 기도에도 안 좋은 물건"이 된다 — 테스트가 대조한다.
 */

import { OBANGKI_MATTERS, OBANGKI_MATTER_INFO, type ObangkiMatter } from '@/lib/domain/ritual/obangki'

export function isObangkiMatter(v: unknown): v is ObangkiMatter {
  return typeof v === 'string' && (OBANGKI_MATTERS as readonly string[]).includes(v)
}

/** DB 의 text[] 를 갈래 배열로. 모르는 값은 조용히 버린다(화면이 깨지는 것보다 낫다). */
export function parseMatters(v: unknown): ObangkiMatter[] {
  if (!Array.isArray(v)) return []
  const out: ObangkiMatter[] = []
  for (const item of v) if (isObangkiMatter(item) && !out.includes(item)) out.push(item)
  return out
}

/** 「재수 · 터」처럼 한 줄로. 빈 배열이면 갈래를 가리지 않는 물건이다. */
export function mattersLabel(matters: readonly ObangkiMatter[]): string {
  if (matters.length === 0) return '두루'
  return matters.map((m) => OBANGKI_MATTER_INFO[m].label).join(' · ')
}

/**
 * 이 갈래로 기도할 때 쓸 만한 물건인가.
 *
 * ⚠️ 갈래가 빈 물건(병풍·기억의 함처럼 자리를 갖추는 것)은 **어느 갈래에도 걸린다**. 두루 쓰는
 *    물건을 "아무 데도 안 맞는 물건"으로 떨어뜨리면 상점에서 영영 안 보인다.
 */
export function suitsMatter(matters: readonly ObangkiMatter[], matter: ObangkiMatter): boolean {
  return matters.length === 0 || matters.includes(matter)
}
