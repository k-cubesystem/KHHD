import { fireEvent, render, screen, within } from '@testing-library/react'
import { FamilyPageClient } from '@/app/protected/family/family-page-client'
import type { FamilyMemberWithMissions } from '@/app/actions/user/family-missions'
import type { CirclesOverview } from '@/app/actions/circle/circles'
import { canAddRelationship } from '@/app/actions/payment/membership'

jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn(), push: jest.fn() }) }))
jest.mock('@/app/actions/user/family', () => ({
  addFamilyMember: jest.fn(),
  deleteFamilyMember: jest.fn(),
  updateFamilyMember: jest.fn(),
}))
jest.mock('@/app/actions/user/family-missions', () => ({}))
jest.mock('@/app/actions/payment/membership', () => ({ canAddRelationship: jest.fn() }))
jest.mock('@/app/actions/circle/circles', () => ({
  addCircleMember: jest.fn(),
  createCircle: jest.fn(),
  deleteCircle: jest.fn(),
  removeCircleMember: jest.fn(),
}))
jest.mock('@/lib/analytics/ga4', () => ({ trackEvent: jest.fn(), GA: { familyAdd: jest.fn() } }))
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn(), message: jest.fn() } }))
jest.mock('@/components/family/five-avatar-selector', () => ({
  findFiveAvatar: () => null,
  FiveAvatarSelector: () => null,
}))
jest.mock('@/components/family/mission-detail-sheet', () => ({ MissionDetailSheet: () => null }))
jest.mock('@/components/shared/bok-upsell-modal', () => ({ BokUpsellModal: () => null }))
jest.mock('@/components/zodiac-time-select', () => ({ ZodiacTimeSelect: () => null }))
jest.mock('@/components/guest-cta-card', () => ({ GuestCTACard: () => null }))

const mockCanAdd = canAddRelationship as jest.MockedFunction<typeof canAddRelationship>

const base = {
  birth_date: '1990-03-04',
  birth_time: '08:00',
  calendar_type: 'solar',
  gender: 'female',
  face_image_url: null,
  last_analysis_date: null,
  last_analysis_summary: null,
  last_analysis_score: null,
  mission_completed: 0,
  mission_total: 5,
  completed_categories: [],
}
const spouse: FamilyMemberWithMissions = {
  ...base,
  id: 'm1',
  name: '김지영',
  relationship: '배우자',
  member_category: 'family',
}
const child: FamilyMemberWithMissions = {
  ...base,
  id: 'm2',
  name: '박새봄',
  relationship: '자녀',
  member_category: 'family',
}
const friend: FamilyMemberWithMissions = {
  ...base,
  id: 'm3',
  name: '이수진',
  relationship: '친구',
  member_category: 'acquaintance',
}

function overview(people: CirclesOverview['people']): CirclesOverview {
  return {
    family: { id: 'family', name: '가족', kind: 'family', memberCount: 1 },
    circles: [{ id: 'c1', name: '등산 모임', kind: 'friends', createdAt: '2026-09-10T00:00:00Z', members: [] }],
    people,
    limits: { maxCircles: 3, maxMembers: 10 },
    tier: 'FAMILY',
    nextTier: 'BUSINESS',
  }
}

/** 등록·수정 폼이 서버로 싣는 갈래 값. */
function sentCategory(): string | undefined {
  return document.querySelector<HTMLInputElement>('input[name="member_category"]')?.value
}

beforeEach(() => {
  jest.clearAllMocks()
  mockCanAdd.mockResolvedValue({ allowed: true, current: 0, limit: 10 })
})

