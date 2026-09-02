/**
 * 명리 가이드 — 이 테스트가 지키는 것.
 *
 * ① 콘텐츠의 «두께»: 2026-09-02 애드센스가 「가치가 별로 없는 콘텐츠」로 반려했다. 크롤 가능한
 *    본문 총량이 약 1.3만 자(법률 문서 포함)였다. 가이드 각 편이 얇아지면 같은 반려가 돌아온다.
 * ② 문장 규율(표시광고법): 효험·적중·보장을 말하지 않는다.
 * ③ 구조 무결성: slug 유일, related 참조 유효, 사이트맵 등재.
 */
import sitemap from '@/app/sitemap'
import {
  GUIDE_ARTICLES,
  GUIDE_CATEGORIES,
  GUIDE_SLUGS,
  articlesInCategory,
  bodyLength,
  getGuideArticle,
  isGuideSlug,
  neighbors,
  readingMinutes,
} from '@/lib/content/guide'

const MIN_BODY_CHARS = 1_300

describe('명리 가이드 — 구조', () => {
  it('32편, slug 는 영문 kebab-case 이며 유일하다', () => {
    expect(GUIDE_ARTICLES).toHaveLength(32)
    for (const slug of GUIDE_SLUGS) expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    expect(new Set(GUIDE_SLUGS).size).toBe(GUIDE_SLUGS.length)
  })

  it('카테고리마다 두 편 이상, 모든 글의 category 는 등록된 것', () => {
    const ids = new Set(GUIDE_CATEGORIES.map((c) => c.id))
    for (const a of GUIDE_ARTICLES) expect(ids.has(a.category)).toBe(true)
    for (const c of GUIDE_CATEGORIES) expect(articlesInCategory(c.id).length).toBeGreaterThanOrEqual(2)
  })

  it('related 는 존재하는 다른 글만 가리킨다', () => {
    for (const a of GUIDE_ARTICLES) {
      for (const r of a.related ?? []) {
        expect(r).not.toBe(a.slug)
        expect(isGuideSlug(r)).toBe(true)
      }
    }
  })

  it('조회·이웃 헬퍼', () => {
    expect(getGuideArticle('ohaeng')?.title).toContain('오행')
    expect(getGuideArticle('nope')).toBeUndefined()
    const { prev, next } = neighbors('eumyang')
    expect(prev?.slug).toBe('saju-palja')
    expect(next?.slug).toBe('ohaeng')
    expect(neighbors('saju-palja').prev).toBeUndefined()
    expect(neighbors('nope')).toEqual({})
  })
})

describe('🔴 명리 가이드 — 두께(애드센스 «콘텐츠 부족» 회귀선)', () => {
  it.each(GUIDE_ARTICLES.map((a) => [a.slug, a] as const))('%s — 본문 두께·구조', (_slug, article) => {
    expect(bodyLength(article)).toBeGreaterThanOrEqual(MIN_BODY_CHARS)
    expect(article.sections.length).toBeGreaterThanOrEqual(3)
    for (const s of article.sections) {
      expect(s.heading.trim().length).toBeGreaterThan(0)
      expect(s.paragraphs.length).toBeGreaterThanOrEqual(1)
      for (const p of s.paragraphs) expect(p.trim().length).toBeGreaterThan(40)
    }
    expect(article.summary.length).toBeGreaterThan(30)
    expect(article.keywords.length).toBeGreaterThanOrEqual(3)
    expect(readingMinutes(article)).toBeGreaterThanOrEqual(2)
  })

  it('전체 본문이 4.5만 자를 넘는다 — 반려 시점 공개 본문 총량(약 1.3만 자)의 세 배 이상', () => {
    const total = GUIDE_ARTICLES.reduce((sum, a) => sum + bodyLength(a), 0)
    expect(total).toBeGreaterThan(45_000)
  })
})

describe('🔴 명리 가이드 — 문장 규율(표시광고법)', () => {
  const FORBIDDEN = [
    '효험이 있',
    '적중률',
    '100%',
    '보장합니다',
    '보장됩니다',
    '반드시 이루',
    '틀림없이 됩니다',
    '틀림없이 이루',
  ]

  it.each(GUIDE_ARTICLES.map((a) => [a.slug, a] as const))('%s — 효험·적중·보장 표현 없음', (_slug, article) => {
    const text =
      article.sections.flatMap((s) => [s.heading, ...s.paragraphs, ...(s.list ?? [])]).join('\n') + article.summary
    for (const phrase of FORBIDDEN) expect(text).not.toContain(phrase)
  })
})

describe('사이트맵 등재', () => {
  const entries = sitemap()
  const urls = entries.map((e) => e.url)

  it('가이드 목록과 32편 전부, 소개 페이지가 실린다', () => {
    expect(urls.some((u) => u.endsWith('/guide'))).toBe(true)
    expect(urls.some((u) => u.endsWith('/about'))).toBe(true)
    for (const slug of GUIDE_SLUGS) expect(urls.some((u) => u.endsWith(`/guide/${slug}`))).toBe(true)
  })

  it('🔴 폼뿐인 화면·디버그 페이지는 싣지 않는다', () => {
    for (const thin of ['/auth/login', '/auth/sign-up', '/test-destiny', '/dev-preview', '/protected']) {
      expect(urls.some((u) => u.includes(thin))).toBe(false)
    }
  })

  it('URL 에 공백·개행이 없고 유일하다(2026-08-15 sitemap 개행 사고 회귀선)', () => {
    for (const u of urls) expect(u).not.toMatch(/\s/)
    expect(new Set(urls).size).toBe(urls.length)
  })
})
