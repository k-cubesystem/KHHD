/**
 * 인기테마운세 테마 표의 계약.
 *
 * 이 표는 **법적 리스크가 붙은 카피**를 담는다(마스터 §6-1). DB 가 아니라 코드에 둔 이유가
 * 여기 있으므로, 그 이유값을 하는 것은 이 파일이다 — 금지어·규격·«가짜 화면으로 보내지
 * 않는다»를 사람의 주의력이 아니라 테스트가 지킨다.
 */
import { existsSync, readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { FEATURE_COST, formatFeatureCost } from '@/lib/domain/payment/feature-costs'
import {
  DEFAULT_THEME_TAB,
  HUB_THEME_COUNT,
  hubThemePicks,
  isFreeRoute,
  isFreeTheme,
  openRoutes,
  resolveThemeTab,
  routeCostLabel,
  shippedThemes,
  STANDALONE_ROUTES,
  tabOfCategory,
  THEME_CATEGORIES,
  THEME_DESTINATIONS,
  THEME_FORTUNES,
  THEME_LIST_PATH,
  THEME_TABS,
  themeAnchorId,
  themeCostKey,
  themeCostLabel,
  themeDestination,
  themeFallbackImage,
  themeListHref,
  themesByTab,
  themeThumbnail,
  themeThumbnailPath,
  type ThemeCategory,
  type ThemeFortune,
} from '@/lib/domain/theme-fortune/themes'

const ROOT = process.cwd()
const THEMES_SOURCE = readFileSync(join(ROOT, 'lib/domain/theme-fortune/themes.ts'), 'utf8')

/** 카피가 실려 나가는 모든 문자열 — 금지어 검사는 여기 전량에 건다. */
function copyOf(theme: ThemeFortune): string[] {
  return [theme.title, theme.titleLong ?? '', theme.subcopy, theme.target]
}

describe('THEME_FORTUNES — 표의 모양', () => {
  it('세트 문서 4종이 정한 32종이 다 있다', () => {
    expect(THEME_FORTUNES).toHaveLength(32)
  })

  it('카테고리별 개수가 기획서와 같다 (직장 5 · 재물 3 · 연애 8 · 관상 8 · 풍수 8)', () => {
    const count = (category: ThemeCategory) => THEME_FORTUNES.filter((theme) => theme.category === category).length

    expect(count('career')).toBe(5)
    expect(count('wealth')).toBe(3)
    expect(count('love')).toBe(8)
    expect(count('face')).toBe(8)
    expect(count('fengshui')).toBe(8)
  })

  it('id 는 유일하고 kebab-case 다 (라우트 slug·상수 키·썸네일 파일명이 이 값 하나다)', () => {
    const ids = THEME_FORTUNES.map((theme) => theme.id)

    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/)
  })

  it('노출 순서는 1부터 빈틈없이 이어지고 겹치지 않는다', () => {
    const orders = THEME_FORTUNES.map((theme) => theme.order).sort((a, b) => a - b)

    expect(orders).toEqual(Array.from({ length: THEME_FORTUNES.length }, (_, index) => index + 1))
  })

  it('카피 칸이 비어 있지 않다', () => {
    for (const theme of THEME_FORTUNES) {
      expect(theme.title.trim().length).toBeGreaterThan(0)
      expect(theme.subcopy.trim().length).toBeGreaterThan(0)
      expect(theme.target.trim().length).toBeGreaterThan(0)
    }
  })

  it('공유용 별칭 제목을 둘 때는 카드 제목과 다른 문자열이다', () => {
    // 같은 문자열이면 둘로 나눠 든 의미가 없다. 「롱버전」이라 부르지만 C-5 처럼 오히려 짧은
    // 경우도 있어(§4-5) 길이는 재지 않는다 — 카드에 쓰지 않는다는 것이 이 칸의 계약이다.
    for (const theme of THEME_FORTUNES) {
      if (!theme.titleLong) continue
      expect(theme.titleLong.trim().length).toBeGreaterThan(0)
      expect(theme.titleLong).not.toBe(theme.title)
    }
  })
})

