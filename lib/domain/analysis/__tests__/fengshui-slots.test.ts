import {
  SUBJECT_SLOT_SPECS,
  getSlotSpec,
  sumBytes,
  isWithinUploadBudget,
  meetsMinimum,
  MAX_TOTAL_UPLOAD_BYTES,
  type FengshuiSubjectType,
} from '../fengshui-slots'

const SUBJECTS: FengshuiSubjectType[] = ['interior', 'office', 'exterior']

describe('SUBJECT_SLOT_SPECS — 발주 정의 일치', () => {
  it('interior: 1~6, 슬롯 6종(권장 4 + 선택 2)', () => {
    const spec = SUBJECT_SLOT_SPECS.interior
    expect(spec.min).toBe(1)
    expect(spec.max).toBe(6)
    expect(spec.slots).toHaveLength(6)
    expect(spec.slots.filter((s) => s.recommended)).toHaveLength(4)
    expect(spec.slots.map((s) => s.label)).toEqual(['현관', '거실', '안방', '주방', '작은방', '작은방2'])
  })

  it('office: 1~6, 슬롯 6종(핵심 4 + 추가 2), 발주 라벨 포함', () => {
    const spec = SUBJECT_SLOT_SPECS.office
    expect(spec.min).toBe(1)
    expect(spec.max).toBe(6)
    expect(spec.slots).toHaveLength(6)
    const labels = spec.slots.map((s) => s.label)
    for (const l of ['건물입구', '홀·매장', '내부 추가(창고 등)', '사무실·카운터']) {
      expect(labels).toContain(l)
    }
  })

  it('exterior: 1~3, 슬롯 3종', () => {
    const spec = SUBJECT_SLOT_SPECS.exterior
    expect(spec.min).toBe(1)
    expect(spec.max).toBe(3)
    expect(spec.slots).toHaveLength(3)
    expect(spec.slots.map((s) => s.label)).toEqual(['건물 정면', '대문·입구', '주변 환경'])
  })
})

describe('불변식 — 1슬롯 1사진 · id 유일 · 라벨 비어있지 않음', () => {
  it.each(SUBJECTS)('%s: max === slots.length, min<=max', (subject) => {
    const spec = SUBJECT_SLOT_SPECS[subject]
    expect(spec.max).toBe(spec.slots.length)
    expect(spec.min).toBeGreaterThanOrEqual(1)
    expect(spec.min).toBeLessThanOrEqual(spec.max)
  })

  it.each(SUBJECTS)('%s: 슬롯 id 유일, 라벨 non-empty', (subject) => {
    const spec = SUBJECT_SLOT_SPECS[subject]
    const ids = spec.slots.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const s of spec.slots) {
      expect(s.label.trim().length).toBeGreaterThan(0)
      expect(s.id.trim().length).toBeGreaterThan(0)
    }
  })

  it.each(SUBJECTS)('%s: primaryLabel === 첫 권장 슬롯 라벨', (subject) => {
    const spec = SUBJECT_SLOT_SPECS[subject]
    const firstRecommended = spec.slots.find((s) => s.recommended)
    expect(spec.primaryLabel).toBe(firstRecommended?.label)
    // 첫 슬롯이 권장이므로 primaryLabel === slots[0].label 이기도 하다
    expect(spec.primaryLabel).toBe(spec.slots[0]?.label)
  })
})

describe('getSlotSpec', () => {
  it('대상 타입에 맞는 스펙을 반환', () => {
    expect(getSlotSpec('interior')).toBe(SUBJECT_SLOT_SPECS.interior)
    expect(getSlotSpec('office').subjectType).toBe('office')
    expect(getSlotSpec('exterior').max).toBe(3)
  })
})

describe('용량 가드', () => {
  it('sumBytes 는 음수/NaN 을 0 으로 취급하며 합산', () => {
    expect(sumBytes([100, 200, 300])).toBe(600)
    expect(sumBytes([100, -50, Number.NaN, 200])).toBe(300)
    expect(sumBytes([])).toBe(0)
  })

  it('isWithinUploadBudget: 3.5MB 경계', () => {
    expect(MAX_TOTAL_UPLOAD_BYTES).toBe(Math.round(3.5 * 1024 * 1024))
    expect(isWithinUploadBudget([MAX_TOTAL_UPLOAD_BYTES])).toBe(true)
    expect(isWithinUploadBudget([MAX_TOTAL_UPLOAD_BYTES + 1])).toBe(false)
    // 압축본 6장(각 ~400KB) 은 여유롭게 통과
    expect(isWithinUploadBudget(Array(6).fill(400 * 1024))).toBe(true)
  })
})

describe('meetsMinimum', () => {
  it('채워진 수가 min 이상이면 true', () => {
    expect(meetsMinimum(0, SUBJECT_SLOT_SPECS.interior)).toBe(false)
    expect(meetsMinimum(1, SUBJECT_SLOT_SPECS.interior)).toBe(true)
    expect(meetsMinimum(6, SUBJECT_SLOT_SPECS.exterior)).toBe(true)
  })
})
