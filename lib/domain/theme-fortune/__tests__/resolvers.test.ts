/**
 * 테마 판정 레지스트리의 계약.
 *
 * 카피 표(`themes.ts`)와 계산 표(`resolvers/index.ts`)는 **일부러 컴파일로 묶지 않았다** —
 * 서로 다른 속도로 늘어나기 때문이다(카피 32종은 이미 다 있고, 판정은 하나씩 선다).
 * 대신 여기서 대조한다. 이 파일이 「등록 안 된 출하 테마」를 보고하는 자리다.
 */
import { readdirSync } from 'fs'
import { join } from 'path'
import { resolvedThemeIds, themeResolver } from '@/lib/domain/theme-fortune/resolvers'
import { hasThemeReading, shippedThemes, THEME_FORTUNES } from '@/lib/domain/theme-fortune/themes'

const RESOLVER_DIR = join(process.cwd(), 'lib/domain/theme-fortune/resolvers')

describe('레지스트리 — 카피 표와 계산 표가 어긋나지 않는다', () => {
  it('🔴 `reading: true` 인 테마는 예외 없이 판정이 등록돼 있다', () => {
    // 어긋나면 카드는 복채를 적고 링크는 풀이로 가는데, 그 화면이 「준비 중」으로 닫힌다.
    const declared = THEME_FORTUNES.filter(hasThemeReading).map((theme) => theme.id)

    expect([...declared].sort()).toEqual([...resolvedThemeIds()].sort())
  })

  it('🔴 등록된 판정은 예외 없이 출하 테마의 것이다', () => {
    // 출하하지 않은 테마의 판정이 돌면, 목록에 없는 URL 로만 닿는 유료 화면이 생긴다.
    const shipped = new Set(shippedThemes().map((theme) => theme.id))

    for (const id of resolvedThemeIds()) expect({ id, shipped: shipped.has(id) }).toEqual({ id, shipped: true })
  })

  it('판정 파일을 만들어 두고 등록을 잊지 않았다', () => {
    // 파일은 있는데 index 에 안 걸리면 그 테마는 조용히 죽어 있다. 파일 목록으로 되짚는다.
    const files = readdirSync(RESOLVER_DIR)
      .filter((name) => name.endsWith('.ts') && name !== 'index.ts')
      .map((name) => name.replace(/\.ts$/, ''))

    expect([...files].sort()).toEqual([...resolvedThemeIds()].sort())
  })

  it('레지스트리 키와 판정기가 말하는 id 가 같다', () => {
    for (const id of resolvedThemeIds()) expect(themeResolver(id)?.themeId).toBe(id)
  })

  it('모르는 id 는 null 이다 (URL 로 아무 문자열이나 들어온다)', () => {
    expect(themeResolver('없는테마')).toBeNull()
    expect(themeResolver('')).toBeNull()
    // 🔴 프로토타입 오염 경로 — Record 를 그대로 인덱싱하면 함수 객체가 새어 나온다.
    expect(themeResolver('constructor')).toBeNull()
    expect(themeResolver('toString')).toBeNull()
  })
})

describe('레지스트리 — 판정기 모양', () => {
  it('세운 오프셋을 선언하고, 그 안에 «올해»가 들어 있다', () => {
    for (const id of resolvedThemeIds()) {
      const resolver = themeResolver(id)

      expect(resolver?.yearOffsets.length).toBeGreaterThan(0)
      expect(resolver?.yearOffsets).toContain(0)
      for (const offset of resolver?.yearOffsets ?? []) expect(Number.isInteger(offset)).toBe(true)
    }
  })

  it('🔴 테마마다 새 AnalysisType 을 만들지 않는다 (마스터 §5-4)', () => {
    // getAnalysisTypeGuide 가 Record 전수 매핑이라 늘수록 유지비가 붙고, 테마는 계속 늘어난다.
    const allowed = ['TREND_CAREER', 'TREND_LOVE', 'TREND_EXAM', 'TREND_WEALTH', 'WEALTH_DEEP', 'COMPATIBILITY']

    for (const id of resolvedThemeIds()) {
      expect(allowed).toContain(themeResolver(id)?.prompt.analysisType)
    }
  })

  it('테마 고유 지시는 질문 한 문장 + 규율 + 금지 소재로 이뤄진다', () => {
    for (const id of resolvedThemeIds()) {
      const contract = themeResolver(id)?.prompt

      expect(contract?.question.trim().length).toBeGreaterThan(0)
      expect(contract?.rules.length).toBeGreaterThan(0)
      expect(contract?.forbidden.length).toBeGreaterThan(0)
    }
  })
})

describe('레지스트리 — 금지어 (마스터 §9-3 · 직장·재물 §3-3 승계)', () => {
  /** 앱 전역 5종 + 효과 단정 + 채용 판단. `themes.test.ts` 와 같은 배열을 프롬프트에도 건다. */
  const BANNED = [
    '매일',
    '무제한',
    '평생',
    '모두 이용',
    '정액',
    '보장',
    '반드시',
    '확실히',
    '최고',
    '유일',
    '1위',
    '급등',
    '대박',
    '완치',
    '채용',
    '뽑',
    '지원자',
    '적합도',
    '선발',
    '합격',
    '승진',
  ]

  it('AI 에게 보내는 문장에도 금지어가 없다', () => {
    // 프롬프트는 화면에 안 보이지만 **결과 문장의 어휘를 만든다.** 여기서 새면 결과에서 샌다.
    for (const id of resolvedThemeIds()) {
      const contract = themeResolver(id)?.prompt
      const lines = [contract?.question ?? '', ...(contract?.rules ?? []), ...(contract?.forbidden ?? [])]

      for (const line of lines) {
        for (const word of BANNED) {
          // 「~를 쓰지 마라」 형태로 금지어를 인용하는 것은 허용한다(그게 금지 목록의 일이다).
          if (contract?.forbidden.includes(line)) continue
          expect(`${id}: ${line}`).not.toContain(word)
        }
      }
    }
  })
})
