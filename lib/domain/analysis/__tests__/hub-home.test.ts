/**
 * 허브 「앱 홈」 층의 계약 — 아이콘 런처 7칸과 헤더 인사.
 *
 * ⚠️ 2026-08-22 갱신: 8칸 → **7칸**. CEO 지시(「사주만 따로 있고 종합사주 따로 있고 이렇게 있을
 *    필요가 없어」)로 `saju`(→ cheonjiin) 칸과 `samhap`(→ studio/samhap) 칸이 **한 칸으로
 *    합쳐졌다.** 개수·순서 단언을 새 사양에 맞게 고친 것이며, 지키던 규율(중복 없음·라벨 길이·
 *    금지 목록·자산 실존)은 하나도 약화하지 않았다. 오히려 «합친 문이 다시 둘로 갈라지지
 *    않는가»를 새로 단언한다.
 *
 * 이 테스트가 지키는 것은 셋이다.
 * ① **일곱 칸이 성립하는가** — 개수·중복·라벨 길이·아이콘 자산 실존.
 * ② **넣지 말라고 한 것이 안 들어왔는가** — 오늘의 운세·2026 병오년·고민상담.
 *    CEO 가 하루 전 허브에서 내린 셋이고, 셋째는 하단 네비와 겹친다.
 * ③ **인사가 결정론인가** — 같은 시각이면 같은 문장이다(Math.random 이 끼면 화면이 흔들린다).
 *
 * 화면 쪽 대응(런처가 실제로 그려지는가)은 components/analysis/__tests__ 가 본다.
 */
import { existsSync } from 'fs'
import { join } from 'path'
import { HUB_LAUNCHER, hubGreeting } from '@/lib/domain/analysis/hub-home'
import { THEME_LIST_PATH } from '@/lib/domain/theme-fortune/themes'

describe('HUB_LAUNCHER — 아이콘 런처 7칸', () => {
  it('일곱 칸이다 (4열 · 4+3)', () => {
    expect(HUB_LAUNCHER).toHaveLength(7)
  })

  it('선언 순서가 화면 순서다 — 첫 칸이 통합된 종합사주풀이다', () => {
    expect(HUB_LAUNCHER.map((entry) => entry.id)).toEqual([
      'samhap',
      'compatibility',
      'face',
      'palm',
      'fengshui',
      'wealth',
      'themes',
    ])
  })

  it('🔴 사주·종합이 한 칸이다 — 같은 문이 둘로 갈라지지 않는다 (CEO 2026-08-22)', () => {
    const hrefs = HUB_LAUNCHER.map((entry) => entry.href)

    // 통합 입구는 studio/samhap 하나뿐. 사주 단독 입구를 런처에 다시 올리면 통합이 무효가 된다.
    expect(hrefs).toContain('/protected/studio/samhap')
    expect(hrefs).not.toContain('/protected/analysis/cheonjiin')
    expect(HUB_LAUNCHER.filter((entry) => entry.href === '/protected/studio/samhap')).toHaveLength(1)
    expect(HUB_LAUNCHER.map((entry) => entry.label)).not.toContain('사주풀이')
  })

  it('일곱 칸이 저마다 다른 화면으로 간다', () => {
    const hrefs = HUB_LAUNCHER.map((entry) => entry.href)

    expect(new Set(hrefs).size).toBe(hrefs.length)
    expect(new Set(HUB_LAUNCHER.map((entry) => entry.id)).size).toBe(HUB_LAUNCHER.length)
  })

  it('목적지가 확정된 경로다 (구 목업 theme/{slug} 로 가지 않는다)', () => {
    // 구 5개 slug 자리는 리다이렉트 전용이라, 새 링크가 그리로 가면 허브로 튕긴다.
    for (const entry of HUB_LAUNCHER) {
      expect(entry.href.startsWith('/protected/')).toBe(true)
      expect(entry.href).not.toMatch(/\/analysis\/theme\/[a-z]/)
    }
  })

  it('구 ② 「무엇으로 볼까요」 카드 4장의 링크를 하나도 잃지 않았다', () => {
    // 흡수이지 삭제가 아니다 — 이 넷은 허브의 유일한 진입 경로였다.
    const hrefs = HUB_LAUNCHER.map((entry) => entry.href)

    expect(hrefs).toContain('/protected/analysis/compatibility')
    expect(hrefs).toContain('/protected/studio/face')
    expect(hrefs).toContain('/protected/studio/palm')
    expect(hrefs).toContain('/protected/studio/fengshui')
  })

  it('테마 전체 칸은 목록 경로 상수를 그대로 쓴다 (문자열을 두 번 쓰지 않는다)', () => {
    expect(HUB_LAUNCHER.find((entry) => entry.id === 'themes')?.href).toBe(THEME_LIST_PATH)
  })

  it('🔴 오늘의 운세·2026 병오년·고민상담은 런처에 없다', () => {
    // 앞의 둘은 CEO 가 허브에서 내려 테마 목록으로 옮긴 것이고, 고민상담은 하단 네비가 진다.
    const hrefs = HUB_LAUNCHER.map((entry) => entry.href)

    expect(hrefs).not.toContain('/protected/analysis/today')
    expect(hrefs).not.toContain('/protected/analysis/new-year')
    expect(hrefs).not.toContain('/protected/ai-shaman')
    for (const label of ['오늘의 운세', '2026 병오년', '고민상담']) {
      expect(HUB_LAUNCHER.map((entry) => entry.label)).not.toContain(label)
    }
  })

  it('하단 네비와 같은 곳으로 가는 칸이 없다 (신당·웹툰·프로필)', () => {
    const hrefs = HUB_LAUNCHER.map((entry) => entry.href)

    for (const nav of ['/protected/shrine', '/protected/webtoon', '/protected/profile']) {
      expect(hrefs).not.toContain(nav)
    }
  })

  it('라벨은 4열 그리드에 들어갈 길이다 (다섯 자 이하)', () => {
    for (const entry of HUB_LAUNCHER) {
      expect(entry.label.trim().length).toBeGreaterThan(0)
      expect(entry.label.length).toBeLessThanOrEqual(5)
    }
  })

  it('라벨에 값(냥)을 쓰지 않는다 — 단가는 도착 화면이 밝힌다', () => {
    for (const entry of HUB_LAUNCHER) {
      expect(entry.label).not.toMatch(/냥|원|\d/)
    }
  })

  it('표시광고법 금지어를 쓰지 않는다', () => {
    for (const entry of HUB_LAUNCHER) {
      for (const word of ['매일', '무제한', '평생', '모두 이용', '정액']) {
        expect(entry.label).not.toContain(word)
      }
    }
  })

  it('아이콘 파일이 실제로 있고 일곱 칸이 다 다르다', () => {
    const icons = HUB_LAUNCHER.map((entry) => entry.icon)
    expect(new Set(icons).size).toBe(icons.length)

    for (const icon of icons) {
      // 숫자를 허용한다 — 자산 교체는 반드시 파일명 버전업(`samhap-v2`)이다. 같은 이름을
      // 덮어쓰면 폰 캐시가 옛 그림을 재사용한다(2026-08-10 실증, HANDOFF 함정 ①).
      expect(icon).toMatch(/^\/icons\/hub\/[a-z0-9-]+\.webp$/)
      expect(existsSync(join(process.cwd(), 'public', icon))).toBe(true)
    }
  })
})

