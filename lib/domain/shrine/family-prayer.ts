/**
 * 백일기도(百日祈禱) — 신당 벽에 기도를 거는 의식. v3 (CEO 2026-08-25).
 *
 * ── 계보 ──────────────────────────────────────────────────────────────────────
 * v1  서약·스냅샷·휴면·갈무리·트로피의 5개념 체계 → «너무 어렵고 복잡해»로 폐기.
 * v2  «가족을 골라 기도를 올리면 신당 벽 액자에 걸린다» 한 문장으로 축약.
 * v3  **백 일의 서사를 되돌린다** — 다만 규칙이 아니라 **개수**로. 기도 한 편이 하루치이고,
 *     백 편을 채우는 것이 백일기도다. 놓친 날·끊긴 날·실패가 없다(v1 이 무거웠던 이유).
 *
 * ── v3 가 정한 것 ────────────────────────────────────────────────────────────
 *  · 액자에는 **한 편만** 걸린다. 기본은 최신 기도이고, 지난 기도를 골라 걸 수도 있다.
 *    🔴 v2 의 «여러 편이 번갈아 뜨는» 자동 순환은 걷어 냈다(CEO 3차 «랜덤으로 나오는 건 없애줘»).
 *      되살리지 말 것 — 벽에 걸린 글이 저 혼자 바뀌면 «내가 건 글»이 아니게 된다.
 *  · 기도는 **100편까지** 쌓인다(멤버십 전용 공간이라 상한을 넉넉히 둔다). 넘치면 가장 오래된
 *    것부터 물러난다 — 기록 보관 상한(storage_limit)과 같은 규약이라 «평생 보관»으로 읽히지 않는다.
 *  · 목록은 한 쪽에 10편, 쪽 번호로 넘긴다(최대 10쪽).
 *
 * ⚠️ 문구는 **의료·심리 효능을 주장하지 않는다**(표시광고법 L-트랙). 백일기도는 전통 의식이고,
 *    이 화면이 약속하는 것은 «마음을 한 곳에 모으는 일»까지다 — 그 이상을 적지 말 것.
 *    금지 어휘 회귀는 __tests__/family-prayer.test.ts 가 막는다.
 *
 * 전 함수 순수(side-effect 0). 저장은 기존 `shrine_wishes` 를 그대로 쓴다(새 테이블 0).
 */

/** 기도문 길이 — 액자에 «글로» 걸리는 것이 목적이라 짧게 강제한다(길면 액자가 아니라 문서다). */
export const PRAYER_MIN_LEN = 5
export const PRAYER_MAX_LEN = 40

/** 백일 — 기도 한 편이 하루치다. 이 수를 채우는 것이 백일기도의 전부다. */
export const PRAYER_TARGET_COUNT = 100

/** 보관 상한 = 목표와 같다. 넘치면 가장 오래된 기도부터 물러난다. */
export const PRAYER_MAX_SAVED = PRAYER_TARGET_COUNT

/** 목록 한 쪽에 담는 기도 수. 10편 × 10쪽 = 100편. */
export const PRAYER_PAGE_SIZE = 10

/** 화면 이름 — 「기도 올리기」가 아니라 백 일의 이름을 쓴다(CEO 2026-08-25). */
export const PRAYER_TITLE = '100일기도 올리기'

/**
 * 백일기도가 무엇이고 왜 하는가 — 시트 상단에 그대로 나가는 문안.
 *
 * ⚠️ 효험·치유·운수 상승을 **약속하지 않는다.** 전해 오는 방식과 그 방식이 사람에게 하는 일
 *    (마음을 모으고, 쌓인 것을 눈으로 보게 하는 것)까지만 적는다.
 */
export const PRAYER_INTRO_LINES: readonly string[] = Object.freeze([
  '백일기도는 백 일 동안 같은 마음을 되풀이해 올리는 우리 전통의 기도법입니다.',
  '한 번의 간절함보다 **매일 이어 가는 정성**을 귀하게 여겨 온 방식이지요.',
])

/** 「왜 백 일인가」 — 이유를 세 줄로. 각 줄은 [소제목, 본문]. */
export const PRAYER_REASONS: readonly (readonly [string, string])[] = Object.freeze([
  ['하루 한 편', '기도 한 편이 하루치입니다. 오늘 마음을 한 줄로 적어 올리면 그날의 정성이 쌓입니다.'] as const,
  ['백 편이 백 일', '백 편을 채우면 백일기도를 마칩니다. 놓친 날을 벌하지 않으니 끊겨도 이어 가면 됩니다.'] as const,
  [
    '벽에 걸어 두기',
    '올린 기도 중 한 편을 신당 벽에 겁니다. 오갈 때마다 눈에 들어와 마음이 흩어지지 않습니다.',
  ] as const,
])

/** 법무 고지 — 효능이 아니라 전통 의식임을 명시한다(액막이·오방기와 같은 기준). */
export const PRAYER_DISCLAIMER = '재미로 즐기는 전통 의식 놀이입니다. 의학적·심리적 상담을 대신하지 않습니다.'

