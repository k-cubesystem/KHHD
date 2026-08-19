/**
 * 종합사주풀이의 **분량이 출력 예산 안에 들어가는가**.
 *
 * ## 🔴 왜 이 게이트가 필요한가
 * 이 프롬프트는 구간마다 「최소 N자」를 요구한다(2026-08-15 3배 상세화, 08-17 최소치 +20%).
 * 요구한 총량이 모델의 출력 예산을 넘으면 **응답이 조용히 잘리고 파서가 빈 리포트를 낸다**
 * — 오류가 아니라 «내용 없는 결과»로 나타나므로, 사람이 화면을 열어 보기 전엔 아무도 모른다.
 * 5만냥짜리 상품에서 가장 비싼 종류의 침묵이다.
 *
 * 그래서 숫자 둘을 서로 묶어 둔다 — 프롬프트가 요구하는 최소 글자 수와 `maxTokens`.
 * 어느 쪽을 건드리든 함께 보게 된다.
 *
 * ## 자 → 토큰 환산
 * 한글은 Gemini 에서 대체로 1자당 1토큰보다 **적게** 든다. 그래도 여기서는 **1자 = 1토큰**
 * 이라는 가장 빡빡한 가정을 쓴다. 추론 토큰이 같은 예산을 나눠 쓰기 때문이다
 * (`app/actions/ai/samhap.ts` 의 주석과 같은 이유).
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { buildSajuContext, type PersonInfo } from '@/lib/saju-engine/context-builder'
import { buildRemedySet } from '@/lib/domain/remedy/remedy'

const ROOT = join(__dirname, '..', '..', '..', '..')
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8')

/** 처방 한 건에 요구하는 최소치. 프롬프트의 REMEDY 태그와 같은 값이어야 한다. */
const REMEDY_MIN_CHARS = 540

/** 예산의 몇 할까지 «요구 최소치»가 차지해도 되는가. 나머지는 추론·여유분. */
const BUDGET_CEILING = 0.8

/** 결이 다른 표본 — 처방 개수가 사주마다 달라서 가장 많이 나오는 경우를 찾는다. */
const PEOPLE: ReadonlyArray<PersonInfo> = [
  { name: '가', birthDate: '1988-03-14', birthTime: '09:30', gender: 'male' },
  { name: '나', birthDate: '1993-11-02', birthTime: '23:10', gender: 'female' },
  { name: '다', birthDate: '1979-06-25', birthTime: '05:00', gender: 'male' },
  { name: '라', birthDate: '2000-01-08', birthTime: '14:40', gender: 'female' },
  { name: '마', birthDate: '1985-09-30', birthTime: '18:20', gender: 'female' },
  { name: '바', birthDate: '1996-04-17', birthTime: '02:15', gender: 'male' },
]

function declaredMinimums(): number[] {
  const source = read('lib/domain/analysis/samhap-prompt.ts')
  return [...source.matchAll(/최소\s*\**([\d,]+)자/g)].map((m) => Number(m[1].replace(/,/g, '')))
}

function configuredMaxTokens(): number {
  const source = read('app/actions/ai/samhap.ts')
  const hit = source.match(/maxTokens:\s*(\d+)/)
  return hit ? Number(hit[1]) : 0
}

function maxRemedyCount(): number {
  return Math.max(...PEOPLE.map((p) => buildRemedySet(buildSajuContext(p)).items.length))
}

describe('🔴 종합사주 분량과 출력 예산', () => {
  it('프롬프트가 구간마다 최소 글자 수를 못 박는다', () => {
    const mins = declaredMinimums()

    // 고정 구간 8개(현재·타고난 그릇·교차 4·잘 맞는 사람/일) + 처방 템플릿.
    expect(mins.length).toBeGreaterThanOrEqual(9)
    expect(mins).toContain(REMEDY_MIN_CHARS)
  })

  it('처방 개수는 사주가 정한다 — 고정 개수로 굳어 있지 않다', () => {
    const counts = PEOPLE.map((p) => buildRemedySet(buildSajuContext(p)).items.length)

    expect(Math.max(...counts)).toBeGreaterThan(0)
  })

  it('요구 최소치를 다 채워도 출력 예산을 넘지 않는다 (넘으면 응답이 조용히 잘린다)', () => {
    const mins = declaredMinimums()
    const fixedSum = mins.filter((n) => n !== REMEDY_MIN_CHARS).reduce((a, b) => a + b, 0)
    const worstCaseChars = fixedSum + maxRemedyCount() * REMEDY_MIN_CHARS
    const budget = configuredMaxTokens()

    expect(budget).toBeGreaterThan(0)

    // 1자 = 1토큰이라는 가장 빡빡한 가정. 실패하면 minimums 를 줄이거나 maxTokens 를 올린다.
    const ratio = worstCaseChars / budget
    expect(
      `요구 ${worstCaseChars}자 / 예산 ${budget}토큰 = ${(ratio * 100).toFixed(0)}% ≤ 80%: ${ratio <= BUDGET_CEILING}`
    ).toBe(`요구 ${worstCaseChars}자 / 예산 ${budget}토큰 = ${(ratio * 100).toFixed(0)}% ≤ 80%: true`)
  })
})
