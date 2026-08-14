/**
 * 「푼 것은 반드시 기록에 남는다」의 계약 (CEO 지시 2026-08-15).
 *
 * ## 왜 소스를 읽어서 재는가
 * 저장은 **부가 작업으로 설계돼 있다** — 실패해도 사용자는 방금 산 풀이를 받는다(관측 래퍼가
 * Sentry 로만 잇는다). 그 설계는 옳지만, 그래서 **저장 호출을 아예 빠뜨려도 아무도 모른다.**
 * 런타임 테스트로는 «부르지 않은 것»을 잡을 수 없으므로 배선 자체를 본다.
 *
 * ## 🔴 카테고리 값은 DB CHECK 제약과 한 글자도 어긋나면 안 된다
 * 어긋나면 insert 가 조용히 실패하고 기록만 사라진다. SAMHAP 이 정확히 그 사고였고
 * (마이그레이션이 코드보다 늦게 적용됐다), THEME 은 그 전례 덕에 순서를 지켜 넘어갔다.
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { FREE_TIER_LIMITS } from '@/lib/domain/payment/membership-benefits'

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

/**
 * 라이브 DB 의 `analysis_history_category_check` 그대로(확인일 2026-08-15).
 * 여기에 값을 더할 때는 **마이그레이션을 먼저 적용**하고 코드를 나중에 배포한다.
 */
const DB_ALLOWED_CATEGORIES = [
  'SAJU',
  'FACE',
  'HAND',
  'FENGSHUI',
  'COMPATIBILITY',
  'TODAY',
  'WEALTH',
  'NEW_YEAR',
  'SAMHAP',
  'THEME',
] as const

/** 복채를 받는 풀이 액션 — 여기 있는 것은 예외 없이 기록을 남겨야 한다. */
const PAID_ANALYSIS_ACTIONS = [
  'app/actions/ai/samhap.ts',
  'app/actions/ai/cheonjiin.ts',
  'app/actions/ai/compatibility.ts',
  'app/actions/ai/wealth.ts',
  'app/actions/ai/image.ts',
  'app/actions/theme-fortune/analyze.ts',
] as const

describe('기록 저장 — 푼 것은 남는다', () => {
  it('🔴 복채를 받는 풀이 전부가 기록 저장을 부른다', () => {
    for (const path of PAID_ANALYSIS_ACTIONS) {
      const source = read(path)
      const saves = /saveAnalysisHistory(Observed)?\(|persistImageAnalysisHistory\(/.test(source)

      expect({ path, saves }).toEqual({ path, saves: true })
    }
  })

  it('무료 풀이도 기록을 남긴다 (오늘의 운세·흐름·신년)', () => {
    // 무료라고 안 남기면 「어제 본 그 풀이」를 다시 못 찾는다 — 재방문의 이유가 사라진다.
    for (const path of ['app/actions/fortune/daily.ts', 'app/actions/ai/trend.ts', 'app/actions/ai/year2026.ts']) {
      const saves = /saveAnalysisHistory(Observed)?\(/.test(read(path))

      expect({ path, saves }).toEqual({ path, saves: true })
    }
  })

  it('🔴 코드가 쓰는 category 는 전부 DB CHECK 제약 안에 있다', () => {
    const sources = [...PAID_ANALYSIS_ACTIONS, 'app/actions/fortune/daily.ts', 'app/actions/ai/year2026.ts']
    const used = new Set<string>()

    for (const path of sources) {
      for (const match of read(path).matchAll(/category:\s*'([A-Z_]+)'/g)) used.add(match[1])
    }

    expect(used.size).toBeGreaterThan(0)
    for (const category of used) {
      expect({ category, allowed: (DB_ALLOWED_CATEGORIES as readonly string[]).includes(category) }).toEqual({
        category,
        allowed: true,
      })
    }
  })
})

describe('보관 한도 — 무료 5 · 멤버십 20 (CEO 2026-08-15)', () => {
  it('무료는 다섯 개까지 남는다', () => {
    expect(FREE_TIER_LIMITS.storageLimit).toBe(5)
  })

  it('한도를 못 읽으면 무료 기준으로 떨어진다 (넉넉히 잡으면 한도가 없는 셈이 된다)', () => {
    expect(read('app/actions/user/history.ts')).toContain('limits?.storage_limit ?? FREE_TIER_LIMITS.storageLimit')
  })

  it('초과분은 즐겨찾기가 아닌 오래된 것부터 지운다 (찜해 둔 풀이는 살아남는다)', () => {
    const source = read('app/actions/user/history.ts')

    expect(source).toContain("eq('is_favorite', false)")
    expect(source).toContain("order('created_at', { ascending: true })")
  })

  it('멤버십 20 은 DB 행에 있고, 그 값을 되돌리지 않도록 마이그레이션으로 남겼다', () => {
    // DB 에만 손대면 다음 재구축에서 옛 값으로 되돌아간다(7/4 재구축 전례).
    const migration = read('supabase/migrations/20260815_storage_limit_5_20.sql')

    expect(migration).toContain('storage_limit = 20')
    expect(migration).toMatch(/SINGLE.*FAMILY.*BUSINESS/)
  })
})