/** 서버가 내려주는 기도 한 편. */
export interface FamilyPrayer {
  /** shrine_wishes.id — 액자에 걸 대상을 지목하는 키 */
  id: string
  /** null = 본인을 위한 기도 */
  memberId: string | null
  /** 대상 이름(서버가 family_members 에서 해석, 본인은 '나') */
  name: string
  text: string
  createdAt: string
}

/** 액자 상자 — **방(뷰포트) % 좌표**. 카메라(두루마리 팬)와 무관하게 화면에 고정된다. */
export interface PrayerBoardBox {
  x: number
  top: number
  w: number
  h: number
}

/**
 * 액자의 자리 — 방 상단 중앙, **카메라 밖**.
 *
 * 🔴 v3.1 (2026-08-25 저녁): 세계(stageContent) 좌표 x18.2(왼벽 선반 위)에서 **뷰포트 고정**으로
 *    옮겼다. CEO 「자리가 잘 잡았었는데 왼쪽으로 밀렸어」의 뿌리 — 세계 좌표에 박힌 액자는
 *    두루마리 카메라가 어디를 보느냐에 따라 화면에서 좌우로 밀리고, 진입 화면(제단 중앙)에서는
 *    아예 보이지 않았다. 가훈 현판처럼 «이 집의 기도»는 어느 벽을 보고 있어도 걸려 있는 것이
 *    맞다 — 그래서 카메라 컨테이너 **밖**(방 직속)에 건다. 세계 좌표로 되돌리지 말 것.
 *
 * 기하 근거(방 %):
 *  · 상단 y3~11 — 방 안 상단의 「꾸미기」 칩(좌)·「소원」 배지(우)와 같은 띠라, 폭을 60으로 좁혀
 *    좌우 20%씩을 그 둘에게 남긴다(x20~80 — 칩·배지와 가로로 겹치지 않는 실측 경계).
 *  · 하단 11 — 제단 틀 지붕 꼭대기(y≈10.4)와 사실상 같은 줄이라 지붕을 덮지 않는다.
 */
export const PRAYER_BOARD_VIEW: PrayerBoardBox = Object.freeze({ x: 50, top: 3, w: 60, h: 8 })

export function prayerBoardBox(): PrayerBoardBox {
  return PRAYER_BOARD_VIEW
}

/** 최신순 정렬 — 입력의 정렬을 가정하지 않는다(서버 쿼리 옵션이 바뀌어도 화면이 틀리지 않게). */
export function sortPrayersNewestFirst(rows: readonly FamilyPrayer[]): FamilyPrayer[] {
  return rows.filter((r) => r.text.trim().length > 0).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

/**
 * 액자에 걸릴 **한 편**.
 *
 * 고른 기도가 있으면 그것, 없거나(미지정) 그 기도가 사라졌으면 **최신 기도**로 되돌아간다 —
 * 액자가 빈 채로 남는 상태를 만들지 않는다(100편 상한으로 오래된 기도가 물러날 때의 안전판).
 */
export function selectBoardPrayer(
  rows: readonly FamilyPrayer[],
  featuredId: string | null | undefined
): FamilyPrayer | null {
  const sorted = sortPrayersNewestFirst(rows)
  if (sorted.length === 0) return null
  if (featuredId) {
    const picked = sorted.find((r) => r.id === featuredId)
    if (picked) return picked
  }
  return sorted[0]
}

export interface PrayerProgress {
  /** 지금까지 올린 기도 편수(= 쌓인 날수) */
  count: number
  /** 목표 편수(100) */
  target: number
  /** 0~100 정수 */
  percent: number
  /** 백 편까지 남은 수 */
  remaining: number
  /** 백 편을 채웠는가 */
  complete: boolean
}

/** 진행도 — 편수 하나에서 파생한다. 상한을 넘겨도 100%를 넘지 않는다. */
export function prayerProgress(count: number): PrayerProgress {
  const safe = Math.max(0, Math.floor(count))
  const capped = Math.min(safe, PRAYER_TARGET_COUNT)
  return {
    count: safe,
    target: PRAYER_TARGET_COUNT,
    percent: Math.round((capped / PRAYER_TARGET_COUNT) * 100),
    remaining: Math.max(0, PRAYER_TARGET_COUNT - safe),
    complete: safe >= PRAYER_TARGET_COUNT,
  }
}

/** 전체 쪽수 — 0편이면 1쪽(빈 쪽을 그린다). */
export function prayerPageCount(total: number): number {
  return Math.max(1, Math.ceil(Math.max(0, total) / PRAYER_PAGE_SIZE))
}

/** 기도문 검증 — 시트·서버가 같은 기준을 쓴다(화면 통과·서버 반려의 갈라짐 방지). */
export function validatePrayerText(raw: string): { ok: true; text: string } | { ok: false; error: string } {
  const text = raw.trim()
  if (text.length < PRAYER_MIN_LEN) return { ok: false, error: `기도문을 ${PRAYER_MIN_LEN}자 이상 적어 주세요` }
  if (text.length > PRAYER_MAX_LEN) return { ok: false, error: `기도문은 ${PRAYER_MAX_LEN}자까지 담을 수 있습니다` }
  return { ok: true, text }
}