describe('가족·인연 관리 — 가족관리 · 지인관리 · 그룹만들기(CEO 2026-09-14)', () => {
  it('🔴 서버가 새 목록을 내려 주면 화면 목록도 바로 바뀐다 — 등록하고도 새로 고침 전까지 안 보였다', () => {
    const { rerender } = render(<FamilyPageClient initialMembers={[spouse]} isGuest={false} />)
    expect(screen.getByText('김지영')).toBeInTheDocument()
    rerender(<FamilyPageClient initialMembers={[spouse, child]} isGuest={false} />)
    expect(screen.getByText('박새봄')).toBeInTheDocument()
  })

  it('가족관리·지인관리는 한 줄에 서고, 그룹만들기는 그 아래 따로 안내글과 함께 선다', () => {
    render(<FamilyPageClient initialMembers={[spouse, friend]} isGuest={false} circles={overview([])} />)
    const row = screen.getByRole('group', { name: '인연 목록 고르기' })
    const tabs = within(row).getAllByRole('button')
    expect(tabs.map((b) => b.textContent?.replace(/\d+$/, '').trim())).toEqual(['가족관리', '지인관리'])
    const groupButton = screen.getByRole('button', { name: /그룹만들기/ })
    expect(row.contains(groupButton)).toBe(false)
    expect(groupButton.textContent).toContain('한 그룹으로 묶어')
    expect(groupButton.textContent).toContain('내 그룹 1')
  })

  it('🔴 지인관리에서 추가하면 지인으로 등록된다 — 폼이 갈래를 싣는다(예전엔 늘 가족으로 들어갔다)', async () => {
    render(<FamilyPageClient initialMembers={[spouse, friend]} isGuest={false} />)
    fireEvent.click(screen.getByRole('button', { name: /지인관리/ }))
    expect(screen.getByText('이수진')).toBeInTheDocument()
    expect(screen.queryByText('김지영')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /지인 추가/ }))
    expect(await screen.findByText('새 지인 등록')).toBeInTheDocument()
    expect(mockCanAdd).toHaveBeenCalledWith('acquaintance')
    expect(sentCategory()).toBe('acquaintance')
    const picker = screen.getByRole('group', { name: '등록할 곳' })
    expect(within(picker).getByRole('button', { name: '지인' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('가족관리의 추가는 가족으로 열리고, 폼 안에서 갈래를 바꾸면 싣는 값도 바뀐다', async () => {
    render(<FamilyPageClient initialMembers={[spouse]} isGuest={false} />)
    fireEvent.click(screen.getByRole('button', { name: /가족 추가/ }))
    expect(await screen.findByText('새 가족 등록')).toBeInTheDocument()
    expect(mockCanAdd).toHaveBeenCalledWith('family')
    expect(sentCategory()).toBe('family')
    fireEvent.click(within(screen.getByRole('group', { name: '등록할 곳' })).getByRole('button', { name: '지인' }))
    expect(sentCategory()).toBe('acquaintance')
    expect(screen.getByText('새 지인 등록')).toBeInTheDocument()
  })

  it('🔴 지인을 수정해도 지인 그대로다 — 수정 폼도 갈래를 싣는다(예전엔 가족으로 옮겨졌다)', () => {
    render(<FamilyPageClient initialMembers={[spouse, friend]} isGuest={false} />)
    fireEvent.click(screen.getByRole('button', { name: /지인관리/ }))
    fireEvent.click(screen.getByRole('button', { name: '이수진 정보 수정' }))
    expect(screen.getByText('인연 정보 수정')).toBeInTheDocument()
    expect(sentCategory()).toBe('acquaintance')
  })

  it('그룹만들기 — 가족 카드 없이 쓰는 법 안내가 서고, 넣을 사람이 없으면 «새 사람 등록하기»가 지인 등록 폼을 연다', async () => {
    render(<FamilyPageClient initialMembers={[spouse]} isGuest={false} circles={overview([])} />)
    fireEvent.click(screen.getByRole('button', { name: /그룹만들기/ }))
    const panel = screen.getByRole('region', { name: '그룹만들기' })
    expect(within(panel).getByText('그룹은 이렇게 만들어요')).toBeInTheDocument()
    expect(within(panel).queryByText(/우리 가족/)).toBeNull()
    expect(screen.queryByRole('button', { name: /가족 추가|지인 추가/ })).toBeNull()

    fireEvent.click(within(panel).getByRole('button', { name: /등산 모임/ }))
    expect(within(panel).getByText(/아직 등록한 사람이 없어요/)).toBeInTheDocument()
    expect(within(panel).queryByText(/모두 이 그룹에 들어 있어요/)).toBeNull()
    fireEvent.click(within(panel).getByRole('button', { name: '새 사람 등록하기' }))
    expect(await screen.findByText('새 지인 등록')).toBeInTheDocument()
    expect(mockCanAdd).toHaveBeenCalledWith('acquaintance')
  })

  it('그룹에 넣을 사람이 있으면 고르는 칸과 «그룹에 넣기»가 서고, 목록에 없는 사람은 새로 등록할 수 있다', () => {
    const people = [{ id: 'm3', name: '이수진', relationship: '친구', category: 'acquaintance' as const }]
    render(<FamilyPageClient initialMembers={[spouse, friend]} isGuest={false} circles={overview(people)} />)
    fireEvent.click(screen.getByRole('button', { name: /그룹만들기/ }))
    const panel = screen.getByRole('region', { name: '그룹만들기' })
    fireEvent.click(within(panel).getByRole('button', { name: /등산 모임/ }))
    expect(within(panel).getByRole('combobox', { name: '넣을 사람' })).toBeInTheDocument()
    expect(within(panel).getByRole('button', { name: /그룹에 넣기/ })).toBeDisabled()
    expect(within(panel).getByRole('button', { name: '목록에 없는 사람은 새로 등록하기' })).toBeInTheDocument()
  })
})
