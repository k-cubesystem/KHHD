/**
 * 사이트 URL 단일 출처 회귀선.
 *
 * 2026-08-15 프로덕션 sitemap.xml / robots.txt 가 `https://k-haehwadang.com\n/auth/login` 처럼
 * 도메인 뒤 리터럴 개행으로 전부 깨져 있었다 — Vercel 환경변수 값 끝에 개행이 붙은 채로
 * `process.env.NEXT_PUBLIC_SITE_URL` 을 그대로 이어 붙인 결과. 값이 어떻게 오염돼도 URL 은 온전해야 한다.
 */
import { getSiteUrl, normalizeSiteUrl, PRODUCTION_SITE_URL } from '@/lib/utils/site-url'
import sitemap from '@/app/sitemap'
import robots from '@/app/robots'

const ORIGINAL = process.env.NEXT_PUBLIC_SITE_URL

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_SITE_URL
  else process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL
})

describe('normalizeSiteUrl', () => {
  it.each([
    ['후행 개행(LF)', 'https://k-haehwadang.com\n'],
    ['후행 개행(CRLF)', 'https://k-haehwadang.com\r\n'],
    ['후행 슬래시', 'https://k-haehwadang.com/'],
    ['후행 슬래시 여러 개', 'https://k-haehwadang.com///'],
    ['개행 뒤 슬래시', 'https://k-haehwadang.com\n/'],
    ['앞뒤 공백·탭', '  \thttps://k-haehwadang.com \n'],
  ])('%s 이 붙어도 origin 만 남긴다', (_label, raw) => {
    expect(normalizeSiteUrl(raw)).toBe('https://k-haehwadang.com')
  })

  it('빈 값·undefined·공백만 있으면 프로덕션 도메인으로 폴백한다', () => {
    expect(normalizeSiteUrl(undefined)).toBe(PRODUCTION_SITE_URL)
    expect(normalizeSiteUrl(null)).toBe(PRODUCTION_SITE_URL)
    expect(normalizeSiteUrl('')).toBe(PRODUCTION_SITE_URL)
    expect(normalizeSiteUrl(' \n ')).toBe(PRODUCTION_SITE_URL)
    expect(PRODUCTION_SITE_URL).toBe('https://k-haehwadang.com')
  })

  it('폴백을 지정하면 그 값을 쓴다', () => {
    expect(normalizeSiteUrl('', 'http://localhost:3000/')).toBe('http://localhost:3000/')
    expect(normalizeSiteUrl('http://localhost:3000/', 'https://x.test')).toBe('http://localhost:3000')
  })
})

describe('getSiteUrl', () => {
  it('환경변수 끝의 개행·후행 슬래시를 흡수한다', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://k-haehwadang.com/\n'
    expect(getSiteUrl()).toBe('https://k-haehwadang.com')
  })

  it('환경변수가 없으면 프로덕션 도메인이다', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL
    expect(getSiteUrl()).toBe(PRODUCTION_SITE_URL)
  })
})

describe('sitemap / robots — 오염된 환경변수에서도 URL 이 온전하다', () => {
  const ORIGIN_PATTERN = /^https:\/\/k-haehwadang\.com(\/\S*)?$/

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://k-haehwadang.com\n'
  })

  it('sitemap 의 모든 URL 에 공백·개행이 없고 origin 이 정확하다', () => {
    const urls = sitemap().map((entry) => entry.url)
    expect(urls.length).toBeGreaterThan(0)
    for (const url of urls) {
      expect(url).toMatch(ORIGIN_PATTERN)
      expect(url).not.toMatch(/\s/)
    }
    expect(urls).toContain('https://k-haehwadang.com')
  })

  it('sitemap 에는 공개 페이지만 — /protected/* 금지, /story·/webtoon.html 등재, 404 인 /auth/register 금지 · 폼뿐인 /auth/* 제외 · /guide·/about 등재', () => {
    const paths = sitemap().map((entry) => new URL(entry.url).pathname)
    expect(paths.some((path) => path.startsWith('/protected'))).toBe(false)
    expect(paths).toContain('/story')
    expect(paths).toContain('/webtoon.html')
    // 2026-09-02 애드센스 «콘텐츠 부족» 반려 대응 — 폼뿐인 인증 화면은 사이트맵에서 뺐다(얇은 페이지 집계 방지).
    expect(paths).not.toContain('/auth/sign-up')
    expect(paths).not.toContain('/auth/login')
    expect(paths).toContain('/guide')
    expect(paths).toContain('/about')
    expect(paths).not.toContain('/auth/register')
  })

  it('robots 의 sitemap 위치가 한 줄짜리 절대 URL 이다', () => {
    const result = robots()
    expect(result.sitemap).toBe('https://k-haehwadang.com/sitemap.xml')
    expect(result.rules).toEqual({ userAgent: '*', allow: '/', disallow: ['/admin/', '/api/', '/protected/'] })
  })
})
