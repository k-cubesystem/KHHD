/**
 * 기록 상세가 **저장된 것을 전부 그리는지** 지키는 회귀선 (2026-08-17).
 *
 * ## 🔴 이 테스트가 막는 손실
 * 같은 `result_json` 을 라이브 결과 화면과 기록 상세가 **서로 다른 렌더러**로 그리고 있었다.
 * 라이브는 15섹션, 기록은 4섹션. 2만냥 내고 본 풀이를 기록에서 다시 열면 **3분의 1만** 나왔다.
 * 라이브 확인(2026-08-17): 저장된 SAJU 11건 **전부**가 `specialEnergy`·`sajuStructure`·
 * `yearlyMonthly`·`gaewoon`·`crossAnalysis`·`currentSituation`·`pastRetrograde` 를 갖고 있었는데
 * 기록에선 한 줄도 안 보였다. 크래시가 아니라 **손실**이라 아무도 신고하지 않는다 — 그래서 테스트가 본다.
 *
 * 아래 표본은 라이브 DB 의 실제 모양을 그대로 옮긴 것이다(`jsonb_typeof` 전수 조사 기준).
 * `career`·`health` 가 객체인 것도 실제다 — 문자열로 바꾸지 말 것.
 */
import { render, screen } from '@testing-library/react'
import { AnalysisResultView } from '@/components/history/analysis-result-view'
import type { AnalysisHistory } from '@/app/actions/user/history'

/** 라이브 SAJU 저장본의 실제 키 구성. */
const SAVED_SAJU = {
  summary: '큰 나무가 제 그늘을 갖추어 가는 자리입니다.',
  specialEnergy: {
    title: '불꽃 속에서 탄생한 다이아몬드',
    description: '눌릴수록 단단해지는 결입니다.',
    rarity: '100명 중 5명 정도의 조합이에요',
  },
  pastRetrograde: {
    events: [{ period: '2019년 무렵', description: '자리를 옮기셨을 거예요', basis: '역마 대운' }],
    accuracyHook: '그때가 지금의 바탕이 되었습니다.',
  },
  currentSituation: {
    description: '오르막을 거의 다 올라온 자리입니다.',
    basis: '대운 후반부',
    advice: '지금은 속도보다 방향입니다.',
  },
  sajuStructure: {
    geokgukName: '정관격',
    geokgukExplain: '조직 안에서 성과를 내는 구조입니다.',
    yongsinElement: '수(水)',
    elementBalance: { 목: { count: 2, status: '적당' }, 화: { count: 1, status: '부족' } },
  },
  yearlyMonthly: [{ month: '3월', keyword: '시작', content: '문이 열립니다.', rating: '좋음' }],
  cheon: {
    title: '타고난 성격과 재능이에요',
    content: '우뚝 선 소나무 같은 결입니다.',
    strengths: ['한 우물을 깊게 판다'],
    weaknesses: ['속도를 내야 할 때 머뭇거린다'],
    sinsal: [{ name: '역마살', modern: '한 곳에 오래 못 있는 스타일이에요.' }],
    // 🔴 객체다 — 실제 저장본이 이 모양이다(문자열로 되돌리지 말 것)
    career: {
      summary: '조직형 리더보다는 1인 크리에이터에 가까워요',
      best_jobs: ['기획자 — 판을 크게 읽어서'],
    },
    investment: { style: '장기 우량주 투자형', riskLevel: '중' },
    love: '천천히 데워지는 연애를 합니다.',
    people: {
      good_match: { description: '차분히 들어주는 사람', examples: ['수(水) 기운이 강한 사람'] },
      noble_person: '연장자 중에 있습니다.',
    },
    health: { overall: '위장이 먼저 지칩니다.', weakOrgans: ['위장 — 식사 시간을 지키세요'] },
    lifeTimeline: { currentDecade: '지금은 쌓는 구간입니다.' },
  },
  ji: { title: '지금 흐르는 운의 방향이에요', content: '터가 사람을 돕는 자리입니다.' },
  in: { title: '인연과 내면의 조화', content: '사람으로 풀립니다.', noble_person: '가까이에 있습니다.' },
  gaewoon: {
    luckyColor: { color: '남색', reason: '용신이 수(水)라', items: '가방·필기구' },
    luckyDirection: { direction: '북쪽', reason: '수의 방위', usage: '책상을 북향으로' },
  },
  crossAnalysis: {
    sajuAndFace: '사주와 관상이 같은 말을 합니다.',
    convergenceInsight: '세 가지가 한 곳을 가리킵니다.',
  },
  lucky: { color: '남색', direction: '북', number: 7, keyword: '축적' },
}

