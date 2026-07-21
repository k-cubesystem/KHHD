import { AI_ACTION_LABELS, EMITTED_ACTION_TYPES, getActionLabel } from '@/lib/domain/gemini/actions'

describe('Gemini action 라벨 정합성', () => {
  it('방출되는 전 action_type 은 라벨을 가진다 (⊆ ACTION_LABELS 키)', () => {
    const missing = EMITTED_ACTION_TYPES.filter((t) => !AI_ACTION_LABELS[t])
    expect(missing).toEqual([])
  })

  it('라벨 값은 비어있지 않다', () => {
    const emptyKeys = Object.entries(AI_ACTION_LABELS)
      .filter(([, label]) => label.trim().length === 0)
      .map(([key]) => key)
    expect(emptyKeys).toEqual([])
  })

  it('getActionLabel: 등록된 타입은 한글 라벨을 돌려준다', () => {
    expect(getActionLabel('daily_fortune')).toBe('오늘운세')
    expect(getActionLabel('image_generation')).toBe('이미지 생성')
    expect(getActionLabel('shaman_chat')).toBe('고민상담 채팅')
  })

  it('getActionLabel: 레거시 trend_* 는 프리픽스 보정', () => {
    expect(getActionLabel('trend_love')).toContain('트렌드')
  })

  it('getActionLabel: 미등록 타입은 원문 폴백', () => {
    expect(getActionLabel('made_up_xyz')).toBe('made_up_xyz')
  })
})