describe('THEME_FORTUNES — 글자수 규격', () => {
  /**
   * 🔴 마스터 §4 는 「제목 14~22자 / 서브카피 28~44자」로 적혀 있으나, **32종 실측이 그 상한과
   * 맞지 않는다.** 직장·재물 세트 §4-5 가 같은 사실을 이미 기록했다(8종 중 제목 5종만 통과,
   * 「상한 자체가 프로그램 실물과 안 맞는다」). 자매 세트까지 세어 보면 제목 8~26자 ·
   * 서브카피 20~42자다.
   *
   * 그래서 **상한·하한을 실측에 맞췄다.** 규격이 실물을 못 담으면 규격을 고치는 게 맞고,
   * 실물을 규격에 맞추려면 CEO 원문(「직원복이 없는 건지…」 23자)과 안전 장치로 일부러 늘린
   * 제목(연애 L7 롱버전)을 잘라야 한다 — 둘 다 잘라선 안 되는 것들이다.
   */
  const TITLE_MIN = 8
  const TITLE_MAX = 26
  const SUBCOPY_MIN = 20
  const SUBCOPY_MAX = 44

  it(`제목은 ${TITLE_MIN}~${TITLE_MAX}자다`, () => {
    for (const theme of THEME_FORTUNES) {
      expect(theme.title.length).toBeGreaterThanOrEqual(TITLE_MIN)
      expect(theme.title.length).toBeLessThanOrEqual(TITLE_MAX)
    }
  })

  it(`서브카피는 ${SUBCOPY_MIN}~${SUBCOPY_MAX}자다`, () => {
    for (const theme of THEME_FORTUNES) {
      expect(theme.subcopy.length).toBeGreaterThanOrEqual(SUBCOPY_MIN)
      expect(theme.subcopy.length).toBeLessThanOrEqual(SUBCOPY_MAX)
    }
  })

  it('화면에 실제로 걸리는 출하 테마의 제목은 10자를 넘는다', () => {
    // 「연락할까, 말까」(8자) 류의 짧은 제목은 «둘 중 하나를 골라준다»는 기대를 만든다.
    // 테마가 구조적으로 그걸 하지 않으므로 표시와 내용이 어긋난다(직장·재물 §4-5 C-5 논지).
    for (const theme of shippedThemes()) {
      expect(theme.title.length).toBeGreaterThan(10)
    }
  })
})

describe('THEME_FORTUNES — 금지어 (마스터 §9-3)', () => {
  /** 앱 전역 금지어. CLAUDE.md 문구 규율 — 테마라고 예외가 아니다. */
  const BANNED_APP = ['매일', '무제한', '평생', '모두 이용', '정액']

  /** 효과 단정·비교우위 (마스터 §9-1). 실증할 수 없는 말은 쓰지 않는다. */
  const BANNED_CLAIM = ['성공', '보장', '반드시', '확실히', '최고', '유일', '1위', '급등', '대박', '완치', '부자']

  /**
   * 채용 판단 어휘 (마스터 §9-2 · 채용절차법 제4조의3).
   *
   * 🔴 「면접」은 **일부러 뺐다.** 이 어휘가 쓰이는 유일한 자리(관상 `interview-face`)는
   *    구직자가 **자기 얼굴**을 보는 테마이고, 채용절차법의 수범자는 구인자다. 금지해야 하는
   *    것은 «남을 골라내는» 쪽이며 그건 아래 어휘들이 막는다.
   */
  const BANNED_HIRING = ['채용', '뽑', '지원자', '적합도', '선발', '합격', '승진']

  const BANNED = [...BANNED_APP, ...BANNED_CLAIM, ...BANNED_HIRING]

  it('테마 카피 전량에 금지어가 없다', () => {
    for (const theme of THEME_FORTUNES) {
      for (const text of copyOf(theme)) {
        for (const word of BANNED) {
          expect(`${theme.id}: ${text}`).not.toContain(word)
        }
      }
    }
  })

  it('탭·카테고리·연결 화면 라벨에도 금지어가 없다', () => {
    const labels = [
      ...THEME_TABS.map((tab) => tab.label),
      ...Object.values(THEME_CATEGORIES).map((meta) => meta.label),
      ...openRoutes().map((route) => route.label),
    ]

    for (const label of labels) {
      for (const word of BANNED) expect(label).not.toContain(word)
    }
  })

  it('복채 표기 문자열에도 금지어가 없다', () => {
    for (const theme of THEME_FORTUNES) {
      for (const word of BANNED) expect(themeCostLabel(theme)).not.toContain(word)
    }
  })
})

