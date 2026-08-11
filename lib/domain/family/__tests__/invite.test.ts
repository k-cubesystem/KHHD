import {
  INVITE_TOKEN_PATTERN,
  INVITE_TTL_HOURS,
  buildInviteUrl,
  formatInviteRemaining,
  inviteExpiryDate,
  inviteRejectionMessage,
  isInviteExpired,
  isInviteToken,
  resolveInviteViewStatus,
  toInviteRejection,
} from '../invite'
import { INVITE_TOKEN_BYTES, generateInviteToken, hashInviteToken } from '../invite-token'
import { safeNextPath } from '@/lib/auth/next-path'

describe('가족 초대 토큰 — 발급', () => {
  it('32바이트(256비트) 엔트로피를 base64url 43자로 싣는다', () => {
    expect(INVITE_TOKEN_BYTES).toBe(32)
    const token = generateInviteToken()
    expect(token).toHaveLength(43)
    expect(INVITE_TOKEN_PATTERN.test(token)).toBe(true)
  })

  it('URL 에 그대로 실을 수 있다 — 인코딩이 필요한 문자가 없다', () => {
    for (let i = 0; i < 50; i += 1) {
      const token = generateInviteToken()
      expect(encodeURIComponent(token)).toBe(token)
    }
  })

  it('같은 토큰이 두 번 나오지 않는다', () => {
    const tokens = new Set(Array.from({ length: 500 }, () => generateInviteToken()))
    expect(tokens.size).toBe(500)
  })
})

describe('가족 초대 토큰 — 해싱', () => {
  it('결정론적이다 — 같은 토큰은 항상 같은 해시', () => {
    const token = generateInviteToken()
    expect(hashInviteToken(token)).toBe(hashInviteToken(token))
  })

  it('sha256 hex 64자이며 원문을 담지 않는다(단방향)', () => {
    const token = generateInviteToken()
    const hash = hashInviteToken(token)
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
    expect(hash).not.toContain(token)
    expect(hash).not.toBe(token)
  })

  it('한 글자만 달라도 완전히 다른 해시가 된다', () => {
    expect(hashInviteToken('a'.repeat(43))).not.toBe(hashInviteToken(`${'a'.repeat(42)}b`))
  })
})

describe('가족 초대 토큰 — 형식 검사(DB 를 두드리기 전 관문)', () => {
  it('발급된 토큰은 통과한다', () => {
    expect(isInviteToken(generateInviteToken())).toBe(true)
  })

  it.each([
    ['빈 문자열', ''],
    ['짧은 토큰', 'abc'],
    ['긴 토큰', 'a'.repeat(44)],
    ['base64url 이 아닌 문자', `${'a'.repeat(42)}+`],
    ['SQL 조각', "' or 1=1--"],
    ['경로 탈출', '../../etc/passwd'],
  ])('%s 은(는) 기각한다', (_label, value) => {
    expect(isInviteToken(value)).toBe(false)
  })

  it.each([[null], [undefined], [42], [{}], [['a']]])('문자열이 아닌 %p 는 기각한다', (value) => {
    expect(isInviteToken(value)).toBe(false)
  })
})

