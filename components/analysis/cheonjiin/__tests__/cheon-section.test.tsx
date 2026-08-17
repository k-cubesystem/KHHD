/**
 * 천지인 «천» 섹션 — **라이브 장애의 회귀선** (2026-08-17).
 *
 * 기록에서 천지인 풀이를 열면 화면이 통째로 죽었다:
 *   Minified React error #31 — object with keys {summary, best_jobs, worst_jobs, …}
 *
 * `career` 를 `string` 으로 알고 `{data.career}` 라고 쓴 자리에 **객체가 왔다.** AI 출력 스키마가
 * 진화하는 동안 이 뷰만 옛 모양에 머물렀고, `result_json` 이 `Record<string, any>` 라 타입도
 * 못 막았다. 그래서 «실제로 오는 모양»을 테스트가 붙든다.
 */
import { render, screen } from '@testing-library/react'
import { CheonSection } from '@/components/analysis/cheonjiin/CheonSection'
import type { CheonjiinAnalysisResult } from '@/types/cheonjiin'

/** `app/actions/ai/cheonjiin.ts` 출력 스키마 그대로 — 실제 저장본이 이 모양이다. */
const CAREER_OBJECT = {
  summary: '조직형 리더보다는 1인 크리에이터에 가까워요',
  personality_match: '지시받는 것을 싫어해 프리랜서나 사업이 맞아요.',
  best_jobs: ['기획자 — 판을 크게 읽어서', '연구원 — 한 우물을 깊게 파서'],
  worst_jobs: ['영업직 — 매일 규칙이 바뀌어서'],
  business_aptitude: '혼자 시작해 사람을 붙이는 쪽이 맞아요.',
  career_timing: '9월 이후가 좋아요.',
  celebrity_comparison: '편재가 강한 결이에요.',
}

const HEALTH_OBJECT = {
  summary: '위장이 먼저 지칩니다.',
  weakOrgans: ['위장 — 식사 시간을 지키세요', '신장 — 물을 자주 드세요'],
}

/**
 * 🔴 **타입이 다시 거짓말하지 못하게 하는 자리.**
 *
 * 지난 장애를 못 막은 것은 뷰가 아니라 타입이었다 — `types/cheonjiin.ts` 가 `career?: string`
 * 이라고 선언해 둔 탓에, 객체를 그대로 JSX 에 넣는 코드가 «타입 통과»로 보였다.
 * 아래 대입이 컴파일되지 않으면 누군가 그 필드를 다시 `string` 으로 좁힌 것이다.
 * (tsconfig include 가 tsx 전체라 `tsc --noEmit` 이 이 파일까지 본다.)
 */
const SCHEMA_SHAPE_IS_HONEST: NonNullable<CheonjiinAnalysisResult['cheon']> = {
  career: CAREER_OBJECT,
  health: HEALTH_OBJECT,
  wealth: { summary: '재물은 객체로도 온다' },
  love: { summary: '연애도 마찬가지' },
}

describe('🔴 객체가 와도 화면이 죽지 않는다', () => {
  it('타입이 객체를 허용한다 — 다시 string 으로 좁히면 컴파일이 깨진다', () => {
    render(<CheonSection data={SCHEMA_SHAPE_IS_HONEST} />)

    expect(screen.getByText(/1인 크리에이터에 가까워요/)).not.toBeNull()
    expect(screen.getByText(/위장이 먼저 지칩니다/)).not.toBeNull()
  })

  it('career 가 객체여도 렌더된다 (React #31 재발 방지)', () => {
    render(<CheonSection data={{ title: '천', content: '본문', career: CAREER_OBJECT }} />)

    expect(screen.getByText(/1인 크리에이터에 가까워요/)).not.toBeNull()
    expect(screen.getByText(/기획자 — 판을 크게 읽어서/)).not.toBeNull()
    expect(screen.getByText('잘 맞는 일')).not.toBeNull()
  })

  it('health 가 객체여도 렌더된다', () => {
    render(<CheonSection data={{ title: '천', content: '본문', health: HEALTH_OBJECT }} />)

    expect(screen.getByText(/위장이 먼저 지칩니다/)).not.toBeNull()
    expect(screen.getByText(/식사 시간을 지키세요/)).not.toBeNull()
  })

  it('옛 저장본처럼 문자열이 와도 그대로 그린다 (하위호환)', () => {
    render(<CheonSection data={{ title: '천', content: '본문', career: '조직에 잘 맞습니다.' }} />)

    expect(screen.getByText('조직에 잘 맞습니다.')).not.toBeNull()
  })

  it('🔴 영문 키가 화면에 새지 않는다', () => {
    const { container } = render(<CheonSection data={{ title: '천', content: '본문', career: CAREER_OBJECT }} />)

    for (const key of ['best_jobs', 'worst_jobs', 'career_timing', 'personality_match', 'celebrity_comparison']) {
      expect(container.textContent).not.toContain(key)
    }
  })

  it('값이 없거나 이상해도 카드를 그리지 않는다 (빈 카드 금지)', () => {
    const { container } = render(
      <CheonSection data={{ title: '천', content: '본문', career: {}, wealth: null, love: 42 }} />
    )

    expect(container.textContent).not.toContain('직업·사업')
    expect(container.textContent).not.toContain('재물운')
    expect(container.textContent).not.toContain('연애·결혼')
  })
})
