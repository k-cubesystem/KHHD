/**
 * 백일기도 v3 — 「무엇이 액자에 걸리는가 · 백 일을 어떻게 세는가」 판정.
 *
 * 지키는 것 넷:
 *  ① 액자에는 **한 편**만 걸린다 — 고른 편, 없으면 최신 편. 자동 순환은 폐지됐다.
 *  ② 고른 편이 사라져도 액자는 비지 않는다(최신으로 되돌아간다) — 100편 상한 정리의 안전판.
 *  ③ 백 일은 **편수**로 센다. 상한을 넘겨도 100%를 넘지 않는다.
 *  ④ 문안이 의료·심리 효능을 주장하지 않는다(표시광고법 L-트랙).
 */
import {
  PRAYER_DISCLAIMER,
  PRAYER_INTRO_LINES,
  PRAYER_MAX_LEN,
  PRAYER_MAX_SAVED,
  PRAYER_PAGE_SIZE,
  PRAYER_REASONS,
  PRAYER_TARGET_COUNT,
  PRAYER_BOARD_NARROW,
  PRAYER_BOARD_WIDE,
  prayerBoardBox,
  prayerPageCount,
  prayerProgress,
  selectBoardPrayer,
  sortPrayersNewestFirst,
  validatePrayerText,
  type FamilyPrayer,
} from '../family-prayer'

const P = (id: string, text: string, createdAt: string, memberId: string | null = null): FamilyPrayer => ({
  id,
  memberId,
  name: memberId === null ? '나' : '어머니',
  text,
  createdAt,
})

const ROWS = [
  P('w1', '먼저 올린 기도', '2026-08-01T00:00:00Z'),
  P('w2', '가운데 기도', '2026-08-10T00:00:00Z', 'fam-1'),
  P('w3', '가장 새 기도', '2026-08-25T00:00:00Z'),
]

describe('selectBoardPrayer — 액자에 걸리는 한 편', () => {
  it('고른 편이 있으면 그 편이 걸린다 (지난 기도도 걸 수 있다)', () => {
    expect(selectBoardPrayer(ROWS, 'w1')?.text).toBe('먼저 올린 기도')
  })

  it('고른 적이 없으면 최신 편이 걸린다', () => {
    expect(selectBoardPrayer(ROWS, null)?.id).toBe('w3')
  })

  it('고른 편이 사라졌으면 최신 편으로 되돌아간다 — 액자가 비지 않는다', () => {
    expect(selectBoardPrayer(ROWS, '사라진-id')?.id).toBe('w3')
  })

  it('기도가 없으면 걸 것이 없다(null)', () => {
    expect(selectBoardPrayer([], null)).toBeNull()
  })

  it('빈 기도문은 후보에서 빠진다', () => {
    expect(selectBoardPrayer([P('w9', '   ', '2026-08-26T00:00:00Z')], null)).toBeNull()
  })
})

describe('sortPrayersNewestFirst — 입력 정렬을 가정하지 않는다', () => {
  it('최신순으로 세운다', () => {
    expect(sortPrayersNewestFirst(ROWS).map((r) => r.id)).toEqual(['w3', 'w2', 'w1'])
  })
})

describe('prayerProgress — 백 일은 편수로 센다', () => {
  it('한 편이 하루치다', () => {
    const p = prayerProgress(37)
    expect(p).toMatchObject({ count: 37, target: 100, percent: 37, remaining: 63, complete: false })
  })

  it('백 편이면 완주', () => {
    expect(prayerProgress(PRAYER_TARGET_COUNT).complete).toBe(true)
  })

  it('상한을 넘겨도 100%를 넘지 않고 남은 수는 0이다', () => {
    const p = prayerProgress(150)
    expect(p.percent).toBe(100)
    expect(p.remaining).toBe(0)
  })

  it('음수·소수는 정수로 다듬는다', () => {
    expect(prayerProgress(-5).count).toBe(0)
    expect(prayerProgress(3.7).count).toBe(3)
  })
})

describe('prayerPageCount — 10편씩 · 최대 10쪽', () => {
  it('보관 상한이면 정확히 10쪽이다', () => {
    expect(PRAYER_MAX_SAVED).toBe(PRAYER_TARGET_COUNT)
    expect(prayerPageCount(PRAYER_MAX_SAVED)).toBe(PRAYER_MAX_SAVED / PRAYER_PAGE_SIZE)
  })

  it('한 편만 넘어도 쪽이 하나 는다', () => {
    expect(prayerPageCount(PRAYER_PAGE_SIZE)).toBe(1)
    expect(prayerPageCount(PRAYER_PAGE_SIZE + 1)).toBe(2)
  })

  it('0편이어도 빈 쪽 하나는 그린다', () => {
    expect(prayerPageCount(0)).toBe(1)
  })
})

