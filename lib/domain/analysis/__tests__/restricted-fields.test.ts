import { readFileSync } from 'fs'
import { join } from 'path'
import { withoutRestrictedHealth } from '../restricted-fields'

describe('withoutRestrictedHealth — 예전 저장본의 건강 진단 칸을 화면에서 거른다', () => {
  it('전체 상태·취약 장기·주의 시기를 빼고 생활 습관은 남긴다', () => {
    expect(
      withoutRestrictedHealth({
        overall: '위장이 먼저 지칩니다.',
        weakOrgans: ['위장 — 식사 시간을 지키세요'],
        warningPeriod: '11월',
        mentalHealth: '혼자 걷는 시간이 풀어 줘요.',
        dietAdvice: '따뜻한 국물',
      })
    ).toEqual({ mentalHealth: '혼자 걷는 시간이 풀어 줘요.', dietAdvice: '따뜻한 국물' })
  })

  it('남는 것이 없거나 문자열 하나로 저장된 옛 칸이면 싣지 않는다', () => {
    expect(withoutRestrictedHealth({ overall: '위장이 먼저 지칩니다.', weakOrgans: [] })).toBeUndefined()
    expect(withoutRestrictedHealth('위장이 약합니다.')).toBeUndefined()
    expect(withoutRestrictedHealth(null)).toBeUndefined()
    expect(withoutRestrictedHealth(['위장'])).toBeUndefined()
  })
})

describe('🔴 풀이 지시문이 투자 권유·건강 진단 칸을 다시 요구하지 않는다(2026-09-29 대표 결정)', () => {
  const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

  it.each([
    ['app/actions/ai/cheonjiin.ts', /"investment"|stockStyle|cryptoStyle|weakOrgans|warningPeriod|취약 장기/],
    ['app/actions/ai/wealth.ts', /investmentTiming|bestMonth|bestWeek|avoidMonth|투자하기 가장 좋은/],
    ['lib/saju-engine/context-builder.ts', /investmentTiming|최적 투자 월/],
  ])('%s', (path, forbidden) => {
    expect(read(path)).not.toMatch(forbidden)
  })
})
