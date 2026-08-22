/**
 * 「이달의 복」 월간 소재 표와 생성 프롬프트.
 *
 * ① **열두 달이 빠짐없이 있는가** — 한 달이라도 비면 그 달 크론이 설 자리가 없다.
 * ② **프롬프트 함정이 되돌아오지 않는가** — «wallpaper/lock screen»(시계 목업)·«art print»(액자).
 *    두 함정 모두 실측으로 확인된 사고다(2026-08-22), 그래서 문자열을 직접 훑는다.
 */
import {
  MONTHLY_WALLPAPER_MOTIFS,
  WALLPAPER_PROMPT_NEGATIVE,
  WALLPAPER_PROMPT_STYLE,
  buildMonthlyWallpaperPrompt,
  monthlyWallpaperMotif,
} from '../wallpaper-monthly'

describe('소재 표 — 열두 달이 전부 있다', () => {
  it('1월부터 12월까지 하나씩, 빠지거나 겹치지 않는다', () => {
    expect(MONTHLY_WALLPAPER_MOTIFS).toHaveLength(12)
    expect(MONTHLY_WALLPAPER_MOTIFS.map((m) => m.month)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  })

  it('모든 달에 이름과 소재 서술이 채워져 있다', () => {
    for (const motif of MONTHLY_WALLPAPER_MOTIFS) {
      expect(motif.name.length).toBeGreaterThan(0)
      // 짧은 서술은 모델이 제멋대로 채운다 — 실측상 관찰 가능한 사실 여러 개가 필요하다.
      expect(motif.subject.length).toBeGreaterThan(80)
    }
  })

  it('소재가 서로 다르다 (열두 달이 같은 그림이 되지 않는다)', () => {
    expect(new Set(MONTHLY_WALLPAPER_MOTIFS.map((m) => m.subject)).size).toBe(12)
  })

  it('달을 주면 그 달 소재가 나오고, 범위 밖은 감아서 항상 한 장을 준다', () => {
    expect(monthlyWallpaperMotif(9).month).toBe(9)
    expect(monthlyWallpaperMotif(1).month).toBe(1)
    expect(monthlyWallpaperMotif(13).month).toBe(1)
    expect(monthlyWallpaperMotif(0).month).toBe(12)
  })

  it('8월은 라이브에 나간 번들 판과 같은 소재(복주머니)를 유지한다', () => {
    expect(monthlyWallpaperMotif(8).subject).toContain('bokjumeoni')
  })

  it('9~12월은 지시된 계절 소재를 진다', () => {
    expect(monthlyWallpaperMotif(9).subject).toMatch(/moon|silver-grass|songpyeon/i)
    expect(monthlyWallpaperMotif(10).subject).toMatch(/maple|persimmon/i)
    expect(monthlyWallpaperMotif(11).subject).toMatch(/frost|chrysanthemum/i)
    expect(monthlyWallpaperMotif(12).subject).toMatch(/snow|plum/i)
  })
})

describe('프롬프트 함정 — 실측 사고 2건이 되돌아오지 못한다', () => {
  const prompts = MONTHLY_WALLPAPER_MOTIFS.map((m) =>
    buildMonthlyWallpaperPrompt(`2026${String(m.month).padStart(2, '0')}`)
  )

  it('🔴 «wallpaper»·«lock screen»·«phone» 이라 부르지 않는다 (시계 목업을 부른다)', () => {
    for (const prompt of prompts) {
      expect(prompt.toLowerCase()).not.toContain('wallpaper')
      expect(prompt.toLowerCase()).not.toContain('lock screen')
      expect(prompt.toLowerCase()).not.toContain('lock-screen')
      expect(prompt.toLowerCase()).not.toContain('phone')
      expect(prompt.toLowerCase()).not.toContain('clock area')
    }
  })

  it('🔴 «art print» 라 쓰지 않고, 네 변까지 꽉 찬다고 못 박는다 (액자·매트 방지)', () => {
    for (const prompt of prompts) {
      expect(prompt.toLowerCase()).not.toContain('art print')
      expect(prompt).toContain('bleeds off all four edges')
      expect(prompt).toContain('no mat')
    }
  })

  it('세로 회화 한 점으로 부른다', () => {
    expect(WALLPAPER_PROMPT_STYLE).toContain('vertical 9:16 painting')
    expect(WALLPAPER_PROMPT_STYLE).toContain('portrait orientation')
  })

  it('글자·인물 금지를 명시한다 (모델이 전통을 현판으로 오해한다)', () => {
    expect(WALLPAPER_PROMPT_NEGATIVE).toContain('NO text')
    expect(WALLPAPER_PROMPT_NEGATIVE).toContain('NO Chinese hanja characters')
    expect(WALLPAPER_PROMPT_NEGATIVE).toContain('NO people')
    expect(WALLPAPER_PROMPT_NEGATIVE).toContain('no clock')
  })

  it('해화당 다크·금 팔레트를 지시한다', () => {
    expect(WALLPAPER_PROMPT_STYLE).toContain('#0A0A08')
    expect(WALLPAPER_PROMPT_STYLE).toContain('#C9A84C')
  })

  it('프롬프트는 화풍 · 소재 · 금지를 한 덩이로 붙인다', () => {
    const prompt = buildMonthlyWallpaperPrompt('202609')

    expect(prompt).toContain(WALLPAPER_PROMPT_STYLE)
    expect(prompt).toContain(monthlyWallpaperMotif(9).subject)
    expect(prompt).toContain(WALLPAPER_PROMPT_NEGATIVE)
  })
})
