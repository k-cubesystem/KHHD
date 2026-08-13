/**
 * 허브 섹션 표(단일 출처)의 계약.
 *
 * 화면 쪽 테스트(components/analysis/__tests__/hub-layout.test.tsx)가 «표 ↔ 실제 섹션» 대응을
 * 보고, 이 테스트는 그 표 자체가 성립하는지를 본다.
 */
import { allHubSections, HUB_SECTIONS, hubHeadingId } from '@/lib/domain/analysis/hub-sections'

const ALL = allHubSections()

describe('HUB_SECTIONS — 허브 섹션 표', () => {
  it('앱 홈 개편 뒤 남은 섹션은 셋뿐이다 (런처 · ① 인기테마 · 여정)', () => {
    // CEO 지시로 걷어낸 넷(오늘의 정성·절기 이벤트·더 깊이·하단 오늘의 운세)이 표에
    // 되살아나면 화면과 어긋난다. 개수와 순서를 문자열로 못 박는다.
    expect(ALL.map((section) => section.id)).toEqual([
      HUB_SECTIONS.launcher.id,
      HUB_SECTIONS.themeFortune.id,
      HUB_SECTIONS.journey.id,
    ])
  })

  it('런처가 맨 위다 (앱 홈 문법 — 아이콘이 화면의 첫 줄)', () => {
    expect(ALL[0].id).toBe(HUB_SECTIONS.launcher.id)
  })

  it('여정은 맨 끝이다 (CEO 지시 — 종합운수여정을 맨 하단으로)', () => {
    expect(ALL[ALL.length - 1].id).toBe(HUB_SECTIONS.journey.id)
  })

  it('없어진 섹션의 키가 표에 남아 있지 않다', () => {
    const keys = Object.keys(HUB_SECTIONS)

    // `studio`(② 무엇으로 볼까요)는 런처로 흡수돼 사라졌다 — 카드 섹션을 되살리면
    // 같은 문이 한 화면에 둘이 된다.
    for (const gone of ['ritual', 'deeper', 'dailyFortune', 'studio']) {
      expect(keys).not.toContain(gone)
    }
  })

  it('앵커 id 는 서로 겹치지 않는다 (같은 id 둘이면 해시 이동이 엉뚱한 데로 간다)', () => {
    const ids = ALL.map((section) => section.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('id 는 해시 링크·CSS 선택자로 쓸 수 있는 모양이다', () => {
    for (const section of ALL) {
      expect(section.id).toMatch(/^hub-[a-z]+$/)
    }
  })

  it('제목은 비어 있지 않다', () => {
    for (const section of ALL) {
      expect(section.title.trim().length).toBeGreaterThan(0)
    }
  })

  it('표시광고법 금지어를 쓰지 않는다', () => {
    // 금지어는 CLAUDE.md 문구 규율 — 제목이 짧다고 예외가 되지 않는다.
    const banned = ['매일', '무제한', '평생', '모두 이용', '정액']
    for (const section of ALL) {
      for (const word of banned) {
        expect(section.title).not.toContain(word)
      }
    }
  })

  it('제목 id 는 앵커 id 에서 파생된다', () => {
    expect(hubHeadingId('hub-launcher')).toBe('hub-launcher-title')
  })
})
