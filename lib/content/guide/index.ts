import type { GuideArticle, GuideCategory, GuideCategoryId } from './types'
import { BASICS_ARTICLES } from './basics'
import { RELATIONS_ARTICLES } from './relations'
import { SIPSEONG_ARTICLES } from './sipseong'
import { FLOW_ARTICLES } from './flow'
import { STRUCTURE_ARTICLES } from './structure'
import { APPLIED_ARTICLES } from './applied'
import { READING_ARTICLES } from './reading'

export type { GuideArticle, GuideCategory, GuideCategoryId, GuideSection } from './types'

/** 목록 순서 = 읽는 순서. 기초에서 응용으로. */
export const GUIDE_CATEGORIES: readonly GuideCategory[] = [
  { id: 'basics', name: '사주의 기초', hanja: '基礎', blurb: '음양·오행·천간·지지 — 여덟 글자를 이루는 재료' },
  { id: 'relations', name: '글자들의 관계', hanja: '合沖', blurb: '합·충·형·파·해 — 글자끼리 어떻게 당기고 미는가' },
  { id: 'sipseong', name: '십성', hanja: '十星', blurb: '나(일간)를 기준으로 본 열 가지 관계' },
  { id: 'flow', name: '운의 흐름', hanja: '運路', blurb: '대운·세운·십이운성·신살 — 시간이 더하는 것' },
  { id: 'structure', name: '격국과 용신', hanja: '格局 用神', blurb: '명식의 틀과 그 틀을 살리는 글자' },
  { id: 'applied', name: '궁합·관상·손금·풍수', hanja: '應用', blurb: '사주 바깥의 네 가지 읽기' },
  { id: 'reading', name: '해화당의 읽기', hanja: '海華堂', blurb: '계산과 해석을 어떻게 나누어 읽는가' },
]

export const GUIDE_ARTICLES: readonly GuideArticle[] = [
  ...BASICS_ARTICLES,
  ...RELATIONS_ARTICLES,
  ...SIPSEONG_ARTICLES,
  ...FLOW_ARTICLES,
  ...STRUCTURE_ARTICLES,
  ...APPLIED_ARTICLES,
  ...READING_ARTICLES,
]

export const GUIDE_SLUGS: readonly string[] = GUIDE_ARTICLES.map((a) => a.slug)

const BY_SLUG: ReadonlyMap<string, GuideArticle> = new Map(GUIDE_ARTICLES.map((a) => [a.slug, a]))

export function isGuideSlug(slug: string): boolean {
  return BY_SLUG.has(slug)
}

export function getGuideArticle(slug: string): GuideArticle | undefined {
  return BY_SLUG.get(slug)
}

export function getGuideCategory(id: GuideCategoryId): GuideCategory {
  const found = GUIDE_CATEGORIES.find((c) => c.id === id)
  if (!found) throw new Error(`unknown guide category: ${id}`)
  return found
}

export function articlesInCategory(id: GuideCategoryId): readonly GuideArticle[] {
  return GUIDE_ARTICLES.filter((a) => a.category === id)
}

/** 같은 카테고리 안의 앞·뒤 글 — 본문 끝 이동용 */
export function neighbors(slug: string): { prev?: GuideArticle; next?: GuideArticle } {
  const article = BY_SLUG.get(slug)
  if (!article) return {}
  const siblings = articlesInCategory(article.category)
  const i = siblings.findIndex((a) => a.slug === slug)
  return { prev: i > 0 ? siblings[i - 1] : undefined, next: i < siblings.length - 1 ? siblings[i + 1] : undefined }
}

/** 본문 글자 수(공백 제외) — 목록의 읽기 시간과 콘텐츠 최소 길이 검증에 쓴다 */
export function bodyLength(article: GuideArticle): number {
  return article.sections
    .flatMap((s) => [s.heading, ...s.paragraphs, ...(s.list ?? [])])
    .join('')
    .replace(/\s+/g, '').length
}

export function readingMinutes(article: GuideArticle): number {
  return Math.max(1, Math.round(bodyLength(article) / 500))
}
