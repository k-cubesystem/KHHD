/**
 * 운세 캘린더(오늘·주간·월간)는 무료다 — 화면이 «무료 분석 N회» 페이월로 막지 않는다.
 *
 * 비용표가 무료로 걸고(FEATURE_COST.today) 서버 액션도 과금하지 않는데, 화면만 세 번 뒤에
 * «이용권이나 멤버십이 필요»라고 막고 있었다(배포 전 리뷰 잔여 — 흐름 풀이 F28 과 같은 결함).
 */
import fs from 'fs'
import path from 'path'
import { FEATURE_COST, canonicalDeductCost } from '@/lib/domain/payment/feature-costs'

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8')

const FORTUNE = read('app/protected/analysis/fortune/fortune-client.tsx')
const FORTUNE_ACTION = read('app/actions/ai/fortune-analysis.ts')

describe('운세 캘린더 — «무료»로 건 풀이를 화면이 막지 않는다', () => {
  it('표시의 정본 — 오늘의 운세는 무료다', () => {
    expect(FEATURE_COST.today).toEqual({ display: 0, free: true })
    expect(canonicalDeductCost('TODAY')).toBe(0)
  })

  it('★ 서버가 과금하지 않는 한 화면도 페이월을 세우지 않는다', () => {
    expect(FORTUNE_ACTION).not.toContain('chargeFeature(')
    expect(FORTUNE).not.toContain('useAnalysisQuota')
    expect(FORTUNE).not.toContain('PaywallModal')
    expect(FORTUNE).not.toContain('checkQuota')
  })
})
