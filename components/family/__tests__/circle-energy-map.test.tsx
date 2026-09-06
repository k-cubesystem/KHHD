import { render, screen } from '@testing-library/react'
import { CircleEnergyMapView } from '@/components/family/circle-energy-map'
import { buildCircleEnergy, type CircleMemberEnergy } from '@/lib/domain/circle/team-energy'
import { WORK_NOTICE } from '@/lib/domain/circle/circle'
import type { Element } from '@/lib/domain/shrine/types'

jest.mock('@/lib/analytics/ga4', () => ({ trackEvent: jest.fn(), GA: {} }))
jest.mock('@/components/family/five-avatar-selector', () => ({ findFiveAvatar: () => null }))

function energy(partial: Partial<Record<Element, number>>): Record<Element, number> {
  return { wood: 40, fire: 40, earth: 40, metal: 40, water: 40, ...partial }
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
  member('self', '나', energy({ wood: 73, fire: 31 }), { dayMaster: 'wood' }),
  member('b', '지영', energy({ wood: 21, fire: 62 }), { mansikGisin: 'wood', dayMaster: 'fire' }),
  member('c', '현우', energy({ water: 69, metal: 27 }), { dayMaster: 'water' }),
]

describe('CircleEnergyMapView', () => {
  it('🔴 직장 무리 — 상단 고지가 서고, 기운 수치가 한 곳도 없다(밴드 모드)', () => {
    const payload = {
      circle: { id: 'c1', name: '마케팅팀', kind: 'work' as const },
      energy: buildCircleEnergy('work', ENTRIES),
    }
    const { container } = render(<CircleEnergyMapView payload={payload} />)
    expect(screen.getByText(WORK_NOTICE)).toBeInTheDocument()
    // 구성원별 막대 아래 수치(73·31·69…)와 평균 수치가 그려지지 않는다
    for (const value of ['73', '31', '62', '69', '27', '21']) {
      expect(container.textContent).not.toMatch(new RegExp(`(^|[^0-9])${value}([^0-9]|$)`))
    }
    expect(container.textContent).not.toMatch(/\d+\s*점|\d+\s*%/)
    // 관계 라벨은 숫자 없이 선다
    expect(screen.getAllByText('거리가 약인 사이').length).toBeGreaterThan(0)
  })

  it('모임 무리 — 고지가 없고 수치가 보인다(전체 모드)', () => {
    const payload = {
      circle: { id: 'c2', name: '등산 모임', kind: 'friends' as const },
      energy: buildCircleEnergy('friends', ENTRIES),
    }
    const { container } = render(<CircleEnergyMapView payload={payload} />)
    expect(screen.queryByText(WORK_NOTICE)).toBeNull()
    expect(container.textContent).toContain('73')
    expect(screen.getByText('역할 결')).toBeInTheDocument()
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
