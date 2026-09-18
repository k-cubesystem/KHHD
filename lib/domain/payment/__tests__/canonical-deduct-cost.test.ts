/**
 * 사용 장 수는 서버가 되도출한다 — 클라이언트가 정하지 않는다.
 *
 * 실제 구조(2026-09-01 발견, 복채 시절): 옛 차감 액션은 `'use server'` export, 즉 로그인만 하면
 * 누구나 임의 인자로 부를 수 있는 공개 엔드포인트였다. 서버는 「양수 정수인가」만 봤고,
 * 브라우저에서 싼 값으로 부르면 그 값에 팔렸다 — 「표시 = 실사용」 규율이 화면에서만 지켜지던 자리.
 *
 * 이용권 전환(2026-09-18) 뒤 사용 경로(chargeFeature)는 호출부에서 숫자를 받지 않는다.
 * 이 표는 그래도 남는 «featureKey → 정본 장 수» 대조(내역·관리자 화면)의 근거다.
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { canonicalDeductCost, FEATURE_COST } from '../feature-costs'

describe('사용 장 수 정본 되도출', () => {
  it.each([
    ['SAJU', FEATURE_COST.saju.display],
    ['COMPATIBILITY', FEATURE_COST.compatibility.display],
    ['FACE', FEATURE_COST.face.display],
    ['HAND', FEATURE_COST.palm.display],
    ['FENGSHUI', FEATURE_COST.fengshui.display],
    ['SAMHAP', FEATURE_COST.samhap.display],
    ['WEALTH', FEATURE_COST.wealth.display],
    ['wealth_analysis', FEATURE_COST.wealth.display],
    ['IMAGE_GEN', FEATURE_COST.imageGeneration.display],
    ['circle_narrative', FEATURE_COST.circleNarrative.display],
    ['together_narrative', FEATURE_COST.togetherNarrative.display],
    ['OBANGKI_DRAW', FEATURE_COST.obangkiDraw.display],
    ['SHAMAN_QUESTIONS', FEATURE_COST.shamanQuestions.display],
  ])('%s 의 정본은 표시 장 수와 같다 (표시 = 실사용)', (key, expected) => {
    expect(canonicalDeductCost(key)).toBe(expected)
  })

  it('값이 상황마다 달라지는 동적 키는 정본이 없다 — null 은 «검증 불가»이지 «무조건 통과»가 아니다', () => {
    expect(canonicalDeductCost('theme_love-2026')).toBeNull()
    expect(canonicalDeductCost('UNKNOWN_FEATURE')).toBeNull()
  })

  it('정본이 있는 키를 싸게 부르는 값은 정본과 다르다', () => {
    const canonical = canonicalDeductCost('SAMHAP')
    expect(canonical).toBe(2)
    for (const tampered of [1, 0, -1, 100, 1.5, Number.NaN]) {
      expect(tampered === canonical).toBe(false)
    }
  })

  it('정본 표에 등재된 키는 전부 FEATURE_COST 에서 값을 끌어온다 — 숫자를 손으로 적지 않는다', () => {
    const source = readFileSync(join(__dirname, '..', 'feature-costs.ts'), 'utf8')
    const start = source.indexOf('const CANONICAL_CHARGE_UNITS')
    const end = source.indexOf('export function canonicalDeductCost')
    expect(start).toBeGreaterThan(-1)
    expect(end).toBeGreaterThan(start)
    // 표 안에 리터럴 숫자가 박히면 FEATURE_COST 와 조용히 갈라진다.
    expect(/:\s*\d/.test(source.slice(start, end))).toBe(false)
  })
})
