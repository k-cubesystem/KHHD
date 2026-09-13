import { fireEvent, render, screen } from '@testing-library/react'
import { CircleEnergyMapView } from '@/components/family/circle-energy-map'
import { buildCircleEnergy, type CircleMemberEnergy } from '@/lib/domain/circle/team-energy'
import { WORK_NOTICE } from '@/lib/domain/circle/circle'
import { allElementNeeds } from '@/lib/domain/circle/element-lore'
import type { Element } from '@/lib/domain/shrine/types'

jest.mock('@/lib/analytics/ga4', () => ({ trackEvent: jest.fn(), GA: {} }))
jest.mock('@/app/actions/circle/narrative', () => ({ generateNarrative: jest.fn() }))
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn(), message: jest.fn() } }))

function energy(partial: Partial<Record<Element, number>>): Record<Element, number> {
  return { wood: 20, fire: 20, earth: 20, metal: 20, water: 20, ...partial }
}

function member(
  id: string,
  name: string,
  e: Record<Element, number>,
  over: Partial<CircleMemberEnergy> = {}
): CircleMemberEnergy {
  const els: Element[] = ['wood', 'fire', 'earth', 'metal', 'water']
  let low = els[0]
  let high = els[0]
  for (const el of els) {
    if (e[el] < e[low]) low = el
    if (e[el] > e[high]) high = el
  }
  return {
    targetId: id,
    name,
    relation: '동료',
    avatarId: null,
    energy: e,
    yongsin: low,
    strongest: high,
    dayMaster: null,
    mansikYongsin: null,
    mansikGisin: null,
    sipseong: { 식신: 2, 정관: 1 },
    ...over,
  }
}

const ENTRIES = [
  member('self', '나', energy({ wood: 43, fire: 11, water: 6 }), { dayMaster: 'wood' }),
  member('b', '지영', energy({ wood: 9, fire: 41, water: 10 }), { mansikGisin: 'wood', dayMaster: 'fire' }),
  member('c', '현우', energy({ water: 39, metal: 27, wood: 7, fire: 7 }), { dayMaster: 'water' }),
]

const NEEDS = allElementNeeds()

function payloadOf(kind: 'work' | 'friends' | 'custom', name: string) {
  return { circle: { id: 'c1', name, kind }, energy: buildCircleEnergy(kind, ENTRIES) }
}

describe('CircleEnergyMapView v3 — 한 사람씩, 서로의 오행은 복채 AI', () => {
  it('🔴 직장 그룹 — 상단 고지가 서고, 기운 수치가 한 곳도 없다', () => {
    const { container } = render(<CircleEnergyMapView payload={payloadOf('work', '마케팅팀')} needs={NEEDS} />)
    expect(screen.getByText(WORK_NOTICE)).toBeInTheDocument()
    for (const value of ['43', '11', '41', '39', '27']) {
      expect(container.textContent).not.toMatch(new RegExp(`(^|[^0-9])${value}([^0-9]|$)`))
    }
    expect(container.textContent).not.toMatch(/\d+\s*점|\d+\s*%/)
  })

  it('오행이란? 접이식 설명이 다시 서고, 펼치면 다섯 기운이 보인다', () => {
    render(<CircleEnergyMapView payload={payloadOf('friends', '등산 모임')} needs={NEEDS} />)
    const toggle = screen.getByRole('button', { name: /오행\(五行\)이란\?/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText(/나무·불·흙·쇠·물 다섯으로/)).toBeInTheDocument()
  })

  it('겹친 오각형·서로의 관계 목록은 없고, 드롭다운으로 고른 한 사람의 오각형만 선다', () => {
    const payload = payloadOf('friends', '등산 모임')
    const { container } = render(<CircleEnergyMapView payload={payload} needs={NEEDS} />)
    expect(screen.getByText('누구의 기운을 볼까요')).toBeInTheDocument()
    const img = screen.getByRole('img', { name: /오행 오각형 그래프/ })
    expect(img.getAttribute('aria-label')).toBe('오행 오각형 그래프 — 나')
    expect(screen.queryByText('서로의 관계')).toBeNull()
    expect(screen.queryByText(/이 그룹 전체를 신당의 말로/)).toBeNull()
    for (const p of payload.energy.pairs) {
      expect(container.textContent).not.toContain(p.reason)
      expect(container.textContent).not.toContain(p.how)
    }
    expect(screen.getByRole('link', { name: '나 기운 처방전 열기' }).getAttribute('href')).toBe(
      '/protected/prescription'
    )
  })

  it('팩트 세 줄과 함께 보기 AI 문이 선다', () => {
    render(<CircleEnergyMapView payload={payloadOf('custom', '등산 모임')} needs={NEEDS} />)
    expect(screen.getByText('이것만 보면 됩니다')).toBeInTheDocument()
    expect(screen.getByText('함께 채울 기운')).toBeInTheDocument()
    expect(screen.getByText('역할 결')).toBeInTheDocument()
    expect(screen.getByText('AI 풀이 — 둘·셋·넷 함께 보기')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /나·지영 함께 보기/ })).toBeInTheDocument()
  })
})
