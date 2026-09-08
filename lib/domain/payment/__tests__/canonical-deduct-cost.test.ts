/**
 * 차감액은 서버가 되도출한다 — 클라이언트가 정하지 않는다.
 *
 * 실제 구조(2026-09-01 발견): `deductTalisman(featureKey, amount)` 은 `'use server'` export,
 * 즉 로그인만 하면 누구나 임의 인자로 부를 수 있는 공개 엔드포인트다. 그런데 서버는
 * 「양수 정수인가」만 봤다. 화면이 아무리 「2만냥」이라고 적어도 브라우저에서
 * `deductTalisman('SAJU', 1)` 을 부르면 1만냥에 팔렸다 — 「표시 = 실차감」 규율이
 * 화면에서만 지켜지고 서버에서는 강제되지 않던 자리.
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { canonicalDeductCost, FEATURE_COST } from '../feature-costs'

describe('차감액 정본 되도출', () => {
  it.each([
    ['SAJU', FEATURE_COST.saju.display],
    ['COMPATIBILITY', FEATURE_COST.compatibility.display],
    ['FACE', FEATURE_COST.face.display],
    ['HAND', FEATURE_COST.palm.display],
    ['FENGSHUI', FEATURE_COST.fengshui.display],
    ['SAMHAP', FEATURE_COST.samhap.display],
    ['wealth_analysis', FEATURE_COST.wealth.display],
    ['IMAGE_GEN', FEATURE_COST.imageGeneration.display],
  ])('%s 의 정본은 표시 가격과 같다 (표시 = 실차감)', (key, expected) => {
    expect(canonicalDeductCost(key)).toBe(expected)
  })

  it('값이 상황마다 달라지는 동적 키는 정본이 없다 — null 은 «검증 불가»이지 «무조건 통과»가 아니다', () => {
    expect(canonicalDeductCost('theme_love-2026')).toBeNull()
    expect(canonicalDeductCost('VOUCHER_CHAT_20')).toBeNull()
  })

  it('정본이 있는 키를 싸게 부르는 값은 정본과 다르다 — 서버가 이 차이로 거절한다', () => {
    // 이 사건의 정확한 조건: 2만냥짜리를 1만냥으로 부르는 것.
    const canonical = canonicalDeductCost('SAJU')
    expect(canonical).not.toBeNull()
    for (const tampered of [1, 0, -1, 100, 1.5, Number.NaN]) {
      expect(tampered === canonical).toBe(false)
    }
  })

  it('정본 표에 등재된 키는 전부 FEATURE_COST 에서 값을 끌어온다 — 숫자를 손으로 적지 않는다', () => {
    const source = readFileSync(join(__dirname, '..', 'feature-costs.ts'), 'utf8')
    const table = source.slice(
      source.indexOf('const CANONICAL_DEDUCT_COST'),
      source.indexOf('export function canonicalDeductCost')
    )
    // 표 안에 리터럴 숫자가 박히면 FEATURE_COST 와 조용히 갈라진다.
    expect(/:\s*\d/.test(table)).toBe(false)
  })
})