describe('가족 초대 — 수명(72시간)', () => {
  const now = new Date('2026-08-11T00:00:00.000Z')

  it('만료는 발급 시각 + 72시간이다', () => {
    const expiry = inviteExpiryDate(now)
    expect(expiry.getTime() - now.getTime()).toBe(INVITE_TTL_HOURS * 60 * 60 * 1000)
    expect(INVITE_TTL_HOURS).toBe(72)
  })

  it('만료 1분 전은 살아 있고, 만료 시각 정각부터는 죽는다', () => {
    const expiry = inviteExpiryDate(now)
    expect(isInviteExpired(expiry, new Date(expiry.getTime() - 60_000))).toBe(false)
    expect(isInviteExpired(expiry, expiry)).toBe(true)
    expect(isInviteExpired(expiry, new Date(expiry.getTime() + 1))).toBe(true)
  })

  it('파싱할 수 없는 값은 만료로 본다(안전 측 실패)', () => {
    expect(isInviteExpired('언젠가', now)).toBe(true)
    expect(isInviteExpired('', now)).toBe(true)
  })

  it('pending 이라도 시간이 지났으면 화면에서는 expired 다', () => {
    const expiry = inviteExpiryDate(now).toISOString()
    expect(resolveInviteViewStatus('pending', expiry, now)).toBe('pending')
    expect(resolveInviteViewStatus('pending', expiry, new Date('2026-08-20T00:00:00.000Z'))).toBe('expired')
  })

  it('이미 소진·취소된 초대는 시간과 무관하게 그 상태 그대로다', () => {
    const expiry = inviteExpiryDate(now).toISOString()
    const later = new Date('2026-08-20T00:00:00.000Z')
    expect(resolveInviteViewStatus('accepted', expiry, later)).toBe('accepted')
    expect(resolveInviteViewStatus('revoked', expiry, later)).toBe('revoked')
  })

  it('남은 시간 문구는 시간→분→만료 순으로 내려간다', () => {
    const expiry = inviteExpiryDate(now)
    expect(formatInviteRemaining(expiry, now)).toBe('72시간 남음')
    expect(formatInviteRemaining(expiry, new Date(expiry.getTime() - 30 * 60_000))).toBe('30분 남음')
    expect(formatInviteRemaining(expiry, expiry)).toBe('만료됨')
  })
})

describe('가족 초대 — URL', () => {
  it('/invite/family/<token> 으로 만든다', () => {
    expect(buildInviteUrl('https://k-haehwadang.com', 'TOKEN')).toBe('https://k-haehwadang.com/invite/family/TOKEN')
  })

  it('origin 끝의 슬래시를 흡수한다', () => {
    expect(buildInviteUrl('https://k-haehwadang.com///', 'TOKEN')).toBe('https://k-haehwadang.com/invite/family/TOKEN')
  })
})

describe('가족 초대 — 거절 사유', () => {
  it('알려진 사유는 그대로 통과한다', () => {
    expect(toInviteRejection('SELF')).toBe('SELF')
    expect(toInviteRejection('LIMIT')).toBe('LIMIT')
    expect(toInviteRejection('USED')).toBe('USED')
  })

  it('모르는 값은 ERROR 로 눕는다 — 미확인 문자열이 화면에 새지 않는다', () => {
    expect(toInviteRejection('WHO_KNOWS')).toBe('ERROR')
    expect(toInviteRejection(null)).toBe('ERROR')
    expect(toInviteRejection(500)).toBe('ERROR')
  })

  it('모든 사유에 한국어 문구가 있다', () => {
    for (const reason of ['SELF', 'USED', 'EXPIRED', 'LIMIT', 'RATE_LIMIT', 'REVOKED'] as const) {
      expect(inviteRejectionMessage(reason).length).toBeGreaterThan(0)
    }
  })
})

describe('로그인 복귀 경로 — 오픈 리다이렉트 차단', () => {
  it('같은 출처의 절대경로만 통과한다', () => {
    expect(safeNextPath('/invite/family/abc')).toBe('/invite/family/abc')
    expect(safeNextPath('/protected/family?tab=1')).toBe('/protected/family?tab=1')
  })

  it.each([
    ['프로토콜 상대 URL', '//evil.com'],
    ['백슬래시 우회', '/\\evil.com'],
    ['절대 URL', 'https://evil.com'],
    ['상대 경로', 'protected/family'],
    ['빈 값', ''],
  ])('%s 은(는) 기각한다', (_label, value) => {
    expect(safeNextPath(value)).toBeNull()
  })

  it('null·undefined 는 기각한다', () => {
    expect(safeNextPath(null)).toBeNull()
    expect(safeNextPath(undefined)).toBeNull()
  })
})
