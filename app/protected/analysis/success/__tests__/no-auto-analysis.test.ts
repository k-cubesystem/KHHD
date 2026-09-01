/**
 * 복채 충전 승인 화면은 풀이를 돌리지 않는다.
 *
 * 실제 사고(2026-09-01 발견): 이 화면이 결제 승인 직후 `startFateAnalysis` 를
 * **무조건** 호출해 Gemini PRO 종합 리포트를 만들고 /protected/history 로 보냈다.
 * 이 화면을 부르는 곳은 복채 충전 두 경로뿐이라, 결과적으로
 *   ① 복채만 산 사용자에게 간판 유료 상품이 매번 공짜로 나갔고
 *   ② 결제 건마다 PRO 호출 원가가 붙었고
 *   ③ 그 호출이 실패하면 승인은 끝났는데 화면은 「결제 승인 실패」를 띄웠다.
 *
 * 이 테스트가 재는 것은 «화면이 예쁜가»가 아니라 «이 모듈이 풀이 생성을 부를 수
 * 있는가»라는 구조 조건이다. 결함이 import 그래프에 있었으므로 import 그래프에서 잰다.
 */
import { readFileSync } from 'fs'
import { join } from 'path'

/** 주석은 걷어낸다 — «왜 이걸 부르면 안 되는지» 적은 주석이 위반으로 잡히면 안 된다. */
const SOURCE = readFileSync(join(__dirname, '..', 'page.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/.*$/gm, '')

/** 풀이 생성으로 이어지는 진입점 — 하나라도 이 화면에 들어오면 사고 재발이다. */
const ANALYSIS_ENTRYPOINTS = ['startFateAnalysis', 'generateFateReport', 'runCheonjiinAnalysis', 'saveAnalysisHistory']

describe('결제 승인 화면 — 요청하지 않은 풀이 금지', () => {
  it.each(ANALYSIS_ENTRYPOINTS)('%s 를 부르지 않는다', (fn) => {
    expect(SOURCE).not.toContain(fn)
  })

  it('결제 승인 자체는 그대로 부른다 — 테스트가 화면을 통째로 비우는 걸 승인하지는 않는다', () => {
    expect(SOURCE).toContain('confirmPayment')
    expect(SOURCE).toContain('GA.bokchaeCharge')
  })

  it('충전이 끝난 사용자를 풀이 기록이 아니라 허브로 보낸다', () => {
    expect(SOURCE).not.toContain("router.push('/protected/history')")
    expect(SOURCE).toContain("router.push('/protected/analysis')")
  })
})
