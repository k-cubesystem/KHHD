import { calculateManse } from '../manse'
import { ILGAN, ILGAN_SLUGS, ilganSlugFromHan, isIlganSlug, ilganShareText, UNKNOWN_TIME_FALLBACK } from '../ilgan'

describe('일간 10종 데이터', () => {
  it('열 글자가 전부 있고 한자·slug 가 1:1 이다', () => {
    expect(ILGAN_SLUGS).toHaveLength(10)
    const hans = ILGAN_SLUGS.map((s) => ILGAN[s].han)
    expect(new Set(hans).size).toBe(10)
    expect(hans.join('')).toBe('甲乙丙丁戊己庚辛壬癸')
    for (const s of ILGAN_SLUGS) expect(ilganSlugFromHan(ILGAN[s].han)).toBe(s)
  })

  it('모르는 글자는 throw 하지 않고 null', () => {
    expect(ilganSlugFromHan('子')).toBeNull()
    expect(isIlganSlug('dragon')).toBe(false)
  })

  it('문장 규율 — 사람을 단정하는 어미를 쓰지 않는다', () => {
    for (const s of ILGAN_SLUGS) {
      const text = ILGAN[s].lines.join(' ')
      expect(text).not.toMatch(/당신은/)
      expect(text).not.toMatch(/반드시|틀림없이|무조건/)
      // 효험·미래 약속 금지
      expect(text).not.toMatch(/이루어|성공합니다|부자가/)
    }
  })

  it('공유 문구는 스레드 500자 한참 아래이고 URL 을 포함한다', () => {
    const t = ilganShareText(ILGAN.gyeong, 'https://k-haehwadang.com/ilgan/gyeong')
    expect(t.length).toBeLessThan(200)
    expect(t).toContain('경금')
    expect(t).toContain('/ilgan/gyeong')
  })
})

describe('만세력 → 일간 매핑 (골든)', () => {
  // 골든값은 lunar-javascript setSect(1) 로 직접 산출(2026-08-19)
  it.each([
    ['1990-05-15', '12:00', 'gyeong', '경진'],
    ['2000-01-01', '12:00', 'mu', '무오'],
    ['1985-11-23', '12:00', 'byeong', '병인'],
  ])('%s %s → %s (%s)', (date, time, slug, pillar) => {
    const m = calculateManse(date, time)
    expect(ilganSlugFromHan(m.day.ganHan)).toBe(slug)
    expect(m.day.korean).toBe(pillar)
  })

  it('🔴 야자시 — 같은 날이라도 23시는 일간이 다음 날로 넘어간다(시간 입력을 권하는 이유)', () => {
    const noon = calculateManse('1985-11-23', '12:00')
    const late = calculateManse('1985-11-23', '23:00')
    expect(ilganSlugFromHan(noon.day.ganHan)).toBe('byeong')
    expect(ilganSlugFromHan(late.day.ganHan)).toBe('jeong')
  })

  it('«시간 모름» 기준 시각은 정오 — 야자시 경계에 걸리지 않는다', () => {
    expect(UNKNOWN_TIME_FALLBACK).toBe('12:00')
    const a = calculateManse('1985-11-23', UNKNOWN_TIME_FALLBACK)
    const b = calculateManse('1985-11-23', '00:30')
    expect(a.day.ganHan).toBe(b.day.ganHan)
  })
})
