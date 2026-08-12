/**
 * 허브 섹션 표(단일 출처)의 계약.
 *
 * 화면 쪽 테스트(components/analysis/__tests__/hub-section-nav.test.tsx)가 «칩 ↔ 앵커» 대응을
 * 보고, 이 테스트는 그 표 자체가 성립하는지를 본다.
 */
import {
  allHubSections,
  HUB_SECTIONS,
  hubHeadingId,
  hubScrollBehavior,
  visibleHubSections,
} from '@/lib/domain/analysis/hub-sections'

const ALL = allHubSections()

describe('HUB_SECTIONS — 허브 섹션 표', () => {
  it('앵커 id 는 서로 겹치지 않는다 (같은 id 둘이면 바로가기가 엉뚱한 데로 간다)', () => {
    const ids = ALL.map((section) => section.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('id 는 해시 링크·CSS 선택자로 쓸 수 있는 모양이다', () => {
    for (const section of ALL) {
      expect(section.id).toMatch(/^hub-[a-z]+$/)
    }
  })

  it('칩 라벨과 제목은 비어 있지 않다', () => {
    for (const section of ALL) {
      expect(section.label.trim().length).toBeGreaterThan(0)
      expect(section.title.trim().length).toBeGreaterThan(0)
    }
  })

  it('표시광고법 금지어를 쓰지 않는다', () => {
    // 금지어는 CLAUDE.md 문구 규율 — 라벨이 짧다고 예외가 되지 않는다.
    const banned = ['매일', '무제한', '평생', '모두 이용', '정액']
    for (const section of ALL) {
      for (const word of banned) {
        expect(section.label).not.toContain(word)
        expect(section.title).not.toContain(word)
      }
    }
  })

  it('제목 id 는 앵커 id 에서 파생된다', () => {
    expect(hubHeadingId('hub-studio')).toBe('hub-studio-title')
  })
})

describe('visibleHubSections — 화면에 없는 섹션은 칩도 만들지 않는다', () => {
  it('오늘의 운세가 그려지는 회원에게는 전부 보인다', () => {
    expect(visibleHubSections({ hasDailyFortune: true })).toHaveLength(ALL.length)
  })

  it('오늘의 운세가 없으면 그 칩만 빠진다', () => {
    const sections = visibleHubSections({ hasDailyFortune: false })

    expect(sections).toHaveLength(ALL.length - 1)
    expect(sections.map((section) => section.id)).not.toContain(HUB_SECTIONS.dailyFortune.id)
  })

  it('선언 순서(=화면의 문서 순서)를 그대로 유지한다', () => {
    expect(visibleHubSections({ hasDailyFortune: true }).map((section) => section.id)).toEqual([
      HUB_SECTIONS.journey.id,
      HUB_SECTIONS.ritual.id,
      HUB_SECTIONS.studio.id,
      HUB_SECTIONS.theme.id,
      HUB_SECTIONS.dailyFortune.id,
    ])
  })
})

describe('hubScrollBehavior — 감속 선호', () => {
  it('평소에는 부드럽게 내려간다', () => {
    expect(hubScrollBehavior(false)).toBe('smooth')
  })

  it('감속을 선호하면 즉시 이동한다', () => {
    // scrollIntoView 의 behavior 옵션은 CSS scroll-behavior 를 덮어쓴다.
    // globals.css 의 감속 블록만 믿으면 여기서 'smooth' 가 그대로 나가 버린다.
    expect(hubScrollBehavior(true)).toBe('auto')
  })
})
