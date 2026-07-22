import { ELEMENT_AVATARS, DEITY_AVATARS, FAMILY_AVATARS, findFamilyAvatar } from '../avatars'

describe('가족 아바타 통합 카탈로그', () => {
  it('정령 5종 + 신위 17종 = 22종', () => {
    expect(ELEMENT_AVATARS).toHaveLength(5)
    expect(DEITY_AVATARS).toHaveLength(17)
    expect(FAMILY_AVATARS).toHaveLength(22)
  })

  it('id 는 중복 없이 유일하다', () => {
    const ids = FAMILY_AVATARS.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('모든 아바타는 비어있지 않은 label·src 를 가진다', () => {
    for (const a of FAMILY_AVATARS) {
      expect(a.label.length).toBeGreaterThan(0)
      expect(a.src.length).toBeGreaterThan(0)
      expect(a.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })

  it('정령 id·src 는 기존 저장값과 하위호환(불변)', () => {
    // 기존 family_members.avatar_id 저장값 — 절대 바뀌면 안 된다
    const water = findFamilyAvatar('water_dokkaebi')
    expect(water).toBeDefined()
    expect(water?.kind).toBe('element')
    expect(water?.src).toBe('/avatars/five/water.webp')
    expect(water?.element).toBe('water')

    for (const el of ['water', 'fire', 'metal', 'wood', 'earth'] as const) {
      const found = findFamilyAvatar(`${el}_dokkaebi`)
      expect(found?.src).toBe(`/avatars/five/${el}.webp`)
    }
  })

  it('신위 id 로 초상 경로를 찾는다', () => {
    const sansin = findFamilyAvatar('sansin')
    expect(sansin).toBeDefined()
    expect(sansin?.kind).toBe('deity')
    expect(sansin?.label).toBe('산신령')
    expect(sansin?.src).toBe('/shrine/deities/sansin/portrait.webp')

    const okhwang = findFamilyAvatar('okhwang')
    expect(okhwang?.label).toBe('옥황상제')
    // 전 영역 가호 신위도 5-union 대표 오행을 갖는다
    expect(okhwang?.element).toBe('earth')
  })

  it('신위 정령 id 는 서로 충돌하지 않는다 (dokkaebi vs fire_dokkaebi)', () => {
    expect(findFamilyAvatar('dokkaebi')?.label).toBe('도깨비 대장')
    expect(findFamilyAvatar('fire_dokkaebi')?.kind).toBe('element')
  })

  it('미설정·미매칭 id 는 undefined', () => {
    expect(findFamilyAvatar(null)).toBeUndefined()
    expect(findFamilyAvatar(undefined)).toBeUndefined()
    expect(findFamilyAvatar('')).toBeUndefined()
    expect(findFamilyAvatar('nonexistent_id')).toBeUndefined()
  })
})
