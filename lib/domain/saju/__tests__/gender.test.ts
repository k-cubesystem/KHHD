import { genderLabel, normalizeGender } from '../gender'

describe('normalizeGender', () => {
  it.each([
    ['male', 'male'],
    ['female', 'female'],
    ['M', 'male'],
    ['F', 'female'],
    ['m', 'male'],
    [' Male ', 'male'],
    ['남성', 'male'],
    ['여성', 'female'],
  ] as const)('%p → %p', (raw, expected) => {
    expect(normalizeGender(raw)).toBe(expected)
  })

  it.each([null, undefined, '', 'other', '미상', 1])('%p → null', (raw) => {
    expect(normalizeGender(raw)).toBeNull()
  })
})

describe('genderLabel', () => {
  it('남성·여성·미상', () => {
    expect(genderLabel('male')).toBe('남성')
    expect(genderLabel('female')).toBe('여성')
    expect(genderLabel(null)).toBe('미상')
  })
})
