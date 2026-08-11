/**
 * 가족 초대 링크 — 순수 도메인(수명주기 판정·거절 사유 문구).
 *
 * 토큰은 **원문이 DB 에 남지 않는다**. 발급 순간 원문을 초대자 화면에 한 번 보여주고,
 * DB 에는 sha256 해시만 넣는다. 그래서 초대 목록에서 링크를 다시 꺼내볼 수 없고,
 * 잃어버리면 재발급(=구토큰 무효)뿐이다 — 일회용 비밀의 값은 그 불편에서 나온다.
 *
 * 이 파일은 **클라이언트에서도 안전하다**(순수 함수만). 토큰을 빚고 해싱하는 일은
 * node:crypto 를 잡는 `invite-token.ts` 로 갈라 두었다 — 화면 컴포넌트가 그쪽을 물면 번들이 깨진다.
 */

/** 초대 유효 시간(시간). */
export const INVITE_TTL_HOURS = 72

/** base64url 로 인코딩한 32바이트 = 패딩 없는 43자. 형식 검사는 이 한 벌만 쓴다. */
export const INVITE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/

/** DB status 원값. */
export type InviteStatus = 'pending' | 'accepted' | 'revoked'

/** 화면용 상태 — pending 이라도 시간이 지났으면 expired 로 읽는다. */
export type InviteViewStatus = InviteStatus | 'expired'

/** 거절 사유 — RPC reason 과 서버 액션 자체 판정을 합친 단일 집합. */
export type InviteRejection =
  | 'UNAUTHENTICATED'
  | 'RATE_LIMIT'
  | 'INVALID_TOKEN'
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'EXPIRED'
  | 'USED'
  | 'REVOKED'
  | 'SELF'
  | 'ALREADY_LINKED'
  | 'ALREADY_MEMBER'
  | 'MEMBER_GONE'
  | 'LIMIT'
  | 'NO_MEMBERSHIP'
  | 'ERROR'

const REJECTION_MESSAGES: Record<InviteRejection, string> = {
  UNAUTHENTICATED: '로그인이 필요합니다.',
  RATE_LIMIT: '요청이 너무 잦습니다. 잠시 후 다시 시도해주세요.',
  INVALID_TOKEN: '올바르지 않은 초대 링크입니다.',
  NOT_FOUND: '존재하지 않는 초대입니다.',
  FORBIDDEN: '권한이 없습니다.',
  EXPIRED: '초대 유효기간(72시간)이 지났습니다. 초대한 분께 링크를 다시 받아주세요.',
  USED: '이미 사용된 초대입니다.',
  REVOKED: '취소된 초대입니다.',
  SELF: '자신이 만든 초대는 수락할 수 없습니다.',
  ALREADY_LINKED: '이 자리에는 이미 다른 계정이 연결되어 있습니다.',
  ALREADY_MEMBER: '이미 이 가족에 연결되어 있습니다.',
  MEMBER_GONE: '초대한 가족 정보가 삭제되었습니다.',
  LIMIT: '초대한 분의 인연 한도가 가득 찼습니다. 멤버십 등급을 올리면 늘어납니다.',
  NO_MEMBERSHIP: '가족 초대는 멤버십 회원 전용입니다.',
  ERROR: '처리 중 오류가 발생했습니다.',
}

const REJECTIONS = new Set<string>(Object.keys(REJECTION_MESSAGES))

/** 알 수 없는 문자열(RPC 가 새 사유를 뱉는 경우 포함)은 ERROR 로 눕힌다. */
export function toInviteRejection(value: unknown): InviteRejection {
  return typeof value === 'string' && REJECTIONS.has(value) ? (value as InviteRejection) : 'ERROR'
}

export function inviteRejectionMessage(reason: InviteRejection): string {
  return REJECTION_MESSAGES[reason]
}

/** URL 파라미터를 신뢰하지 않는다 — 형식이 어긋나면 DB 를 두드리기 전에 끊는다. */
export function isInviteToken(value: unknown): value is string {
  return typeof value === 'string' && INVITE_TOKEN_PATTERN.test(value)
}

/** 발급 시각 기준 만료 시각. */
export function inviteExpiryDate(from: Date = new Date()): Date {
  return new Date(from.getTime() + INVITE_TTL_HOURS * 60 * 60 * 1000)
}

/** 파싱 불가한 값은 만료로 본다(안전 측 실패). */
export function isInviteExpired(expiresAt: string | Date, now: Date = new Date()): boolean {
  const at = expiresAt instanceof Date ? expiresAt.getTime() : Date.parse(expiresAt)
  return !Number.isFinite(at) || at <= now.getTime()
}

export function resolveInviteViewStatus(
  status: InviteStatus,
  expiresAt: string | Date,
  now: Date = new Date()
): InviteViewStatus {
  if (status !== 'pending') return status
  return isInviteExpired(expiresAt, now) ? 'expired' : 'pending'
}

/** 「62시간 남음」 — 만료가 지났으면 '만료됨'. 초대 목록·수락 화면이 같은 문구를 쓴다. */
export function formatInviteRemaining(expiresAt: string | Date, now: Date = new Date()): string {
  const at = expiresAt instanceof Date ? expiresAt.getTime() : Date.parse(expiresAt)
  if (!Number.isFinite(at)) return '만료됨'
  const ms = at - now.getTime()
  if (ms <= 0) return '만료됨'
  const hours = ms / (60 * 60 * 1000)
  // 반올림이다 — 갓 만든 72시간짜리가 「71시간 남음」으로 뜨면 발급이 잘못된 것처럼 읽힌다.
  if (hours >= 1) return `${Math.round(hours)}시간 남음`
  return `${Math.max(1, Math.ceil(ms / (60 * 1000)))}분 남음`
}

/** 초대 URL. origin 끝의 슬래시는 흡수한다. */
export function buildInviteUrl(origin: string, token: string): string {
  return `${origin.trim().replace(/\/+$/, '')}/invite/family/${token}`
}
