/**
 * 풀이 화면의 이용권 흐름 잠금 (배포 전 적대적 리뷰 F9 · F11 · F28).
 *
 * - F9  사주 결과 화면이 늘 skipCache=true 로 불러, 24시간 캐시가 있어도 «다시 시도»·뒤로 가기마다 이용권이 또 나갔다.
 * - F11 재물운 심층은 풀이가 끝나도 이용권 요약을 다시 읽지 않아 머리글 장 수가 낡은 채 남았다.
 * - F28 흐름 풀이는 테마 카드가 «무료»로 걸고 서버도 과금하지 않는데, 화면이 «무료 분석 N회» 페이월로 막았다.
 */
import fs from 'fs'
import path from 'path'
import { THEME_DESTINATIONS, isFreeRoute } from '@/lib/domain/theme-fortune/themes'

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8')

const SAJU = read('app/protected/analysis/saju-result/saju-result-client.tsx')
const WEALTH = read('app/protected/analysis/wealth/wealth-analysis-content.tsx')
const TREND = read('app/protected/analysis/trend/[type]/trend-client.tsx')
const TREND_ACTION = read('app/actions/ai/trend.ts')

describe('F9 — 사주 결과 화면은 캐시를 건너뛰지 않는다', () => {
  it('★ 기본 호출은 skipCache=false — 서버가 캐시를 확인한 뒤에 과금한다', () => {
    expect(SAJU).toContain('async function runAnalysis(fresh = false)')
    expect(SAJU).toContain('analyzeCheonjiinAction(target.id, null, false, fresh)')
    expect(SAJU).not.toMatch(/analyzeCheonjiinAction\([^)]*true\s*\)/)
  })

  it('★ 캐시를 건너뛰는 길은 장 수를 밝힌 «새로 분석하기» 하나뿐이다', () => {
    expect(SAJU.match(/runAnalysis\(true\)/g)).toHaveLength(1)
    const fresh = SAJU.slice(SAJU.indexOf('runAnalysis(true)'))
    expect(fresh.slice(0, fresh.indexOf('</button>'))).toContain("formatFeatureCost('saju')")
  })

  it('«다시 시도»와 첫 진입은 인자 없이 부른다', () => {
    expect(SAJU.match(/onClick=\{\(\) => runAnalysis\(\)\}/g)).toHaveLength(2)
    expect(SAJU).not.toContain('onClick={runAnalysis}')
  })
})

describe('F11 — 재물운 심층은 풀이 뒤 이용권 요약을 다시 읽는다', () => {
  it('★ 성공 분기와 이용권 부족 분기 둘 다 refreshPasses 를 부른다', () => {
    expect(WEALTH).toContain("import { useRefreshPasses } from '@/hooks/use-passes'")
    expect(WEALTH.match(/void refreshPasses\(\)/g)).toHaveLength(2)
    const noPass = WEALTH.slice(WEALTH.indexOf('if (handleChargeResult('))
    expect(noPass.slice(0, noPass.indexOf('return'))).toContain('void refreshPasses()')
  })
})

describe('F28 — «무료»로 건 흐름 풀이를 화면이 막지 않는다', () => {
  it('표시의 정본 — 흐름 풀이 네 길은 무료다', () => {
    for (const key of ['trendCareer', 'trendLove', 'trendExam', 'trendEstate'] as const) {
      expect([key, isFreeRoute(THEME_DESTINATIONS[key])]).toEqual([key, true])
    }
  })

  it('★ 서버가 과금하지 않는 한 화면도 페이월을 세우지 않는다', () => {
    expect(TREND_ACTION).not.toContain('chargeFeature(')
    expect(TREND).not.toContain('useAnalysisQuota')
    expect(TREND).not.toContain('PaywallModal')
    expect(TREND).not.toContain('checkQuota')
  })
})
