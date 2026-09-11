'use server'

import { createHash } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUserMembership } from '@/lib/auth/subscription'
import { deductTalisman } from '@/app/actions/payment/wallet'
import { refundBokchae } from '@/lib/services/bokchae'
import { addBokPoints } from '@/lib/services/bok-grant'
import { UNLIMITED_BALANCE } from '@/lib/auth/privileges'
import { FEATURE_COST } from '@/lib/domain/payment/feature-costs'
import { generateAIContent } from '@/lib/services/ai-client'
import { MODEL_FLASH } from '@/lib/config/ai-models'
import { PREMIUM_PROSE_LAYER, TERM_DISCIPLINE } from '@/lib/ai/prose-quality'
import { rateLimit } from '@/lib/utils/rate-limit'
import { logger } from '@/lib/utils/logger'
import { FAMILY_CIRCLE_ID, TOGETHER_MAX, TOGETHER_MIN } from '@/lib/domain/circle/circle'
import {
  NARRATIVE_CACHE_DAYS,
  NARRATIVE_SYSTEM_PROMPT,
  circleFingerprint,
  circlePrompt,
  prescriptionFingerprint,
  prescriptionPrompt,
  togetherFingerprint,
  togetherPrompt,
  validateNarrative,
  type NarrativeKind,
} from '@/lib/domain/circle/narrative'
import { getCircleEnergy, getPrescription, getTogetherEnergy } from './energy'

/**
 * AI 풀이 — 처방전(사람 한 명) · 그룹 지도(그룹 한 벌) · 함께 보기(고른 둘·셋·넷).
 *
 * 흐름: 로그인 → 멤버십 → 속도 제한 → 엔진 값 → 지문 → 캐시 맞으면 무료 반환
 *       → 복채 차감(표시=실차감, FEATURE_COST) → 모델 → 거르기(한 번 재시도) → 저장.
 * 실패하면 환불. 마스터는 실차감이 없어 환불 대상이 아니다(테마 풀이와 같은 규율).
 *
 * 🔴 AI 는 엔진 값을 «풀어 쓰기»만 한다. 프롬프트는 lib/domain/circle/narrative.ts 가 만든다.
 * 🔴 함께 보기의 targetKey 는 «id,id,id»(화면이 고른 순서) — 저장 키는 정렬한 조합의 해시라 순서가 달라도 같은 조합이다.
 */

const RATE_LIMIT = { interval: 60 * 1000, uniqueTokenPerInterval: 6 }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const KIND_META: Record<NarrativeKind, { featureKey: string; cost: number }> = {
  prescription: { featureKey: 'circle_narrative', cost: FEATURE_COST.circleNarrative.display },
  circle: { featureKey: 'circle_narrative', cost: FEATURE_COST.circleNarrative.display },
  together: { featureKey: 'together_narrative', cost: FEATURE_COST.togetherNarrative.display },
}

export type NarrativeErrorType =
  | 'UNAUTHORIZED'
  | 'MEMBERSHIP'
  | 'RATE_LIMIT'
  | 'NOT_FOUND'
  | 'INSUFFICIENT_BALANCE'
  | 'AI_FAILED'

export type NarrativeResult =
  | { success: true; text: string; cached: boolean; createdAt: string }
  | { success: false; error: string; errorType: NarrativeErrorType }

export interface CachedNarrative {
  text: string
  createdAt: string
}

function togetherIds(targetKey: string): string[] | null {
  const ids = [
    ...new Set(
      targetKey
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    ),
  ]
  if (ids.length < TOGETHER_MIN || ids.length > TOGETHER_MAX) return null
  if (!ids.every((id) => id === 'self' || UUID.test(id))) return null
  return ids
}

function validTarget(kind: NarrativeKind, targetKey: string): boolean {
  if (kind === 'prescription') return targetKey === 'self' || UUID.test(targetKey)
  if (kind === 'together') return togetherIds(targetKey) !== null
  return targetKey === FAMILY_CIRCLE_ID || UUID.test(targetKey)
}

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}

/** DB 의 target_key(≤64자) — 함께 보기는 정렬한 조합의 해시로 접는다. */
function storageKey(kind: NarrativeKind, targetKey: string): string {
  if (kind !== 'together') return targetKey
  const ids = togetherIds(targetKey) ?? []
  return `together:${sha256([...ids].sort().join(',')).slice(0, 40)}`
}

function cutoffISO(): string {
  return new Date(Date.now() - NARRATIVE_CACHE_DAYS * 24 * 60 * 60 * 1000).toISOString()
}

/** 화면이 처음 열릴 때 보여 줄 지난 풀이 — 30일 안의 최신 하나. 없으면 null(무료·조회만). */
export async function getCachedNarrative(kind: NarrativeKind, targetKey: string): Promise<CachedNarrative | null> {
  if (!validTarget(kind, targetKey)) return null
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('circle_narratives')
    .select('body, created_at')
    .eq('user_id', user.id)
    .eq('kind', kind)
    .eq('target_key', storageKey(kind, targetKey))
    .gte('created_at', cutoffISO())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!data) return null
  return { text: data.body as string, createdAt: data.created_at as string }
}

