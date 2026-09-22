/**
 * 이용권 전환(2026-09-18) 표면 문구 회귀 — 약관·개인정보·랜딩·공유·이벤트 지면.
 *
 * 토스 심사가 «충전으로 읽히지 않는가»를 볼 때 대조하는 곳이 이 지면들이다(PRD §7조건:
 * 이월 불가 · 양도 불가 약관 명시 · 유효기간 명시 · 비례 환불 산식 · 금지 어휘 제거).
 * 한 곳에 옛 어휘가 남거나 숫자가 손으로 박히면 캡처와 설명이 어긋난다.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { findBannedPassTerms } from '@/lib/domain/entitlement/pass'

const ROOT = join(__dirname, '..', '..', '..')
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8')

const SURFACES = [
  'app/terms/page.tsx',
  'app/privacy/page.tsx',
  'components/landing/story/story-closing.tsx',
  'components/landing/story/story-offerings.tsx',
  'components/landing/story/story-trust.tsx',
  'app/share/[token]/share-page-client.tsx',
  'app/share/saju/[token]/shared-saju-result.tsx',
  'app/event/[slug]/apply-form.tsx',
  'app/event/[slug]/result/[token]/page.tsx',
  'app/saju3/[type]/page.tsx',
  'app/saju3/saju3-form.tsx',
  'app/protected/events/seasonal/page.tsx',
  'lib/data/seasonal-events.ts',
]

describe('표면 지면 — 금지어', () => {
  it.each(SURFACES)('%s 에 잔액형 재화 어휘가 없다', (rel) => {
    expect(findBannedPassTerms(read(rel))).toEqual([])
  })
})

describe('이용약관 — 충전으로 읽히지 않기 위한 조항', () => {
  const TERMS = read('app/terms/page.tsx')

  it('양도 불가 · 유효기간 · 이월 없음이 약관에 적혀 있다', () => {
    expect(TERMS).toContain('양도하거나 재판매할 수 없습니다')
    expect(TERMS).toContain('{PASS_VALID_DAYS}일')
    expect(TERMS).toContain('이월되지 않습니다')
  })

  it('환불 숫자는 정본 상수에서 온다 — 손으로 적지 않는다', () => {
    expect(TERMS).toContain('LATE_CANCEL_FEE_RATE')
    expect(TERMS).toContain('{WITHDRAWAL_PERIOD_DAYS}일')
    expect(/\d+%/.test(TERMS)).toBe(false)
  })

  it('무상 이용권은 환불 대상이 아니다', () => {
    expect(TERMS).toContain('무상으로 제공한 이용권은 환불 대상이 아닙니다')
  })

  // 멤버십 해지 화면이 «이용약관 제7조 제3항»을 근거로 든다 — 조항 순서가 밀리면 근거가 엉뚱한 곳을 가리킨다.
  it('제7조 제3항이 멤버십 환불 조항이고, 두 비율을 더하지 않는다', () => {
    const start = TERMS.indexOf('<h2>제7조')
    const end = TERMS.indexOf('<h2>제8조', start)
    expect(start).toBeGreaterThan(-1)
    const topLevelItems = TERMS.slice(start, end)
      .replace(/<ul>[\s\S]*?<\/ul>/g, '')
      .split('<li>')
      .slice(1)
    expect(topLevelItems[2]).toContain('멤버십')
    expect(topLevelItems[2]).toContain('두 비율을 더하지')
  })
})

// typography 플러그인이 없어 prose 가 목록 번호를 주지 않았다 — 항 번호 없이 «제6조 제5항»을 읽을 수 없었다(2026-09-22).
describe('법률 문서 — 항 번호와 글머리가 화면에 보인다', () => {
  const LEGAL_PAGES = ['app/terms/page.tsx', 'app/privacy/page.tsx', 'app/pass-policy/page.tsx']
  const CSS = read('app/globals.css')

  it.each(LEGAL_PAGES)('%s 본문이 legal-doc 목록 규칙을 받는다', (rel) => {
    expect(read(rel)).toMatch(/<article className="legal-doc /)
  })

  it('번호 목록은 ①② 원문자, 글머리 목록은 점으로 그린다', () => {
    expect(CSS).toMatch(/@counter-style legal-circled \{[^}]*symbols: '①' '②' '③'/)
    expect(CSS).toMatch(/\.legal-doc ol \{[^}]*list-style: legal-circled;/)
    expect(CSS).toMatch(/\.legal-doc ul \{[^}]*list-style: disc;/)
  })
})

describe('랜딩 신뢰 지면 — 환불 문구 단일 출처', () => {
  it('story-trust 는 정본 함수를 쓰고 비율을 직접 적지 않는다', () => {
    const source = read('components/landing/story/story-trust.tsx')
    expect(source).toContain('chargeRefundPolicyLine')
    expect(/이후\s*\d+%/.test(source)).toBe(false)
  })
})
