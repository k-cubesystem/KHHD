/**
 * 기도 현판(백일기도 v2 · 2차 «상단에 길게») — «무엇이 어떤 순서로 걸리는가» 판정.
 *
 * 지키는 것 셋:
 *  ① 대상별 **최신 1건**만 걸린다(교체이지 축적이 아니다 — 축적은 소원 로그의 몫).
 *  ② 갈아드는 순서는 **새 기도부터** — 방금 올린 글이 첫 장이어야 인과가 보인다.
 *  ③ 현판 상자는 금줄 위 빈 띠에 있고(하단 ≤ 20) 제단 틀(폰 좌단 37.5)을 침범하지 않는다.
 */
import {
  latestPrayerPerTarget,
  orderPrayersForBoard,
  prayerBoardBox,
  validatePrayerText,
  PRAYER_BOARD_WIDE,
  PRAYER_BOARD_NARROW,
  PRAYER_MAX_LEN,
  type FamilyPrayer,
} from '../family-prayer'

const P = (memberId: string | null, text: string, createdAt: string, name = '가족'): FamilyPrayer => ({
  memberId,
  name: memberId === null ? '나' : name,
  text,
  createdAt,
})

describe('latestPrayerPerTarget — 대상별 최신 1건', () => {
  it('같은 대상의 옛 기도는 내려간다 (입력 정렬을 가정하지 않는다)', () => {
    const rows = [
      P('fam-1', '옛 기도', '2026-08-01T00:00:00Z'),
      P('fam-1', '새 기도', '2026-08-25T00:00:00Z'),
      P(null, '나의 기도', '2026-08-10T00:00:00Z'),
    ]
    const latest = latestPrayerPerTarget(rows)
    expect(latest).toHaveLength(2)
    expect(latest.find((r) => r.memberId === 'fam-1')?.text).toBe('새 기도')
  })

  it('빈 기도문은 버린다', () => {
    expect(latestPrayerPerTarget([P(null, '   ', '2026-08-25T00:00:00Z')])).toHaveLength(0)
  })
})

describe('orderPrayersForBoard — 새 기도가 첫 장', () => {
  it('대상별 최신 1건을 최신순으로 늘어놓는다', () => {
    const rows = [
      P('fam-1', '옛 기도', '2026-08-01T00:00:00Z', '어머니'),
      P(null, '나의 기도', '2026-08-10T00:00:00Z'),
      P('fam-2', '방금 올린 기도', '2026-08-25T09:00:00Z', '아들'),
      P('fam-1', '어머니 새 기도', '2026-08-24T00:00:00Z', '어머니'),
    ]
    const pages = orderPrayersForBoard(rows)
    expect(pages.map((r) => r.text)).toEqual(['방금 올린 기도', '어머니 새 기도', '나의 기도'])
  })
})

describe('prayerBoardBox — 현판의 자리', () => {
  it('와이드: 금줄 걸이점(실측 y≈20) 위에서 끝나고 제단 틀(폰 좌단 37.5)에 닿지 않는다', () => {
    const b = prayerBoardBox(true)
    expect(b).toBe(PRAYER_BOARD_WIDE)
    expect(b.top + b.h).toBeLessThanOrEqual(20)
    expect(b.x + b.w / 2).toBeLessThan(37.5)
    expect(b.x - b.w / 2).toBeGreaterThanOrEqual(0)
  })

  it('와이드: 한 화면(세계 31.25%)에 통째로 들어온다 — 카메라를 밀어야 보이는 현판은 없느니만 못하다', () => {
    const b = prayerBoardBox(true)
    expect(b.w).toBeLessThanOrEqual(31.25)
  })

  it('단일 무대 폴백은 중앙 상단', () => {
    const b = prayerBoardBox(false)
    expect(b).toBe(PRAYER_BOARD_NARROW)
    expect(b.x).toBe(50)
    expect(b.top + b.h).toBeLessThanOrEqual(20)
  })
})

describe('validatePrayerText — 화면과 저장 경로가 같은 기준', () => {
  it('5자 미만은 반려한다 (addWish 의 WISH_TOO_SHORT 와 같은 하한)', () => {
    expect(validatePrayerText('넷글자').ok).toBe(false)
    expect(validatePrayerText('다섯글자다').ok).toBe(true)
  })

  it('상한을 넘으면 반려하고, 앞뒤 공백은 걷는다', () => {
    expect(validatePrayerText('가'.repeat(PRAYER_MAX_LEN + 1)).ok).toBe(false)
    const r = validatePrayerText('  건강하세요  ')
    expect(r).toEqual({ ok: true, text: '건강하세요' })
  })
})
