import { fireEvent, render, screen } from '@testing-library/react'
import { MemberRow } from '@/components/family/member-row'
import type { FamilyMemberWithMissions } from '@/app/actions/user/family-missions'

jest.mock('@/components/family/five-avatar-selector', () => ({ findFiveAvatar: () => null }))

const member: FamilyMemberWithMissions = {
  id: 'm1',
  name: '김지영',
  relationship: '배우자',
  birth_date: '1990-03-04',
  birth_time: '08:00',
  calendar_type: 'solar',
  gender: 'female',
  face_image_url: null,
  last_analysis_date: null,
  last_analysis_summary: null,
  last_analysis_score: null,
  mission_completed: 2,
  mission_total: 5,
  completed_categories: ['SAJU', 'FACE', 'TODAY'],
}

describe('MemberRow — 목록 한 줄(35차)', () => {
  it('이름·관계·옅은/넉넉 칩·처방전 문이 한 줄에 서고, 옛 «운대 %» 막대는 없다', () => {
    const { container } = render(
      <MemberRow
        member={member}
        energy={{ yongsin: 'wood', strongest: 'fire' }}
        onOpenRecord={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    )
    expect(screen.getByText('김지영')).toBeInTheDocument()
    expect(screen.getByText('배우자')).toBeInTheDocument()
    expect(screen.getByText('木')).toBeInTheDocument()
    expect(screen.getByText('火')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '김지영 기운 처방전 열기' }).getAttribute('href')).toBe(
      '/protected/prescription?target=m1'
    )
    expect(container.textContent).not.toMatch(/운대|%/)
  })

  it('풀이 기록 문은 다섯 풀이 중 마친 수를 달고, 누르면 시트를 연다', () => {
    const onOpenRecord = jest.fn()
    render(
      <MemberRow
        member={member}
        energy={{ yongsin: 'wood', strongest: 'fire' }}
        onOpenRecord={onOpenRecord}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    )
    const record = screen.getByRole('button', { name: '김지영 풀이 기록 열기' })
    expect(record.textContent).toContain('2/5')
    fireEvent.click(record)
    expect(onOpenRecord).toHaveBeenCalledTimes(1)
  })

  it('기운을 못 낸 사람은 안내 한 줄만 보인다', () => {
    render(<MemberRow member={member} onOpenRecord={jest.fn()} onEdit={jest.fn()} onDelete={jest.fn()} />)
    expect(screen.getByText('생년월일을 넣으면 기운이 보입니다')).toBeInTheDocument()
    expect(screen.queryByText('木')).toBeNull()
  })
})
