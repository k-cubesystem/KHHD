import { fireEvent, render, screen, within } from '@testing-library/react'
import { toast } from 'sonner'
import { TogetherPanel, type TogetherPerson } from '@/components/family/together-panel'
import { FEATURE_COST } from '@/lib/domain/payment/feature-costs'
import { allElementNeeds } from '@/lib/domain/circle/element-lore'
import type { Element } from '@/lib/domain/shrine/types'

const generateNarrative = jest.fn()
jest.mock('@/lib/analytics/ga4', () => ({ trackEvent: jest.fn(), GA: {} }))
jest.mock('@/app/actions/circle/narrative', () => ({
  generateNarrative: (...args: unknown[]) => generateNarrative(...args),
}))
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn(), message: jest.fn() } }))

function energy(partial: Partial<Record<Element, number>>): Record<Element, number> {
  return { wood: 20, fire: 20, earth: 20, metal: 20, water: 20, ...partial }
}

function person(
  targetId: string,
  name: string,
  relation: string,
  yongsin: Element,
  strongest: Element
): TogetherPerson {
  return { targetId, name, relation, yongsin, strongest, energy: energy({ [yongsin]: 6, [strongest]: 40 }) }
}

const PEOPLE = [
  person('self', '나', '본인', 'water', 'wood'),
  person('b', '지영', '동료', 'wood', 'fire'),
  person('c', '현우', '동료', 'wood', 'water'),
  person('d', '소연', '동료', 'water', 'earth'),
  person('e', '민재', '동료', 'fire', 'metal'),
]
const NEEDS = allElementNeeds()

const FIVE = [
  '서로의 오행',
  '넉넉한 나무와 넉넉한 불이 한자리에 있으면 자리가 데워집니다. 옅은 물은 둘 다 마르기 쉬운 자리입니다.',
  '',
  '장점',
  '나무가 불을 낳으니 먼저 벌인 일을 밝게 드러내 주는 사이입니다.',
  '',
  '단점',
  '둘 다 쉬는 결이 옅어 밤에 지칩니다. 말을 아끼는 시간을 같이 둡니다.',
  '',
  '필요한 것',
  '책상 위에 늘 두는 물컵을 둘 다 곁에 둡니다. 북쪽에 어두운 색 소품 하나.',
  '',
  '이번 주 한 가지',
  '조용히 듣는 시간을 한 번 같이 둡니다.',
].join('\n')

