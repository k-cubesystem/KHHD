/**
 * 가족 초대 토큰 — 발급·해싱 (서버 전용).
 *
 * node:crypto 를 잡으므로 **클라이언트 컴포넌트에서 import 금지**.
 * 판정·문구는 crypto 없는 `invite.ts` 에 있다.
 */

import { createHash, randomBytes } from 'node:crypto'
import { INVITE_TOKEN_PATTERN } from './invite'

/** 토큰 엔트로피(바이트). 32바이트=256비트 — 추측 공격이 성립하지 않는 구간. */
export const INVITE_TOKEN_BYTES = 32

/** 새 초대 토큰 원문. base64url 이라 URL 에 그대로 실린다(패딩 없는 43자). */
export function generateInviteToken(): string {
  const token = randomBytes(INVITE_TOKEN_BYTES).toString('base64url')
  // 형식 계약(43자 base64url)이 어긋나면 수락 경로가 통째로 막힌다 — 발급 순간에 잡는다.
  if (!INVITE_TOKEN_PATTERN.test(token)) {
    throw new Error('초대 토큰 형식 계약 위반')
  }
  return token
}

/** DB 에 저장·조회할 때 쓰는 단방향 해시(hex). 같은 토큰은 항상 같은 해시다. */
export function hashInviteToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}
