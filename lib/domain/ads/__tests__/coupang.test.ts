import {
  coupangAuthorization,
  coupangSignMessage,
  coupangSignedDate,
  sanitizeSubId,
  COUPANG_DEEPLINK_PATH,
} from '../coupang'
import { AD_DISCLOSURE_COUPANG, kstDayStartUtcIso } from '../rewarded'

describe("coupangSignedDate — yyMMdd'T'HHmmss'Z' (UTC·연도 2자리)", () => {
  it('UTC 기준으로 포맷한다', () => {
    expect(coupangSignedDate(new Date('2026-08-22T10:30:05Z'))).toBe('260822T103005Z')
  })
  it('한 자리 월·일·시·분·초는 0 패딩', () => {
    expect(coupangSignedDate(new Date('2026-01-03T04:05:06Z'))).toBe('260103T040506Z')
  })
})

describe('coupangSignMessage — 서명 대상 = date+method+path(+query)', () => {
  it('쿼리 없으면 path 까지만', () => {
    expect(coupangSignMessage('260822T103005Z', 'POST', COUPANG_DEEPLINK_PATH)).toBe(
      `260822T103005ZPOST${COUPANG_DEEPLINK_PATH}`
    )
  })
  it('쿼리는 ? 없이 그대로 이어 붙는다', () => {
    expect(coupangSignMessage('D', 'GET', '/p', 'a=1&b=2')).toBe('DGET/pa=1&b=2')
  })
})

describe('coupangAuthorization — CEA 헤더 조립', () => {
  it('스펙 형식 그대로', () => {
    expect(coupangAuthorization('AK', 'D', 'SIG')).toBe(
      'CEA algorithm=HmacSHA256, access-key=AK, signed-date=D, signature=SIG'
    )
  })
})

describe('sanitizeSubId — 영숫자만·40자 상한', () => {
  it('uuid 하이픈 제거', () => {
    expect(sanitizeSubId('e742191a-440b-4e65-a981-879a9d891c8d')).toBe('e742191a440b4e65a981879a9d891c8d')
  })
  it('특수문자 제거 + 40자 컷', () => {
    const long = 'x'.repeat(60) + '!@#'
    expect(sanitizeSubId(long)).toHaveLength(40)
    expect(sanitizeSubId('한글abc-123')).toBe('abc123')
  })
})

describe('kstDayStartUtcIso — AI 예산 집계 경계(KST 하루 시작의 UTC 표기)', () => {
  it('KST 저녁(UTC 오전)은 같은 KST 날짜의 시작으로', () => {
    // UTC 08-22 10:00 = KST 08-22 19:00 → KST 08-22 00:00 = UTC 08-21 15:00
    expect(kstDayStartUtcIso(new Date('2026-08-22T10:00:00Z'))).toBe('2026-08-21T15:00:00.000Z')
  })
  it('KST 새벽(UTC 전날 밤)은 넘어간 KST 날짜의 시작으로', () => {
    // UTC 08-22 20:00 = KST 08-23 05:00 → KST 08-23 00:00 = UTC 08-22 15:00
    expect(kstDayStartUtcIso(new Date('2026-08-22T20:00:00Z'))).toBe('2026-08-22T15:00:00.000Z')
  })
})

describe('AD_DISCLOSURE_COUPANG — 대가성 고지 단일 출처', () => {
  it('쿠팡 파트너스·수수료 문구를 포함한다', () => {
    expect(AD_DISCLOSURE_COUPANG).toContain('쿠팡 파트너스')
    expect(AD_DISCLOSURE_COUPANG).toContain('수수료')
  })
})
