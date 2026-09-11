/**
 * 명리 가이드 — 로그인 없이 읽는 공개 콘텐츠의 자료 모양.
 *
 * 왜 있나: 이 서비스의 본체(풀이·신당·상점)는 전부 로그인 뒤에 있어 크롤러가 «읽을 것»을
 * 거의 못 본다. 2026-09-02 애드센스가 「가치가 별로 없는 콘텐츠」로 반려한 근인이 그것이다.
 * 가이드는 명리의 기초 개념을 우리 말로 정리한 독립 문서 묶음이며, 상품 설명이 아니다.
 *
 * 🔴 문장 규율(표시광고법 · MARKETING.md §2): 사람을 단정하지 않는다. «당신은 ~이다»가 아니라
 *    전통이 그 글자·구조를 어떻게 «읽는가»로 쓴다. 효험·적중·미래 약속 없음.
 * 🔴 이 자료는 서버 컴포넌트에서만 쓴다 — 본문 문자열이 크므로 클라이언트 번들에 싣지 않는다.
 */

export type GuideCategoryId = 'basics' | 'relations' | 'sipseong' | 'flow' | 'structure' | 'applied' | 'reading'

export interface GuideCategory {
  readonly id: GuideCategoryId
  readonly name: string
  readonly hanja: string
  /** 목록 카드 아래 한 줄 */
  readonly blurb: string
}

export interface GuideSection {
  readonly heading: string
  readonly paragraphs: readonly string[]
  /** 항목 나열이 필요한 절에만 */
  readonly list?: readonly string[]
}

export interface GuideArticle {
  /** URL 조각 — 영문 kebab-case, 전체에서 유일 */
  readonly slug: string
  readonly title: string
  readonly hanja?: string
  readonly category: GuideCategoryId
  /** 목록·메타 description — 한두 문장 */
  readonly summary: string
  readonly keywords: readonly string[]
  readonly sections: readonly GuideSection[]
  /** 함께 읽기 — 다른 글의 slug */
  readonly related?: readonly string[]
}
