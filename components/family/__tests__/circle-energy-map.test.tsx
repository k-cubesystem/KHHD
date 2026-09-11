import { fireEvent, render, screen } from '@testing-library/react'
import { CircleEnergyMapView } from '@/components/family/circle-energy-map'
import { buildCircleEnergy, type CircleMemberEnergy } from '@/lib/domain/circle/team-energy'
import { WORK_NOTICE } from '@/lib/domain/circle/circle'
import type { Element } from '@/lib/domain/shrine/types'

jest.mock('@/lib/analytics/ga4', () => ({ trackEvent: jest.fn(), GA: {} }))
jest.mock('@/components/family/five-avatar-selector', () => ({ findFiveAvatar: () => null }))
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

describe('CircleEnergyMapView v2 — 팩트만, 수치 없음', () => {
  it('🔴 직장 그룹 — 상단 고지가 서고, 기운 수치가 한 곳도 없다', () => {
    const payload = {
      circle: { id: 'c1', name: '마케팅팀', kind: 'work' as const },
      energy: buildCircleEnergy('work', ENTRIES),
    }
    const { container } = render(<CircleEnergyMapView payload={payload} />)
    expect(screen.getByText(WORK_NOTICE)).toBeInTheDocument()
    for (const value of ['43', '11', '41', '39', '27']) {
      expect(container.textContent).not.toMatch(new RegExp(`(^|[^0-9])${value}([^0-9]|$)`))
    }
    expect(container.textContent).not.toMatch(/\d+\s*점|\d+\s*%/)
    expect(screen.getAllByText('거리가 약인 사이').length).toBeGreaterThan(0)
  })

  it('모임 그룹도 수치는 없다 — 오각형·팩트·관계 라벨·AI 문만 선다', () => {
    const payload = {
      circle: { id: 'c2', name: '등산 모임', kind: 'friends' as const },
      energy: buildCircleEnergy('friends', ENTRIES),
    }
    const { container } = render(<CircleEnergyMapView payload={payload} />)
    expect(screen.queryByText(WORK_NOTICE)).toBeNull()
    expect(container.textContent).not.toMatch(/\d+\s*점|\d+\s*%/)
    expect(screen.getByRole('img', { name: /오행 오각형 그래프/ })).toBeInTheDocument()
    expect(screen.getByText('이것만 보면 됩니다')).toBeInTheDocument()
    expect(screen.getByText('역할 결')).toBeInTheDocument()
    expect(screen.getByText('둘·셋·넷 함께 보기')).toBeInTheDocument()
    // 관계의 이치·실천 문장은 무료 화면에 없다(AI 재료)
    for (const p of payload.energy.pairs) {
      expect(container.textContent).not.toContain(p.reason)
      expect(container.textContent).not.toContain(p.how)
    }
  })

  it('오각형 범례에서 이름을 누르면 그 사람의 선이 빠진다', () => {
    const payload = {
      circle: { id: 'c2', name: '등산 모임', kind: 'custom' as const },
      energy: buildCircleEnergy('custom', ENTRIES),
    }
    render(<CircleEnergyMapView payload={payload} />)
    const img = () => screen.getByRole('img', { name: /오행 오각형 그래프/ })
    expect(img().getAttribute('aria-label')).toContain('지영')
    fireEvent.click(screen.getByRole('button', { name: '지영', pressed: true }))
    expect(img().getAttribute('aria-label')).not.toContain('지영')
    expect(screen.getByRole('button', { name: '지영', pressed: false })).toBeInTheDocument()
  })

  it('구성원마다 처방전 문이 있고 본인은 target 을 붙이지 않는다', () => {
    const payload = {
      circle: { id: 'c2', name: '등산 모임', kind: 'custom' as const },
      energy: buildCircleEnergy('custom', ENTRIES),
    }
    render(<CircleEnergyMapView payload={payload} />)
    expect(screen.getByRole('link', { name: '나 기운 처방전 열기' }).getAttribute('href')).toBe(
      '/protected/prescription'
    )
    expect(screen.getByRole('link', { name: '지영 기운 처방전 열기' }).getAttribute('href')).toBe(
      '/protected/prescription?target=b'
    )
  })
})
