import { hasFinalConsonant, withSubject, withTopic } from '../josa'

describe('josa', () => {
  it('오행 다섯 이름에 맞는 조사를 붙인다', () => {
    expect(['나무', '불', '흙', '쇠', '물'].map(withSubject)).toEqual(['나무가', '불이', '흙이', '쇠가', '물이'])
    expect(['나무', '불', '흙', '쇠', '물'].map(withTopic)).toEqual(['나무는', '불은', '흙은', '쇠는', '물은'])
  })

  it('나열된 이름은 마지막 글자로 판단한다', () => {
    expect(withTopic('나무·불')).toBe('나무·불은')
    expect(withTopic('불·쇠')).toBe('불·쇠는')
  })

  it('한글 음절이 아니면 받침 없음으로 본다', () => {
    expect(hasFinalConsonant('A')).toBe(false)
    expect(hasFinalConsonant('')).toBe(false)
  })
})
