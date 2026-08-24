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
import type { FamilyShelfUnit } from './family-shelf'

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

/** 액자 하나 — 세계(stageContent) % 좌표. */
export interface PrayerFrameBox {
  /** hallSeatKey(memberId) — React key 겸 유닛 대응 */
  key: string
  name: string
  text: string
  /** 액자 중심 x (세계 %) */
  x: number
  /** 상자 기하 (세계 %) */
  top: number
  w: number
  h: number
  /** 살짝 기운 각도(도) — 손으로 건 액자의 온기. 결정론(순번 파생)이라 SSR 과 어긋나지 않는다 */
  tilt: number
}

/** 액자 폭 — 유닛(6.8)보다 살짝 넓게. 겹침 없는 유닛 간격(8.15)보다 좁아 이웃 액자와 안 닿는다. */
const FRAME_W = 8
/** 액자 높이(세계 세로 %) — 기도 3줄 + 이름 한 줄. */
const FRAME_H = 13
/** 액자 하단과 선반장 천판 사이 숨통(세계 세로 %). */
const FRAME_GAP = 2

/**
 * 유닛이 없을 때(비 FAMILY 등급·좁은 무대)의 폴백 자리 — **왼벽 상단**.
 * 중앙(x 50)은 제단 틀(폰에서 x 37.5~62.5)의 자리라 액자가 신위를 가린다 — 왼벽이 빈 벽이다.
 */
const FALLBACK_FRAME: Omit<PrayerFrameBox, 'key' | 'name' | 'text'> = {
  x: 18,
  top: 24,
  w: 20,
  h: 15,
  tilt: 0,
}

/**
 * 소유자 소원 행들 → **대상별 최신 1건**.
 *
 * 입력은 최신순 정렬을 가정하지 않는다 — createdAt 으로 직접 비교한다(서버 쿼리의 정렬 옵션이
 * 바뀌어도 화면이 틀리지 않게). 같은 대상의 옛 기도는 액자에서 내려간다(교체이지 축적이 아니다 —
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
 * 기도 → 액자 상자. 원칙: **가족 자신의 선반장 바로 위**에 건다(CEO «가족들 상단 위쪽 벽에»).
 *
 * · 대상의 유닛이 있으면 그 유닛 x 에 정렬해 선반 천판 위(top − gap − h)에 건다.
 * · 유닛이 하나도 없으면(비 FAMILY·좁은 무대) 최신 기도 **1장**만 중앙 폴백 자리에 건다 —
 *   여러 장을 한 점에 겹쳐 걸면 종잇장 더미가 된다.
 * · 유닛이 있는데 대상 유닛만 없으면(가족 7번째 이후·삭제된 가족) 그 기도는 걸지 않는다 —
 *   주인 없는 액자를 임의 자리에 지어내지 않는다(기록은 소원 로그에 남아 있다).
 */
export function buildPrayerFrames(
  prayers: readonly FamilyPrayer[],
  units: readonly FamilyShelfUnit[]
): PrayerFrameBox[] {
  const latest = latestPrayerPerTarget(prayers)
  if (latest.length === 0) return []

  if (units.length === 0) {
    const newest = latest.reduce((a, b) => (b.createdAt > a.createdAt ? b : a))
    return [
      {
        ...FALLBACK_FRAME,
        key: hallSeatKey(newest.memberId),
        name: newest.name,
        text: newest.text,
      },
    ]
  }

  const frames: PrayerFrameBox[] = []
  for (const prayer of latest) {
    const key = hallSeatKey(prayer.memberId)
    const unit = units.find((u) => u.key === key)
    if (!unit) continue
    frames.push({
      key,
      name: prayer.name,
      text: prayer.text,
      x: unit.x,
      top: unit.top - FRAME_GAP - FRAME_H,
      w: FRAME_W,
      h: FRAME_H,
      // 순번 파생 기울기(-0.8·0·+0.8 순환) — Math.random 은 SSR 불일치라 금지
      tilt: [-0.8, 0, 0.8][frames.length % 3],
    })
  }
  return frames
}

/** 기도문 검증 — 시트·서버가 같은 기준을 쓴다(화면 통과·서버 반려의 갈라짐 방지). */
export function validatePrayerText(raw: string): { ok: true; text: string } | { ok: false; error: string } {
  const text = raw.trim()
  if (text.length < PRAYER_MIN_LEN) return { ok: false, error: `기도문을 ${PRAYER_MIN_LEN}자 이상 적어 주세요` }
  if (text.length > PRAYER_MAX_LEN) return { ok: false, error: `기도문은 ${PRAYER_MAX_LEN}자까지 담을 수 있습니다` }
  return { ok: true, text }
}