describe('THEME_FORTUNES — 단가는 feature-costs 에서만 온다 (마스터 §7-1)', () => {
  it('themes.ts 안에 금액이 한 글자도 없다', () => {
    // 표시 가격이 6곳에서 어긋났던 옛 사고의 재발 방지선. 숫자를 여기 쓰는 순간 두 소스가 된다.
    const codeOnly = THEMES_SOURCE.replace(/^\s*\*.*$/gm, '').replace(/\/\/.*$/gm, '')

    expect(codeOnly).not.toMatch(/만냥/)
    expect(codeOnly).not.toMatch(/\d+\s*(원|냥)/)
  })

  it('연결 화면의 단가 키는 모두 실존 FEATURE_COST 키다', () => {
    for (const route of openRoutes()) {
      if (route.costKey === null) continue
      expect(FEATURE_COST[route.costKey]).toBeDefined()
    }
  })

  it('카드 표기는 formatFeatureCost 가 만든 문자열과 같다', () => {
    for (const theme of THEME_FORTUNES) {
      const key = themeCostKey(theme)
      const destination = themeDestination(theme)

      if (!destination) expect(themeCostLabel(theme)).toBe('준비 중')
      else if (key) expect(themeCostLabel(theme)).toBe(formatFeatureCost(key))
      else expect(themeCostLabel(theme)).toBe('무료')
    }
  })

  it('«무료»로 표기하는 화면은 실제로 복채를 받지 않는다', () => {
    // costKey: null 은 추측이 아니라 실차감 호출부를 보고 적은 사실이다. 여기서 다시 읽는다.
    const trend = readFileSync(join(ROOT, 'app/actions/ai/trend.ts'), 'utf8')

    expect(trend).not.toMatch(/deductTalisman/)
  })

  it('단독 화면 둘(오늘의 운세·2026 병오년)도 실제로 복채를 받지 않는다', () => {
    // FEATURE_COST 가 free: true 라고 적어 둔 것을 생성 액션에서 다시 확인한다.
    // 표기만 «무료»이고 실차감이 있으면 표시광고법 문제가 된다.
    for (const source of ['app/actions/fortune/daily.ts', 'app/actions/ai/year2026.ts']) {
      expect({ source, deducts: readFileSync(join(ROOT, source), 'utf8').includes('deductTalisman') }).toEqual({
        source,
        deducts: false,
      })
    }

    for (const route of Object.values(STANDALONE_ROUTES)) {
      expect(isFreeRoute(route)).toBe(true)
      expect(routeCostLabel(route)).toBe('무료')
    }
  })

  it('복채를 받는 화면은 그 값을 FEATURE_COST 에서 읽는다', () => {
    const wealth = readFileSync(join(ROOT, 'app/actions/ai/wealth.ts'), 'utf8')

    expect(wealth).toMatch(/FEATURE_COST\.wealth\.display/)
  })

  it('무료 판정은 연결 화면을 따른다', () => {
    for (const theme of THEME_FORTUNES) {
      const destination = themeDestination(theme)

      if (!destination) expect(isFreeTheme(theme)).toBe(false)
      else if (destination.costKey === null) expect(isFreeTheme(theme)).toBe(true)
      else expect(isFreeTheme(theme)).toBe(FEATURE_COST[destination.costKey].free)
    }
  })
})

/** 라우트 파일이 실재하는가 — 동적 구간([type])까지 따라간다. */
function routeExists(href: string): boolean {
  const segments = href.split('/').filter(Boolean)
  let current = join(ROOT, 'app')

  for (const segment of segments) {
    const exact = join(current, segment)
    if (existsSync(exact)) {
      current = exact
      continue
    }
    const dynamic = readdirSync(current, { withFileTypes: true }).find(
      (entry) => entry.isDirectory() && entry.name.startsWith('[')
    )
    if (!dynamic) return false
    current = join(current, dynamic.name)
  }

  return existsSync(join(current, 'page.tsx'))
}