/** 엔진 값 → (프롬프트, 지문). 대상이 없으면 null. */
async function materialOf(
  kind: NarrativeKind,
  targetKey: string
): Promise<{ prompt: string; fingerprint: string } | null> {
  if (kind === 'prescription') {
    const payload = await getPrescription(targetKey)
    if (!payload || payload.access !== 'full') return null
    return {
      prompt: prescriptionPrompt(payload.prescription),
      fingerprint: prescriptionFingerprint(payload.prescription),
    }
  }
  if (kind === 'together') {
    const ids = togetherIds(targetKey)
    if (!ids) return null
    const payload = await getTogetherEnergy(ids)
    if (!payload || payload.energy.entries.length < TOGETHER_MIN) return null
    return { prompt: togetherPrompt(payload.energy), fingerprint: togetherFingerprint(payload.energy) }
  }
  const payload = await getCircleEnergy(targetKey)
  if (!payload || payload.energy.entries.length < 2) return null
  return { prompt: circlePrompt(payload.circle.name, payload.energy), fingerprint: circleFingerprint(payload.energy) }
}

export async function generateNarrative(kind: NarrativeKind, targetKey: string): Promise<NarrativeResult> {
  let refundOnFailure: (() => Promise<void>) | null = null
  try {
    if (!validTarget(kind, targetKey))
      return { success: false, error: '대상을 찾을 수 없습니다.', errorType: 'NOT_FOUND' }
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: '로그인이 필요합니다.', errorType: 'UNAUTHORIZED' }

    const membership = await getCurrentUserMembership()
    if (!membership)
      return { success: false, error: '멤버십 회원만 AI 풀이를 받을 수 있습니다.', errorType: 'MEMBERSHIP' }

    const limited = await rateLimit(`circle-narrative:${user.id}`, RATE_LIMIT)
    if (!limited.success) {
      return { success: false, error: '요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요.', errorType: 'RATE_LIMIT' }
    }

    const material = await materialOf(kind, targetKey)
    if (!material) return { success: false, error: '풀이할 기운을 찾지 못했습니다.', errorType: 'NOT_FOUND' }
    const inputHash = sha256(material.fingerprint)
    const key = storageKey(kind, targetKey)

    // 같은 입력의 풀이가 있으면 다시 사지 않는다.
    const { data: hit } = await supabase
      .from('circle_narratives')
      .select('body, created_at')
      .eq('user_id', user.id)
      .eq('kind', kind)
      .eq('target_key', key)
      .eq('input_hash', inputHash)
      .gte('created_at', cutoffISO())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (hit) return { success: true, text: hit.body as string, cached: true, createdAt: hit.created_at as string }

    const { featureKey, cost } = KIND_META[kind]
    if (cost > 0) {
      const deducted = await deductTalisman(featureKey, cost)
      if (!deducted.success) {
        return { success: false, error: deducted.error ?? '복채가 부족합니다.', errorType: 'INSUFFICIENT_BALANCE' }
      }
      if (deducted.remainingBalance !== UNLIMITED_BALANCE) {
        refundOnFailure = () => refundBokchae(user.id, cost, 'AI 풀이 실패 환불')
      }
    }

    const systemPrompt = [NARRATIVE_SYSTEM_PROMPT, TERM_DISCIPLINE, PREMIUM_PROSE_LAYER].join('\n\n')
    let text: string | null = null
    let lastReason = ''
    for (let attempt = 0; attempt < 2 && !text; attempt++) {
      const ai = await generateAIContent({
        featureKey,
        actionType: featureKey,
        systemPrompt,
        userPrompt:
          attempt === 0
            ? material.prompt
            : `${material.prompt}\n\n(지난 답은 «${lastReason}» 때문에 쓸 수 없었습니다. 규율을 지켜 다시 쓰세요.)`,
        temperature: 0.7,
        maxTokens: 1200,
        userId: user.id,
      })
      const checked = validateNarrative(ai.text)
      if (checked.ok) text = checked.text
      else lastReason = checked.reason
    }
    if (!text) {
      logger.warn('[narrative] 출력 거르기 실패:', lastReason)
      if (refundOnFailure) await refundOnFailure()
      return { success: false, error: '풀이를 다듬지 못했습니다. 복채는 돌려드렸습니다.', errorType: 'AI_FAILED' }
    }

    const admin = createAdminClient()
    const { data: saved, error: saveError } = await admin
      .from('circle_narratives')
      .insert({
        user_id: user.id,
        kind,
        target_key: key,
        input_hash: inputHash,
        body: text,
        model: MODEL_FLASH,
        talisman_cost: cost,
      })
      .select('created_at')
      .single()
    if (saveError) logger.error('[narrative] 저장 실패(풀이는 반환):', saveError.message)

    await addBokPoints(20, 'ANALYSIS', undefined, 'AI 풀이').catch(() => {})
    return {
      success: true,
      text,
      cached: false,
      createdAt: (saved?.created_at as string | undefined) ?? new Date().toISOString(),
    }
  } catch (error) {
    logger.error('[narrative] 실패:', error)
    if (refundOnFailure) await refundOnFailure().catch(() => {})
    return { success: false, error: '풀이 중 문제가 생겼습니다. 잠시 후 다시 시도해 주세요.', errorType: 'AI_FAILED' }
  }
}
