/**
 * 기도 액자(백일기도 v2) — «어디에 무엇을 거는가» 판정.
 *
 * 지키는 것 셋:
 *  ① 대상별 **최신 1건**만 걸린다(교체이지 축적이 아니다 — 축적은 소원 로그의 몫).
 *  ② 액자는 그 가족의 선반장 **바로 위**에 선다 — 유닛 x 정렬 + 선반 천판 위 숨통.
 *  ③ 유닛이 없으면 최신 1장만 중앙 폴백, 유닛이 있는데 대상 유닛만 없으면 걸지 않는다.
 */
import {
  buildPrayerFrames,
  latestPrayerPerTarget,
  validatePrayerText,
  PRAYER_MAX_LEN,
  type FamilyPrayer,
} from '../family-prayer'
import { buildFamilyShelfUnits } from '../family-shelf'

const P = (memberId: string | null, text: string, createdAt: string, name = '가족'): FamilyPrayer => ({
  memberId,
  name: memberId === null ? '나' : name,
  text,
  createdAt,
})

const UNITS = buildFamilyShelfUnits([
  { memberId: null, name: '나', avatarId: null },
  { memberId: 'fam-1', name: '어머니', avatarId: 'water_dokkaebi' },
  { memberId: 'fam-2', name: '아들', avatarId: 'fire_dokkaebi' },
])

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

describe('buildPrayerFrames — 액자의 자리', () => {
  it('액자는 그 가족 유닛의 x 에 정렬되고 선반 천판보다 위에 선다', () => {
    const frames = buildPrayerFrames([P('fam-1', '건강하게 해 주세요', '2026-08-25T00:00:00Z', '어머니')], UNITS)
    expect(frames).toHaveLength(1)
    const unit = UNITS.find((u) => u.key === 'fam-1')!
    expect(frames[0].x).toBe(unit.x)
    expect(frames[0].top + frames[0].h).toBeLessThan(unit.top)
    expect(frames[0].name).toBe('어머니')
  })

  it('본인 기도는 self 유닛 위에 선다', () => {
    const frames = buildPrayerFrames([P(null, '올해도 무탈하게', '2026-08-25T00:00:00Z')], UNITS)
    expect(frames[0].key).toBe('self')
    expect(frames[0].x).toBe(UNITS[0].x)
  })

  it('이웃 액자와 겹치지 않는다 — 폭이 유닛 간격보다 좁다', () => {
    const frames = buildPrayerFrames(
      [
        P(null, '나의 기도입니다', '2026-08-25T00:00:00Z'),
        P('fam-1', '어머니 기도입니다', '2026-08-25T00:00:00Z', '어머니'),
        P('fam-2', '아들 기도입니다', '2026-08-25T00:00:00Z', '아들'),
      ],
      UNITS
    )
    const sorted = [...frames].sort((a, b) => a.x - b.x)
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].x - sorted[i].w / 2).toBeGreaterThan(sorted[i - 1].x + sorted[i - 1].w / 2)
    }
  })

  it('유닛이 없으면(비 FAMILY·좁은 무대) 최신 1장만 왼벽 폴백에 건다', () => {
    const frames = buildPrayerFrames(
      [P(null, '먼저 온 기도', '2026-08-20T00:00:00Z'), P('fam-1', '나중 온 기도', '2026-08-25T00:00:00Z', '어머니')],
      []
    )
    expect(frames).toHaveLength(1)
    expect(frames[0].text).toBe('나중 온 기도')
    expect(frames[0].x).toBe(18)
  })

  it('유닛이 있는데 대상 유닛만 없으면(삭제된 가족) 그 액자는 걸지 않는다', () => {
    const frames = buildPrayerFrames([P('ghost', '주인 없는 기도', '2026-08-25T00:00:00Z', '옛가족')], UNITS)
    expect(frames).toHaveLength(0)
  })

  it('기울기는 결정론이다 — 같은 입력이면 같은 각도(SSR 불일치 금지)', () => {
    const rows = [
      P(null, '나의 기도입니다', '2026-08-25T00:00:00Z'),
      P('fam-1', '어머니 기도입니다', '2026-08-25T00:00:00Z', '어머니'),
    ]
    const a = buildPrayerFrames(rows, UNITS).map((f) => f.tilt)
    const b = buildPrayerFrames(rows, UNITS).map((f) => f.tilt)
    expect(a).toEqual(b)
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