describe('TogetherPanel — AI 풀이(둘·셋·넷 함께 보기)', () => {
  beforeEach(() => jest.clearAllMocks())

  it('처음엔 두 명이 골라져 있고, 단추에 표시 복채가 feature-costs 값으로 선다', () => {
    render(<TogetherPanel people={PEOPLE} kind="work" needs={NEEDS} />)
    expect(screen.getByRole('button', { name: /나·지영 함께 보기/ })).toBeEnabled()
    expect(screen.getByText(`· ${FEATURE_COST.togetherNarrative.display}만냥`)).toBeInTheDocument()
  })

  it('🔴 네 명을 넘기면 고르지 못하고 안내만 뜬다', () => {
    render(<TogetherPanel people={PEOPLE} kind="work" needs={NEEDS} />)
    fireEvent.click(screen.getByRole('button', { name: /현우/ }))
    fireEvent.click(screen.getByRole('button', { name: /소연/ }))
    fireEvent.click(screen.getByRole('button', { name: /민재/ }))
    expect(toast.message).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: /나·지영·현우·소연 함께 보기/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /민재/, pressed: false })).toBeInTheDocument()
  })

  it('한 명만 남기면 단추가 잠기고 «두 명 이상» 안내로 바뀐다', () => {
    render(<TogetherPanel people={PEOPLE} kind="work" needs={NEEDS} />)
    fireEvent.click(screen.getByRole('button', { name: /지영/, pressed: true }))
    expect(screen.getByRole('button', { name: /두 명 이상 고르세요/ })).toBeDisabled()
  })

  it('풀이는 다섯 머리말로 갈라 보이고, 아래에 사람마다 필요한 물건과 서로에게 맞는 풍수가 쿠팡 링크와 함께 선다', async () => {
    generateNarrative.mockResolvedValue({
      success: true,
      text: FIVE,
      cached: false,
      createdAt: '2026-09-13T00:00:00.000Z',
    })
    const links = {
      '책상 위에 늘 두는 물컵': 'https://link.coupang.com/a/water-cup',
      '작은 관엽 화분': 'https://link.coupang.com/a/plant',
    }
    const { container } = render(<TogetherPanel people={PEOPLE} kind="family" needs={NEEDS} shopLinks={links} />)
    fireEvent.click(screen.getByRole('button', { name: /나·지영 함께 보기/ }))
    expect(await screen.findByRole('heading', { name: '장점' })).toBeInTheDocument()
    for (const h of ['서로의 오행', '단점', '필요한 것', '이번 주 한 가지']) {
      expect(screen.getByRole('heading', { name: h })).toBeInTheDocument()
    }
    expect(generateNarrative).toHaveBeenCalledWith('together', 'self,b')
    // 필요한 것 — 나(옅은 水)는 물컵, 지영(옅은 木)은 화분. 쿠팡 링크는 sponsored 로.
    expect(screen.getByText('필요한 것 — 물건과 자리')).toBeInTheDocument()
    const cup = screen.getAllByRole('link', { name: /책상 위에 늘 두는 물컵/ })[0]
    expect(cup.getAttribute('href')).toBe('https://link.coupang.com/a/water-cup')
    expect(cup.getAttribute('rel')).toContain('sponsored')
    expect(screen.getAllByRole('link', { name: /작은 관엽 화분/ }).length).toBeGreaterThan(0)
    expect(screen.getByText('서로에게 맞는 풍수·물건')).toBeInTheDocument()
    expect(container.textContent).toContain('북쪽')
    expect(container.textContent).not.toMatch(/\d+\s*점|\d+\s*%/)
  })

  it('풀이 아래 「함께 있을 때 이렇게」 — 고른 사람마다 밥·움직임·쉼 판정과 이유, 같은 팀이라도 조심할 짝이 선다', async () => {
    generateNarrative.mockResolvedValue({
      success: true,
      text: FIVE,
      cached: true,
      createdAt: '2026-09-14T00:00:00.000Z',
    })
    const care = [
      {
        targetId: 'self',
        name: '나',
        kind: 'rest' as const,
        label: '쉬게 두기',
        together: '쉬게 두는 자리',
        why: '물 기운이 부족하면 쉼이 마릅니다.',
        do: '먼저 묻지 말고 기다리기',
        avoid: '벌여 놓기만 하는 자리',
      },
      {
        targetId: 'b',
        name: '지영',
        kind: 'move' as const,
        label: '몸 움직이기',
        together: '같이 걷는 자리',
        why: '나무 기운이 부족하면 시작이 약해요.',
        do: '아침에 같이 걷기',
        avoid: '밤늦게까지 들뜨는 자리',
      },
      {
        targetId: 'c',
        name: '현우',
        kind: 'meal' as const,
        label: '같이 밥',
        together: '같이 밥',
        why: '불',
        do: '점심',
        avoid: '밤',
      },
    ]
    const cautions = [
      { presserId: 'self', pressedId: 'b', text: '쇠가 나무를 치듯 나님의 결정이 지영님의 시작을 막기 쉬워요.' },
      { presserId: 'self', pressedId: 'c', text: '현우와의 짝은 고르지 않았으니 보이면 안 됩니다.' },
    ]
    render(<TogetherPanel people={PEOPLE} kind="family" needs={NEEDS} care={care} cautions={cautions} />)
    fireEvent.click(screen.getByRole('button', { name: /나·지영 함께 보기/ }))
    const title = await screen.findByText('함께 있을 때 이렇게')
    const block = within(title.parentElement as HTMLElement)
    expect(block.getByText(/쉬게 두기/)).toBeInTheDocument()
    expect(block.getByText(/몸 움직이기/)).toBeInTheDocument()
    expect(block.getByText(/물 기운이 부족하면/)).toBeInTheDocument()
    expect(block.getByText('먼저 묻지 말고 기다리기')).toBeInTheDocument()
    // 고르지 않은 현우(같이 밥)는 블록에 없다
    expect(block.queryByText(/같이 밥/)).toBeNull()
    expect(block.getByText('같은 팀·가족이라도 조심할 것')).toBeInTheDocument()
    expect(block.getByText(/쇠가 나무를 치듯/)).toBeInTheDocument()
    expect(block.queryByText(/고르지 않았으니/)).toBeNull()
  })

  it('머리말 없는 옛 풀이도 한 덩이로 보인다(캐시 호환)', async () => {
    generateNarrative.mockResolvedValue({
      success: true,
      text: '첫 문단입니다. 둘이 함께 있으면 자리가 데워집니다. 물이 마르니 쉼을 같이 둡니다.\n\n둘째 문단입니다.',
      cached: true,
      createdAt: '2026-09-12T00:00:00.000Z',
    })
    render(<TogetherPanel people={PEOPLE} kind="family" needs={NEEDS} />)
    fireEvent.click(screen.getByRole('button', { name: /나·지영 함께 보기/ }))
    expect(await screen.findByText(/첫 문단입니다/)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '장점' })).toBeNull()
  })

  it('최근 본 조합 — 이 화면 사람들로만 된 것만 보이고, 누르면 서버 없이 그 풀이가 열린다', () => {
    const recent = [
      { ids: ['b', 'self'], names: ['지영', '나'], text: FIVE, createdAt: '2026-09-10T00:00:00.000Z' },
      {
        ids: ['self', 'zzz'],
        names: ['나', '모르는 이'],
        text: '남의 화면 조합',
        createdAt: '2026-09-09T00:00:00.000Z',
      },
    ]
    render(<TogetherPanel people={PEOPLE.slice(0, 3)} kind="family" recent={recent} needs={NEEDS} />)
    expect(screen.getByText('최근 본 조합 — 다시 여는 데 복채가 들지 않습니다')).toBeInTheDocument()
    expect(screen.queryByText(/모르는 이/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /지영·나/ }))
    expect(screen.getByRole('heading', { name: '장점' })).toBeInTheDocument()
    expect(generateNarrative).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /현우/, pressed: false })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /나·지영 함께 보기/ })).toBeInTheDocument()
  })

  it('복채가 모자라면 오류 토스트만 띄운다', async () => {
    generateNarrative.mockResolvedValue({
      success: false,
      error: '복채가 부족합니다.',
      errorType: 'INSUFFICIENT_BALANCE',
    })
    render(<TogetherPanel people={PEOPLE} kind="family" needs={NEEDS} />)
    fireEvent.click(screen.getByRole('button', { name: /나·지영 함께 보기/ }))
    await screen.findByRole('button', { name: /나·지영 함께 보기/ })
    expect(toast.error).toHaveBeenCalledWith('복채가 부족합니다.')
    expect(screen.queryByRole('heading', { name: '장점' })).toBeNull()
  })
})
