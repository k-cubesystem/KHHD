/**
 * 이용권을 쓰는 풀이 화면의 앞문 — 판정은 서버 한 곳(NO_PASS)이 한다 (2026-09-18 이용권 전환).
 *
 * ## 🔴 이 테스트가 막는 두 사고
 * 1. «무료 분석 N회» 페이월(`useAnalysisQuota`)이 화면 앞에 서 있으면, 이용권이 없는 사람은 서버에 닿기도 전에
 *    막힌다 — 무료인 캐시 적중(궁합 7일 등)까지. 그리고 이용권을 쓰는 풀이를 «무료 분석»이라 부른다.
 * 2. 사주 결과의 블러(`PremiumBlurSection`)는 «지금 이용권이 남았나»로 판정했다. 가입 맛보기 1장을 쓴 사람이
 *    다시 열면 **자기가 산 풀이가 잠겼다**. 이 화면에 보이는 풀이는 전부 이용권을 쓴 것이다.
 */
import fs from 'fs'
import path from 'path'

const ROOT = path.join(__dirname, '..', '..', '..', '..')
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8')

const PAID_SCREENS = [
  'app/protected/analysis/saju-result/saju-result-client.tsx',
  'app/protected/analysis/compatibility/compatibility-client.tsx',
  'app/protected/studio/face/page.tsx',
  'app/protected/studio/palm/page.tsx',
  'app/protected/studio/fengshui/page.tsx',
  'app/protected/studio/samhap/page.tsx',
] as const

describe('🔴 이용권 풀이 화면은 서버 판정만 따른다', () => {
  it.each(PAID_SCREENS)('%s — 무료 분석 페이월을 앞에 세우지 않는다', (rel) => {
    const source = read(rel)
    expect(`${rel}: useAnalysisQuota() ${source.includes('useAnalysisQuota(')}`).toBe(
      `${rel}: useAnalysisQuota() false`
    )
    expect(`${rel}: <PaywallModal ${source.includes('<PaywallModal')}`).toBe(`${rel}: <PaywallModal false`)
  })

  it.each(PAID_SCREENS)('%s — 이용권 부족은 서버 응답으로 안내한다', (rel) => {
    const source = read(rel)
    expect(source).toContain('handleChargeResult(')
    expect(source).toContain('<InsufficientPassModal')
  })

  it('사주 결과는 산 풀이를 블러로 가리지 않는다', () => {
    expect(read(PAID_SCREENS[0])).not.toContain('<PremiumBlurSection')
  })
})