function makeRecord(overrides: Partial<AnalysisHistory> = {}): AnalysisHistory {
  return {
    id: 'rec-1',
    user_id: 'user-1',
    target_id: 'target-1',
    target_name: '홍길동',
    target_relation: null,
    category: 'SAJU',
    context_mode: null,
    result_json: SAVED_SAJU,
    summary: SAVED_SAJU.summary,
    score: 82,
    prompt_version: null,
    model_used: null,
    talisman_cost: 20000,
    user_memo: null,
    is_favorite: false,
    created_at: '2026-08-17T00:00:00Z',
    updated_at: '2026-08-17T00:00:00Z',
    ...overrides,
  }
}

describe('🔴 기록 상세는 저장된 것을 전부 그린다', () => {
  it('라이브 화면에만 있던 섹션이 기록에서도 보인다', () => {
    render(<AnalysisResultView record={makeRecord()} />)

    // 예전에 통째로 사라져 있던 자리들
    for (const title of [
      '과거에 이런 일이 있으셨을 거예요',
      '요즘 이런 상황이시죠?',
      '내 사주의 구조예요',
      '올해 월별 운세예요',
      '특별한 기운이 있어요',
      '나한테 맞는 직업이에요',
      '돈은 이렇게 벌고 굴리면 돼요',
      '연애와 인간관계는 이래요',
      '건강은 이렇게 관리하세요',
      '인생 타임라인이에요',
      '이렇게 하면 운이 좋아져요',
      '여러 분석이 같은 결론을 가리키고 있어요',
    ]) {
      expect(screen.getByText(title)).not.toBeNull()
    }

    // 특별한 기운은 제목 자체가 데이터다
    expect(screen.getByText('불꽃 속에서 탄생한 다이아몬드')).not.toBeNull()
  })

  it('天地人 섹션은 그대로 남아 있다 (통합이 기존 것을 밀어내지 않았다)', () => {
    const { container } = render(<AnalysisResultView record={makeRecord()} />)

    expect(container.textContent).toContain('우뚝 선 소나무 같은 결입니다')
    expect(container.textContent).toContain('터가 사람을 돕는 자리입니다')
    expect(container.textContent).toContain('사람으로 풀립니다')
  })

  it('🔴 career 가 객체여도 죽지 않는다 (React #31 재발 방지)', () => {
    const { container } = render(<AnalysisResultView record={makeRecord()} />)

    expect(container.textContent).toContain('1인 크리에이터에 가까워요')
    // 영문 키가 화면에 새면 안 된다
    expect(container.textContent).not.toContain('best_jobs')
    expect(container.textContent).not.toContain('weakOrgans')
  })

  it('값이 비어 있어도 빈 껍데기를 그리지 않는다', () => {
    const { container } = render(
      <AnalysisResultView record={makeRecord({ result_json: { summary: '요약만 있습니다.' } })} />
    )

    expect(container.textContent).not.toContain('내 사주의 구조예요')
    expect(container.textContent).not.toContain('이렇게 하면 운이 좋아져요')
    expect(container.textContent).not.toContain('여러 분석이 같은 결론을 가리키고 있어요')
  })
})