describe('prayerBoardBox — 액자의 자리 (왼쪽 상단 문틀 · CEO 확정 v3.2)', () => {
  it('와이드: 왼벽 위를 길게 덮고 — 금줄(y≈20)·제단 틀 폰 좌단(37.5)을 침범하지 않는다', () => {
    const b = prayerBoardBox(true)
    expect(b).toBe(PRAYER_BOARD_WIDE)
    expect(b.x).toBe(18.2)
    expect(b.top + b.h).toBeLessThanOrEqual(20)
    expect(b.x + b.w / 2).toBeLessThan(37.5)
    expect(b.w).toBeLessThanOrEqual(31.25) // 한 화면에 통째로 든다
  })

  it('단일 무대 폴백은 중앙 상단', () => {
    const b = prayerBoardBox(false)
    expect(b).toBe(PRAYER_BOARD_NARROW)
    expect(b.x).toBe(50)
    expect(b.top + b.h).toBeLessThanOrEqual(20)
  })
})

describe('문안 — 효능을 약속하지 않는다 (표시광고법)', () => {
  const copy = [...PRAYER_INTRO_LINES, ...PRAYER_REASONS.flat(), PRAYER_DISCLAIMER].join(' ')

  it.each(['치유', '완치', '치료', '효험', '반드시', '보장', '기적', '운수대통'])('금지 어휘 «%s» 가 없다', (word) => {
    expect(copy).not.toContain(word)
  })

  it('전통 의식 놀이임을 고지한다', () => {
    expect(PRAYER_DISCLAIMER).toContain('전통 의식')
    expect(PRAYER_DISCLAIMER).toContain('대신하지 않습니다')
  })
})

describe('validatePrayerText — 화면과 저장 경로가 같은 기준', () => {
  it('5자 미만은 반려한다 (addWish 의 WISH_TOO_SHORT 와 같은 하한)', () => {
    expect(validatePrayerText('넷글자').ok).toBe(false)
    expect(validatePrayerText('다섯글자다').ok).toBe(true)
  })

  it('상한을 넘으면 반려하고, 앞뒤 공백은 걷는다', () => {
    expect(validatePrayerText('가'.repeat(PRAYER_MAX_LEN + 1)).ok).toBe(false)
    expect(validatePrayerText('  건강하세요  ')).toEqual({ ok: true, text: '건강하세요' })
  })
})

/**
 * 「지난 기도 골라 걸기」의 쪽 경계 계약 — 목록과 벽이 서로 다른 말을 하던 사고 잠금.
 *
 * 화면은 최신 10편(쪽 0)만 받아 selectBoardPrayer 에 넘겼다. 그래서 3쪽에서 고른
 * 기도는 그 10편 안에 없어 폴백이 걸렸고, 목록은 「걸림」이라 표시하는데 벽에는
 * 최신 기도가 걸렸다. 수복 후에는 getPrayerPage 가 쪽 밖의 고른 편을 따로 실어 보내고
 * 화면이 그것을 우선한다.
 * Regression: /pipeline 2026-08-26 — 로직 리뷰 ⑥.
 */
describe('액자 선택 — 쪽 경계', () => {
  const mk = (id: string, iso: string) => ({
    id,
    memberId: null,
    name: '나',
    text: `기도 ${id}`,
    createdAt: iso,
  })

  it('고른 기도가 이번 쪽 안에 있으면 그것이 걸린다', () => {
    const page = [mk('p3', '2026-08-03'), mk('p2', '2026-08-02'), mk('p1', '2026-08-01')]
    expect(selectBoardPrayer(page, 'p1')?.id).toBe('p1')
  })

  it('🔴 고른 기도가 쪽 밖이면 도메인 함수만으로는 최신으로 폴백한다 — 그래서 화면이 따로 실어 보내야 한다', () => {
    const page = [mk('p3', '2026-08-03'), mk('p2', '2026-08-02')]
    // 'old' 는 3쪽에 있어 이 배열에 없다
    expect(selectBoardPrayer(page, 'old')?.id).toBe('p3')

    // 화면 계약: getPrayerPage 가 채워 준 featuredPrayer 를 우선한다
    const featuredPrayer = mk('old', '2026-05-01')
    const board = featuredPrayer ?? selectBoardPrayer(page, 'old')
    expect(board.id).toBe('old')
  })
})
