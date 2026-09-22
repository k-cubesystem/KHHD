/**
 * /pass-policy 문구 회귀 — 결제 심사 캡처 대상이자 동의 문구가 가리키는 «이용권 안내·환불 정책» 지면.
 *
 * 2026-09-19 배포 전 리뷰에서 나온 두 결함을 못 박는다.
 *  ① «이미 본 풀이를 같은 조건으로 다시 열면 이용권을 쓰지 않습니다» — 조건 없는 단정. 실제로는 풀이마다
 *     기간이 다르고(사주 시간 단위 · 궁합·테마 일 단위), 캐시가 아예 없는 풀이도 있다.
 *  ② 사용처를 손으로 골라 적어 등급 조건(패밀리·비즈니스·멤버십)이 빠지고 주문 확인 화면과 다른 목록이 됐다.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { findBannedPassTerms } from '@/lib/domain/entitlement/pass'
import { COMPATIBILITY_CACHE_DAYS, SAJU_CACHE_HOURS } from '@/lib/domain/payment/cache-windows'

const ROOT = join(__dirname, '..', '..', '..')
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8')

const PAGE = read('app/pass-policy/page.tsx')
const PAGE_COPY = PAGE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('/pass-policy — 사용처는 단일 출처', () => {
  it('주문 확인 화면과 같은 목록(passUsageFeatures)을 그리고 최소 등급을 함께 적는다', () => {
    expect(PAGE).toContain('passUsageFeatures()')
    expect(PAGE).toContain('f.minTierLabel')
    expect(PAGE).toContain('멤버십부터')
  })

  it('풀이 이름·장 수를 손으로 나열하지 않는다', () => {
    expect(PAGE).not.toContain('DEEP_READINGS')
    expect(PAGE_COPY).not.toMatch(/사주·궁합·관상/)
    expect(PAGE_COPY).not.toMatch(/FEATURE_COST\.\w+\.display/)
  })
})

describe('/pass-policy — 다시 볼 때 이용권을 쓰지 않는 조건', () => {
  it('조건 없는 단정이 남아 있지 않다', () => {
    expect(PAGE_COPY).not.toContain('이미 본 풀이를 같은 조건으로 다시 열면')
  })

  it('기간은 캐시 판정이 보는 상수에서 온다 — 숫자를 손으로 적지 않는다', () => {
    for (const name of ['SAJU_CACHE_HOURS', 'COMPATIBILITY_CACHE_DAYS', 'THEME_CACHE_DAYS', 'NARRATIVE_CACHE_DAYS']) {
      expect(PAGE).toContain(name)
    }
    expect(PAGE_COPY).not.toMatch(/\d+\s*시간/)
    expect(PAGE_COPY).not.toMatch(/\d+일/)
  })

  it('기간이 지나면 다시 쓴다는 것과 매번 새로 푸는 풀이를 함께 밝힌다', () => {
    expect(PAGE_COPY).toContain('그 기간이 지났거나')
    expect(PAGE_COPY).toContain('실행할 때마다 새로 풀기 때문에')
  })

  it('캐시 판정도 같은 상수를 본다 — 화면과 서버가 다른 기간을 말하지 않는다', () => {
    const saju = read('app/actions/ai/cheonjiin.ts')
    expect(saju).toContain("getCachedAnalysis(user.id, targetId, 'SAJU', SAJU_CACHE_HOURS)")
    expect(saju).toContain('isCacheValid(cached, SAJU_CACHE_HOURS)')
    expect(read('app/actions/ai/compatibility.ts')).toContain('cutoff.getDate() - COMPATIBILITY_CACHE_DAYS')
  })

  it('기간 값 — 바꾸면 약관·심사 문서의 설명도 같이 바꿔야 한다', () => {
    expect(SAJU_CACHE_HOURS).toBe(24)
    expect(COMPATIBILITY_CACHE_DAYS).toBe(7)
  })
})

describe('/pass-policy — 금지어', () => {
  it('화면 문구에 잔액형 재화 어휘가 없다', () => {
    expect(findBannedPassTerms(PAGE_COPY)).toEqual([])
  })

  // 토스가 빌링을 거절한 사유가 «충전 형태»였다 — 멤버십 이용권을 «채워진다»고 쓰면 같은 그림으로 읽힌다(2026-09-22).
  it('멤버십 이용권을 «채운다»로 설명하지 않는다', () => {
    expect(PAGE_COPY).not.toMatch(/채워|채움|채운다/)
  })
})
