'use server'

import { createHash } from 'node:crypto'
import { headers } from 'next/headers'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimitByIp, rateLimit } from '@/lib/utils/rate-limit'
import { normalizeThreadsUsername } from '@/lib/domain/threads/classify'
import { logger } from '@/lib/utils/logger'

/**
 * 이벤트 응모 — 비로그인 허용 공개 엔드포인트.
 *
 * 개인정보(생년월일시)는 여기서만 받는다. 스레드 댓글로는 받지 않는다(DM API 부재·공개 지면).
 * 공개 액션이라 이 리포의 로그인 뒤 액션들에 없는 방어가 필요하다:
 *   · IP 스로틀(10/시) + 아이디 스로틀(라운드당 1회, DB unique 가 최종 방어)
 *   · 허니팟(website 필드) + 폼 체류시간(3초 미만 거부)
 *   · zod 검증 · 저장은 admin client(RLS 의 anon INSERT WITH CHECK 와 별개로 서버가 라운드 상태를 다시 본다)
 */

const ApplySchema = z.object({
  roundSlug: z.string().min(1).max(64),
  threadsUsername: z.string().min(1).max(64),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  birthTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional()
    .or(z.literal('')),
  gender: z.enum(['male', 'female', 'other']),
  question: z.string().min(10).max(500),
  contact: z.string().max(120).optional().or(z.literal('')),
  consentPublic: z.boolean(),
  consentPrivacy: z.literal(true, { errorMap: () => ({ message: '개인정보 수집 동의가 필요합니다' }) }),
  // 봇 방어
  website: z.string().max(0).optional(), // 허니팟 — 사람은 못 보는 필드. 값이 있으면 봇
  startedAt: z.number().int(),
  utm: z.record(z.string(), z.string()).optional(),
})

export type ApplyInput = z.infer<typeof ApplySchema>
export type ApplyResult = { success: true; entryId: string } | { success: false; error: string; code?: string }

function hash(v: string): string {
  return createHash('sha256').update(v).digest('hex').slice(0, 32)
}

export async function applyToEvent(raw: unknown): Promise<ApplyResult> {
  const parsed = ApplySchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? '입력을 확인해 주세요', code: 'invalid' }
  }
  const input = parsed.data

  // 봇 방어 — 조용히 성공으로 응답해 봇이 학습하지 못하게 한다
  if (input.website && input.website.length > 0) return { success: true, entryId: 'ok' }
  if (Date.now() - input.startedAt < 3000) return { success: true, entryId: 'ok' }

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const ua = h.get('user-agent') ?? ''

  const ipGate = await rateLimitByIp(ip, 'event-apply', { interval: 60 * 60 * 1000, uniqueTokenPerInterval: 10 })
  if (!ipGate.success) return { success: false, error: '잠시 후 다시 시도해 주세요', code: 'rate' }

  const username = normalizeThreadsUsername(input.threadsUsername)
  if (username.length < 1) return { success: false, error: '스레드 아이디를 확인해 주세요', code: 'invalid' }

  const admin = createAdminClient()
  const { data: round } = await admin
    .from('event_rounds')
    .select('id, status, opens_at, closes_at')
    .eq('slug', input.roundSlug)
    .maybeSingle()
  if (!round) return { success: false, error: '이벤트를 찾을 수 없습니다', code: 'no-round' }
  const now = Date.now()
  if (round.status !== 'open' || now < Date.parse(round.opens_at) || now > Date.parse(round.closes_at)) {
    return { success: false, error: '지금은 신청 기간이 아닙니다', code: 'closed' }
  }

  const userGate = await rateLimit(`event-apply:${round.id}:${username}`, {
    interval: 24 * 60 * 60 * 1000,
    uniqueTokenPerInterval: 2,
  })
  if (!userGate.success) return { success: false, error: '이미 신청하셨어요. 발표를 기다려 주세요', code: 'dup' }

  // 로그인 상태면 연결(전환 계측·회원 가산)
  let userId: string | null = null
  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    userId = data.user?.id ?? null
  } catch {
    userId = null
  }

  const { data: inserted, error } = await admin
    .from('event_entries')
    .insert({
      round_id: round.id,
      threads_username: username,
      contact: input.contact?.trim() || null,
      birth_date: input.birthDate,
      birth_time: input.birthTime || null,
      gender: input.gender,
      question: input.question.trim(),
      consent_public: input.consentPublic,
      consent_privacy_at: new Date().toISOString(),
      ip_hash: hash(ip),
      ua_hash: hash(ua),
      utm: input.utm ?? null,
      user_id: userId,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') return { success: false, error: '이미 신청하셨어요. 발표를 기다려 주세요', code: 'dup' }
    logger.error('[event/apply] insert 실패', error.message)
    return { success: false, error: '저장에 실패했어요. 잠시 후 다시 시도해 주세요', code: 'db' }
  }
  return { success: true, entryId: inserted.id }
}

/** 응모 폼이 보여줄 라운드 공개 정보(비로그인). */
export async function getOpenRound(slug: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('event_rounds')
    .select('id, slug, title, topic, description, opens_at, closes_at, winner_count, status')
    .eq('slug', slug)
    .in('status', ['open', 'closed', 'drawn', 'published'])
    .maybeSingle()
  return data
}