describe('hubGreeting — 헤더 인사 한 줄', () => {
  /** 서울 시각을 지정해 만든 Date. KST = UTC+9, 서머타임 없음. */
  const atKst = (hour: number) => new Date(Date.UTC(2026, 7, 13, hour - 9, 30))

  it('시간대마다 문장이 갈린다', () => {
    expect(hubGreeting(atKst(8))).toBe('좋은 아침이어요')
    expect(hubGreeting(atKst(13))).toBe('어서 오셔요')
    expect(hubGreeting(atKst(19))).toBe('편안한 저녁이어요')
    expect(hubGreeting(atKst(23))).toBe('늦은 밤에 오셨네요')
    expect(hubGreeting(atKst(3))).toBe('늦은 밤에 오셨네요')
  })

  it('결정론이다 — 같은 시각이면 몇 번을 불러도 같다', () => {
    const now = atKst(15)
    const first = hubGreeting(now)

    for (let i = 0; i < 20; i++) expect(hubGreeting(now)).toBe(first)
  })

  it('하루 24시간 어디에도 빈 문장이 없다', () => {
    for (let hour = 0; hour < 24; hour++) {
      expect(hubGreeting(atKst(hour)).trim().length).toBeGreaterThan(0)
    }
  })

  it('로컬 타임존이 아니라 서울 시각으로 판단한다', () => {
    // 2026-08-13 21:30 UTC = 서울 8/14 06:30 → 아침. 로컬(UTC) 로 읽으면 저녁이 나온다.
    expect(hubGreeting(new Date('2026-08-13T21:30:00Z'))).toBe('좋은 아침이어요')
  })

  it('금지어를 쓰지 않는다', () => {
    for (let hour = 0; hour < 24; hour++) {
      const line = hubGreeting(atKst(hour))
      for (const word of ['매일', '무제한', '평생', '모두 이용', '정액']) {
        expect(line).not.toContain(word)
      }
    }
  })
})
