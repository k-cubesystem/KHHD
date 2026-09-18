/**
 * 유료 풀이의 엣지 분기 순서 — 인증 → 캐시 → 이용권 → (엣지/AI).
 *
 * 엣지 사본(supabase/functions/ai-analysis)에는 인증 뒤 이용권 코드가 없다. 분기가 과금보다 앞에
 * 있으면 EDGE_AI_ANALYSIS 를 켜는 순간 유료 풀이가 이용권 없이 나간다 — 플래그 하나로 여는 무료 경로다.
 */
import { readFileSync } from 'fs'
import { join } from 'path'

const PAID_EDGE_ACTIONS = [
  { rel: 'app/actions/ai/cheonjiin.ts', fn: 'analyzeCheonjiinAction' },
  { rel: 'app/actions/ai/compatibility.ts', fn: 'analyzeCompatibilityAction' },
  { rel: 'app/actions/ai/wealth.ts', fn: 'analyzeWealth' },
] as const

function bodyOf(rel: string, fn: string): string {
  const source = readFileSync(join(process.cwd(), rel), 'utf8')
  const start = source.indexOf(`export async function ${fn}(`)
  expect(`${fn} 존재: ${start > -1}`).toBe(`${fn} 존재: true`)
  const next = source.indexOf('\nexport ', start + 1)
  return source.slice(start, next === -1 ? undefined : next)
}

describe('유료 풀이 — 엣지 분기는 과금 뒤에 있다', () => {
  it.each(PAID_EDGE_ACTIONS)('$fn: 인증 < 이용권 < 엣지', ({ rel, fn }) => {
    const body = bodyOf(rel, fn)
    const authAt = body.indexOf('auth.getUser()')
    const chargeAt = body.indexOf('chargeFeature(')
    const edgeAt = body.indexOf("isEdgeEnabled('ai-analysis')")

    expect(authAt).toBeGreaterThan(-1)
    expect(chargeAt).toBeGreaterThan(authAt)
    expect(edgeAt).toBeGreaterThan(chargeAt)
  })

  it.each(PAID_EDGE_ACTIONS)('$fn: 엣지가 실패하면 쓴 이용권을 되돌린다', ({ rel, fn }) => {
    const body = bodyOf(rel, fn)
    const edgeBlock = body.slice(body.indexOf("isEdgeEnabled('ai-analysis')"))
    expect(edgeBlock).toMatch(/if \(!edge\?\.success\) await refundOnFailure\?\.\(\)/)
  })
})