describe('진입 경로 — 가짜 화면으로 보내지 않는다', () => {
  it('출하한 테마는 예외 없이 실존 화면을 가리킨다', () => {
    for (const theme of shippedThemes()) {
      expect(theme.destination).not.toBeNull()
    }
  })

  it('연결 화면이 실제 라우트로 존재한다 (죽은 링크 방지선)', () => {
    for (const route of openRoutes()) {
      expect({ href: route.href, exists: routeExists(route.href) }).toEqual({
        href: route.href,
        exists: true,
      })
    }
  })

  it('🔴 단독 화면 둘은 이 표가 유일한 진입 경로다 — 표에서 빼지 않는다', () => {
    // 허브 비우기(CEO 2026-08-13)로 「더 깊이 들여다보기」가 사라지면서 오늘의 운세와
    // 2026 병오년은 링크가 한 곳도 남지 않았다. 이 둘이 표에서 빠지면 기능이 접근 불가가 된다.
    expect(Object.values(STANDALONE_ROUTES).map((route) => route.href)).toEqual([
      '/protected/analysis/today',
      '/protected/analysis/new-year',
    ])
    expect(openRoutes()).toHaveLength(Object.keys(THEME_DESTINATIONS).length + Object.keys(STANDALONE_ROUTES).length)
  })

  it('테마 slug 로 /analysis/theme/{slug} 를 링크하지 않는다', () => {
    // 그 자리는 구 5개 slug 를 진짜 화면으로 넘기는 **리다이렉트 전용**이다.
    // 새 slug 로 들어가면 맵에 없어 허브로 튕긴다 — 눌러도 아무 데도 못 가는 카드가 된다.
    for (const route of openRoutes()) {
      expect(route.href.startsWith(`${THEME_LIST_PATH}/`)).toBe(false)
    }
    for (const theme of THEME_FORTUNES) {
      expect(themeListHref(theme).startsWith(`${THEME_LIST_PATH}?`)).toBe(true)
    }
  })

  it('허브 카드는 목록의 그 카드 자리로 간다 (탭 + 앵커)', () => {
    for (const theme of shippedThemes()) {
      expect(themeListHref(theme)).toBe(
        `${THEME_LIST_PATH}?tab=${tabOfCategory(theme.category)}#${themeAnchorId(theme.id)}`
      )
    }
  })

  it('앵커 id 는 CSS 선택자로 쓸 수 있는 모양이고 서로 겹치지 않는다', () => {
    const anchors = THEME_FORTUNES.map((theme) => themeAnchorId(theme.id))

    expect(new Set(anchors).size).toBe(anchors.length)
    for (const anchor of anchors) expect(anchor).toMatch(/^theme-[a-z0-9-]+$/)
  })
})

describe('1차 출하 범위', () => {
  it('출하 테마는 세트 문서의 1차 권고와 같다', () => {
    expect(shippedThemes().map((theme) => theme.id)).toEqual([
      'leave-or-stay',
      'what-next',
      'nothing-left',
      'money-self',
      'attracts-me',
      'same-type',
      'when-love',
      'first-impression',
      'easy-to-ask',
      'five-faces',
      'moving-day',
      'house-or-timing',
    ])
  })

  it('상대의 생년월일을 받는 PAIR 테마는 아직 하나도 출하하지 않는다', () => {
    // 동의 장치(연애 §4-1 · 직장 §3-5)가 코드로 서기 전에는 출하하지 않는다.
    for (const theme of shippedThemes()) expect(theme.input).toBe('SOLO')
  })

  it('32종을 한꺼번에 켜지 않는다', () => {
    expect(shippedThemes().length).toBeLessThan(THEME_FORTUNES.length)
  })
})

describe('허브 ① 인기테마운세 — 리스트 10줄', () => {
  it(`정확히 ${HUB_THEME_COUNT}줄이고 전부 출하 테마다`, () => {
    const picks = hubThemePicks()

    expect(HUB_THEME_COUNT).toBe(10)
    expect(picks).toHaveLength(HUB_THEME_COUNT)
    for (const pick of picks) expect(pick.shipped).toBe(true)
  })

  it('출하 테마가 줄 수보다 많아도 열 줄까지만 건다', () => {
    // 12종 중 열이다 — 나머지 둘은 hubRank 가 null 이고 목록에서만 보인다.
    expect(shippedThemes().length).toBeGreaterThan(HUB_THEME_COUNT)
    expect(shippedThemes().filter((theme) => theme.hubRank !== null)).toHaveLength(HUB_THEME_COUNT)
  })

  it('순위대로 줄을 서고 순위가 겹치지 않는다', () => {
    const ranks = hubThemePicks().map((theme) => theme.hubRank)

    expect(new Set(ranks).size).toBe(ranks.length)
    expect([...ranks].sort((a, b) => (a ?? 0) - (b ?? 0))).toEqual(ranks)
  })

  it('다섯 갈래가 모두 걸리고 한 갈래가 몰아 갖지 않는다', () => {
    // 열 줄을 한 갈래가 넷 이상 가져가면 리스트가 «직장 운세 모음»으로 읽힌다.
    const categories = hubThemePicks().map((theme) => theme.category)

    expect(new Set(categories).size).toBe(Object.keys(THEME_CATEGORIES).length)
    for (const category of Object.keys(THEME_CATEGORIES) as ThemeCategory[]) {
      expect({ category, count: categories.filter((value) => value === category).length }).toEqual({
        category,
        count: 2,
      })
    }
  })

  it('붙어 있는 두 줄의 갈래가 다르다 (같은 갈래가 연달아 서지 않는다)', () => {
    // 정렬 결과가 곧 화면의 세로 순서다 — 여기서 섞여 있지 않으면 화면에서 뭉쳐 보인다.
    const categories = hubThemePicks().map((theme) => theme.category)

    for (let index = 1; index < categories.length; index += 1) {
      expect({ index, same: categories[index] === categories[index - 1] }).toEqual({ index, same: false })
    }
  })

  it('맨 위 다섯 줄만 봐도 다섯 갈래가 다 보인다', () => {
    expect(
      new Set(
        hubThemePicks()
          .slice(0, 5)
          .map((theme) => theme.category)
      ).size
    ).toBe(Object.keys(THEME_CATEGORIES).length)
  })
})

