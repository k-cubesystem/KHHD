import {
  CIRCLE_KIND_META,
  CIRCLE_LIMITS_BY_TIER,
  CIRCLE_NAME_MAX,
  CONSENT_TEXT,
  CREATABLE_CIRCLE_KINDS,
  FAMILY_CIRCLE_ID,
  WORK_NOTICE,
  circleLimits,
  isCircleKind,
  isCreatableCircleKind,
  nextTierForCircles,
  normalizeCircleName,
} from '@/lib/domain/circle/circle'
import { bannedWordsIn } from '@/lib/domain/circle/element-lore'

describe('그룹 종류', () => {
  it('가족은 만들 수 없는 가상 그룹이다', () => {
    expect(CREATABLE_CIRCLE_KINDS).not.toContain('family')
    expect(isCircleKind('family')).toBe(true)
    expect(isCreatableCircleKind('family')).toBe(false)
    expect(isCreatableCircleKind('work')).toBe(true)
    expect(isCircleKind('company')).toBe(false)
    expect(FAMILY_CIRCLE_ID).toBe('family')
  })

  it('🔴 직장 그룹은 밴드 모드·동의 필수·상단 고지가 있다 — 나머지는 없다', () => {
    expect(CIRCLE_KIND_META.work.scoreMode).toBe('bands')
    expect(CIRCLE_KIND_META.work.consentRequired).toBe(true)
    expect(CIRCLE_KIND_META.work.notice).toBe(WORK_NOTICE)
    for (const kind of ['family', 'friends', 'custom'] as const) {
      expect(CIRCLE_KIND_META[kind].scoreMode).toBe('full')
      expect(CIRCLE_KIND_META[kind].notice).toBeNull()
    }
  })

  it('고지문은 «함께 일하고 있는 사람과의 소통»과 «채용·평가·인사 결정 근거 불가»를 둘 다 말한다', () => {
    expect(WORK_NOTICE).toContain('이미 함께 일하고 있는 사람')
    expect(WORK_NOTICE).toContain('채용·평가·인사 결정의 근거로 사용할 수 없습니다')
  })

  it('라벨·힌트·동의문에는 효능·채용 어휘가 없다(고지문은 예외 — 금지어를 «금지한다»고 말하는 문장)', () => {
    for (const meta of Object.values(CIRCLE_KIND_META)) {
      expect(bannedWordsIn(meta.label)).toEqual([])
      expect(bannedWordsIn(meta.hint)).toEqual([])
    }
    expect(bannedWordsIn(CONSENT_TEXT)).toEqual([])
    expect(CONSENT_TEXT).toContain('언제든 뺄 수 있습니다')
  })
})

describe('티어 상한 (CEO 2026-09-07: 사람 2/10/30)', () => {
  it('SINGLE 1/2 · FAMILY 3/10 · BUSINESS 10/30, 비회원 0', () => {
    expect(circleLimits('SINGLE')).toEqual({ maxCircles: 1, maxMembers: 2 })
    expect(circleLimits('FAMILY')).toEqual({ maxCircles: 3, maxMembers: 10 })
    expect(circleLimits('BUSINESS')).toEqual({ maxCircles: 10, maxMembers: 30 })
    expect(circleLimits('MASTER')).toEqual(circleLimits('BUSINESS'))
    expect(circleLimits(null)).toEqual({ maxCircles: 0, maxMembers: 0 })
    expect(circleLimits('single')).toEqual(circleLimits('SINGLE'))
  })

  it('모르는 티어는 가장 낮은 유료 상한으로 떨어진다(활성 구독인데 플랜 행을 못 읽은 경우)', () => {
    expect(circleLimits('MEMBER')).toEqual(CIRCLE_LIMITS_BY_TIER.SINGLE)
    expect(circleLimits('WHATEVER')).toEqual(CIRCLE_LIMITS_BY_TIER.SINGLE)
  })

  it('🔴 상한은 전부 유한한 숫자다 — «무제한»은 없다', () => {
    for (const limits of Object.values(CIRCLE_LIMITS_BY_TIER)) {
      expect(Number.isFinite(limits.maxCircles)).toBe(true)
      expect(Number.isFinite(limits.maxMembers)).toBe(true)
      expect(limits.maxCircles).toBeGreaterThan(0)
    }
  })

  it('다음 티어 — 비회원→SINGLE, SINGLE→FAMILY, FAMILY→BUSINESS, BUSINESS→없음', () => {
    expect(nextTierForCircles(null)).toBe('SINGLE')
    expect(nextTierForCircles('SINGLE')).toBe('FAMILY')
    expect(nextTierForCircles('FAMILY')).toBe('BUSINESS')
    expect(nextTierForCircles('BUSINESS')).toBeNull()
    expect(nextTierForCircles('MASTER')).toBeNull()
  })
})

describe('이름 정리', () => {
  it('앞뒤 공백 제거·연속 공백 하나로, 비거나 길면 null', () => {
    expect(normalizeCircleName('  마케팅   팀 ')).toBe('마케팅 팀')
    expect(normalizeCircleName('   ')).toBeNull()
    expect(normalizeCircleName('가'.repeat(CIRCLE_NAME_MAX))).toHaveLength(CIRCLE_NAME_MAX)
    expect(normalizeCircleName('가'.repeat(CIRCLE_NAME_MAX + 1))).toBeNull()
  })
})
