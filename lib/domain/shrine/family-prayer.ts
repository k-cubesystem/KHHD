/**
 * 가족 기도 액자(祈禱 額子) — 백일기도 v2 (CEO 2026-08-25 «너무 어렵고 복잡해» 재기획).
 *
 * 구 백일기도는 서약·스냅샷·휴면·갈무리·트로피의 5개념 체계였다. v2 는 하나다:
 * **가족을 골라 기도를 올리면, 그 글이 신당 벽 — 가족 선반장 위쪽 — 의 액자에 걸린다.**
 *
 * 저장은 기존 `shrine_wishes` 를 그대로 쓴다(wish_text + family_member_id + is_owner_wish 가
 * 이미 있다 — 새 테이블·마이그레이션 0). 기원(devotion) 적립·복 포인트도 addWish 가 종전
 * 규칙대로 잇는다. 구 서약 체계(shrine_vows·트로피·완주 RPC)는 **UI 만 물러났다** — 지급된
 * 트로피·아이템·DB 행이 살아 있으므로 서버 코드는 재개 레버로 남긴다(rituals.ts).
 *
 * 전 함수 순수(side-effect 0) — 액자 «어디에 무엇을 거는가»는 전부 여기서 판정한다.
 * 렌더(PrayerBoard)는 이 결과를 그리기만 한다.
 */

import { hallSeatKey } from './family-hall-layout'

/**
 * 기도문 길이 — 액자에 «글로» 걸리는 것이 목적이라 짧게 강제한다(길면 액자가 아니라 문서다).
 * 하한 5는 저장 경로(addWish 의 WISH_TOO_SHORT 판정)와 같아야 한다 — 화면이 통과시킨 글을
 * 서버가 반려하면 사용자는 이유를 알 수 없다.
 */
export const PRAYER_MIN_LEN = 5
export const PRAYER_MAX_LEN = 40

/** 서버(getFamilyPrayers)가 내려주는 한 줄 — 대상별 **최신** 기도. */
export interface FamilyPrayer {
  /** null = 본인을 위한 기도 */
  memberId: string | null
  /** 대상 이름(서버가 family_members 에서 해석, 본인은 '나') */
  name: string
  text: string
  createdAt: string
}

/**
 * 기도 현판(懸板) — 벽 **상단, 금줄 위 빈 띠**에 걸리는 **한 장의 긴 액자** (CEO 2026-08-25 2차).
 *
 * 1차(선반별 소형 액자 · 유닛 x 정렬)는 실기기 검수에서 반려됐다 — «상단에, 끈(금줄) 위쪽
 * 빈 벽에, 길게». 그래서 액자는 유닛과 **무관해졌다**: 자리는 상수 하나가 정하고, 여러 기도는
 * 한 현판 안에서 갈아든다(교차 페이드 — 렌더 몫).
 *
 * 기하 근거(세계 %):
 *  · 금줄은 테마 벽화에 그려진 것이라 y 를 코드로 알 수 없다 — 실측(반가·서낭 스크린샷)으로
 *    걸이점이 y≈20 이라, 현판 하단을 17.5 에서 끊으면 어느 테마에서도 줄을 덮지 않는다.
 *  · 가로는 **왼벽(가족 선반장 무리 2.6~33.85) 위**를 길게 덮는다 — 초기 카메라 화면(한 화면
 *    = 세계 31.25%)에 통째로 들어오는 폭이다. 오른쪽 끝 33.2 는 제단 틀의 폰 좌단(37.5)에
 *    닿지 않는다(신위를 가리지 않는 것이 상한).
 */
export interface PrayerBoardBox {
  /** 현판 중심 x (세계 %) */
  x: number
  top: number
  w: number
  h: number
}

/** 와이드 무대(세계 폭 320) — 왼벽 가족 구역 위 긴 현판. */
export const PRAYER_BOARD_WIDE: PrayerBoardBox = Object.freeze({ x: 18.2, top: 7.5, w: 30, h: 10 })

/** 단일 무대(폭 100) 폴백 — 벽 상단 중앙. 와이드 시드가 없는 테마도 현판은 갖는다. */
export const PRAYER_BOARD_NARROW: PrayerBoardBox = Object.freeze({ x: 50, top: 6, w: 72, h: 12 })

export function prayerBoardBox(wide: boolean): PrayerBoardBox {
  return wide ? PRAYER_BOARD_WIDE : PRAYER_BOARD_NARROW
}

/**
 * 소유자 소원 행들 → **대상별 최신 1건**.
 *
 * 입력은 최신순 정렬을 가정하지 않는다 — createdAt 으로 직접 비교한다(서버 쿼리의 정렬 옵션이
 * 바뀌어도 화면이 틀리지 않게). 같은 대상의 옛 기도는 현판에서 내려간다(교체이지 축적이 아니다 —
 * 축적은 소원 기록(방명록 로그)이 이미 지고 있는 몫이다).
 */
export function latestPrayerPerTarget(rows: readonly FamilyPrayer[]): FamilyPrayer[] {
  const byTarget = new Map<string, FamilyPrayer>()
  for (const row of rows) {
    if (!row.text.trim()) continue
    const key = hallSeatKey(row.memberId)
    const prev = byTarget.get(key)
    if (!prev || row.createdAt > prev.createdAt) byTarget.set(key, row)
  }
  return [...byTarget.values()]
}

/**
 * 현판에 갈아들 순서 — 대상별 최신 1건을 **새 기도부터**. 갓 올린 기도가 첫 장으로 걸려야
 * 「올리면 벽에 걸린다」는 인과가 눈에 보인다(옛 기도부터 돌면 방금 쓴 글이 안 보여 실패로 읽힌다).
 */
export function orderPrayersForBoard(rows: readonly FamilyPrayer[]): FamilyPrayer[] {
  return latestPrayerPerTarget(rows).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

/** 기도문 검증 — 시트·서버가 같은 기준을 쓴다(화면 통과·서버 반려의 갈라짐 방지). */
export function validatePrayerText(raw: string): { ok: true; text: string } | { ok: false; error: string } {
  const text = raw.trim()
  if (text.length < PRAYER_MIN_LEN) return { ok: false, error: `기도문을 ${PRAYER_MIN_LEN}자 이상 적어 주세요` }
  if (text.length > PRAYER_MAX_LEN) return { ok: false, error: `기도문은 ${PRAYER_MAX_LEN}자까지 담을 수 있습니다` }
  return { ok: true, text }
}