describe('탭', () => {
  it('카테고리는 정확히 한 탭에만 속한다', () => {
    for (const category of Object.keys(THEME_CATEGORIES) as ThemeCategory[]) {
      const owners = THEME_TABS.filter((tab) => tab.categories.includes(category))

      expect(owners).toHaveLength(1)
      expect(tabOfCategory(category)).toBe(owners[0].key)
    }
  })

  it('빈 탭이 없다 (눌러도 아무것도 없는 탭을 만들지 않는다)', () => {
    for (const tab of THEME_TABS) {
      expect(themesByTab(tab.key).length).toBeGreaterThan(0)
    }
  })

  it('탭을 모두 합치면 출하 테마 전량이다', () => {
    const fromTabs = THEME_TABS.flatMap((tab) => themesByTab(tab.key).map((theme) => theme.id))

    expect(fromTabs.sort()).toEqual(
      shippedThemes()
        .map((theme) => theme.id)
        .sort()
    )
  })

  it('모르는 탭 값은 기본 탭으로 떨어진다', () => {
    expect(resolveThemeTab('work')).toBe('work')
    expect(resolveThemeTab('없는탭')).toBe(DEFAULT_THEME_TAB)
    expect(resolveThemeTab(undefined)).toBe(DEFAULT_THEME_TAB)
  })
})

describe('썸네일 — 경로 규약', () => {
  /**
   * 🔴 **여기서 실사 썸네일 파일의 실재를 재지 않는다.** 그림 생성은 이 작업과 병렬로 도는 별도
   * 작업이라, 파일 실재를 CI 계약으로 걸면 자산이 도착하기 전까지 초록이 뜨지 않는다. 대신
   * 두 가지를 건다 — ①표의 문자열이 규약과 일치하는가 ②파일이 없어도 화면이 멀쩡한가(폴백).
   * ②는 컴포넌트 테스트(`components/analysis/__tests__/hub-theme-section.test.tsx`)가 본다.
   */
  it('출하 12종은 전부 실사 썸네일 자리를 갖는다', () => {
    for (const theme of shippedThemes()) {
      expect({ id: theme.id, thumbnail: themeThumbnail(theme) }).toEqual({
        id: theme.id,
        thumbnail: themeThumbnailPath(theme.id),
      })
    }
  })

  it('썸네일을 둔 테마는 예외 없이 규약 경로를 쓴다', () => {
    for (const theme of THEME_FORTUNES) {
      const thumbnail = themeThumbnail(theme)
      if (thumbnail === undefined) continue

      expect(thumbnail).toBe(themeThumbnailPath(theme.id))
      expect(thumbnail).toMatch(/^\/images\/theme-thumbs\/[a-z0-9-]+-v\d+\.webp$/)
    }
  })

  it('규약은 테마 id 하나로 경로를 만든다 (파일명이 표와 갈라지지 않는다)', () => {
    expect(themeThumbnailPath('leave-or-stay')).toBe('/images/theme-thumbs/leave-or-stay-v1.webp')
  })
})

describe('썸네일 — 파일이 없을 때의 폴백', () => {
  it('폴백은 카테고리 그림이다', () => {
    for (const theme of THEME_FORTUNES) {
      expect(themeFallbackImage(theme)).toBe(THEME_CATEGORIES[theme.category].fallbackImage)
    }
  })

  it('🔴 폴백 그림은 public 에 실존한다 (깨진 그림이 뜨지 않는다는 보증)', () => {
    // 실사 썸네일과 달리 이 파일들은 리포에 이미 있다 — 실재를 여기서 재는 게 맞다.
    for (const meta of Object.values(THEME_CATEGORIES)) {
      expect({ file: meta.fallbackImage, exists: existsSync(join(ROOT, 'public', meta.fallbackImage)) }).toEqual({
        file: meta.fallbackImage,
        exists: true,
      })
    }
  })
})
