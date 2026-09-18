'use server'

import { createHash } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getActiveMembership } from '@/lib/auth/subscription'
import { chargeFeature } from '@/lib/services/feature-charge'
import { FEATURE_COST, type FeatureCostKey } from '@/lib/domain/payment/feature-costs'
import { tierAllows, tierUpsellLine, type TierFeature } from '@/lib/domain/payment/membership-tiers'
import type { PassErrorType } from '@/lib/domain/entitlement/pass'
import { generateAIContent } from '@/lib/services/ai-client'
import { MODEL_FLASH } from '@/lib/config/ai-models'
import { rateLimit } from '@/lib/utils/rate-limit'
import { logger } from '@/lib/utils/logger'
import { FAMILY_CIRCLE_ID, TOGETHER_MAX, TOGETHER_MIN } from '@/lib/domain/circle/circle'
import {
  NARRATIVE_CACHE_DAYS,
  NARRATIVE_MAX_CHARS_TOGETHER,
  TOGETHER_JARGON_MAX,
  TOGETHER_SECTIONS,
  circleFingerprint,
  circlePrompt,
  narrativeRequestFor,
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
 * 흐름: 로그인 → 멤버십·등급 → 속도 제한 → 엔진 값 → 지문 → 캐시 맞으면 이용권 없이 반환
 *       → 이용권 사용(chargeFeature, 장 수는 FEATURE_COST) → 모델 → 거르기(한 번 재시도) → 저장.
 * 실패하면 되돌린다. 관리자·검수는 쓰지 않았으니 되돌릴 것도 없다(테마 풀이와 같은 규율).
 * 등급: 처방전·그룹 지도 = 패밀리부터 · 함께 보기 = 비즈니스(lib/domain/payment/membership-tiers).
 *
 * 🔴 AI 는 엔진 값을 «풀어 쓰기»만 한다. 프롬프트는 lib/domain/circle/narrative.ts 가 만든다.
 * 🔴 함께 보기의 targetKey 는 «id,id,id»(화면이 고른 순서) — 저장 키는 정렬한 조합의 해시라 순서가 달라도 같은 조합이다.
 */

const RATE_LIMIT = { interval: 60 * 1000, uniqueTokenPerInterval: 6 }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const KIND_META: Record<
  NarrativeKind,
  { featureKey: string; costKey: FeatureCostKey; tierFeature: TierFeature; label: string }
> = {
  prescription: {
    featureKey: 'circle_narrative',
    costKey: 'circleNarrative',
    tierFeature: 'familyMap',
    label: '기운 풀이',
  },
  circle: { featureKey: 'circle_narrative', costKey: 'circleNarrative', tierFeature: 'familyMap', label: '기운 풀이' },
  together: {
    featureKey: 'together_narrative',
    costKey: 'togetherNarrative',
    tierFeature: 'togetherView',
    label: '함께 보기',
  },
}

export type NarrativeErrorType =
  | 'UNAUTHORIZED'
  | 'MEMBERSHIP'
  | 'TIER_REQUIRED'
  | 'RATE_LIMIT'
  | 'NOT_FOUND'
  | 'AI_FAILED'
  | PassErrorType

export type NarrativeResult =
  | { success: true; text: string; cached: boolean; createdAt: string }
  | { success: false; error: string; errorType: NarrativeErrorType; requiredUnits?: number }

export interface CachedNarrative {
  text: string
  createdAt: string
}

/** 함께 보기의 사람 조합 — DB meta 컬럼에 남겨 «최근 본 조합» 목록이 이름을 되찾는다. */
interface TogetherMeta {
  ids: string[]
  names: string[]
}

export interface RecentTogether extends TogetherMeta {
  text: string
  createdAt: string
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string')
}

function isTogetherMeta(v: unknown): v is TogetherMeta {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  return (
    isStringArray(o.ids) && isStringArray(o.names) && o.ids.length === o.names.length && o.ids.length >= TOGETHER_MIN
  )
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

/** 최근 본 조합 — 30일 안, 조합마다 최신 하나, 최신순 limit 개. 조회만(무료). */
export async function getRecentTogether(limit = 5): Promise<RecentTogether[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('circle_narratives')
    .select('target_key, body, created_at, meta')
    .eq('user_id', user.id)
    .eq('kind', 'together')
    .gte('created_at', cutoffISO())
    .order('created_at', { ascending: false })
    .limit(limit * 4)

  const seen = new Set<string>()
  const out: RecentTogether[] = []
  for (const row of data ?? []) {
    const key = row.target_key as string
    if (seen.has(key) || !isTogetherMeta(row.meta)) continue
    seen.add(key)
    out.push({
      ids: row.meta.ids,
      names: row.meta.names,
      text: row.body as string,
      createdAt: row.created_at as string,
    })
    if (out.length >= limit) break
  }
  return out
}

/** 엔진 값 → (프롬프트, 지문, 함께 보기면 사람 조합). 대상이 없으면 null. */
async function materialOf(
  kind: NarrativeKind,
  targetKey: string
): Promise<{ prompt: string; fingerprint: string; meta?: TogetherMeta } | null> {
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
    return {
      prompt: togetherPrompt(payload.energy),
      fingerprint: togetherFingerprint(payload.energy),
      meta: { ids: payload.energy.entries.map((e) => e.targetId), names: payload.energy.entries.map((e) => e.name) },
    }
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

    const kindMeta = KIND_META[kind]
    const membership = await getActiveMembership(user.id)
    if (!membership)
      return { success: false, error: '멤버십 회원만 AI 풀이를 받을 수 있습니다.', errorType: 'MEMBERSHIP' }
    if (!tierAllows(membership.tier, kindMeta.tierFeature))
      return { success: false, error: tierUpsellLine(kindMeta.tierFeature), errorType: 'TIER_REQUIRED' }

    const limited = await rateLimit(`circle-narrative:${user.id}`, RATE_LIMIT)
    if (!limited.success) {
      return { success: false, error: '요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요.', errorType: 'RATE_LIMIT' }
    }

    const material = await materialOf(kind, targetKey)
    if (!material) return { success: false, error: '풀이할 기운을 찾지 못했습니다.', errorType: 'NOT_FOUND' }
    const inputHash = sha256(material.fingerprint)
    const key = storageKey(kind, targetKey)

    // 같은 입력의 풀이가 있으면 이용권을 다시 쓰지 않는다.
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

    const { featureKey, costKey, label } = kindMeta
    const charge = await chargeFeature({ userId: user.id, featureKey, costKey, label })
    if (!charge.ok) return charge.failure
    refundOnFailure = charge.refundOnFailure

    // 시스템 프롬프트·온도·한도는 도메인 한 곳(narrativeRequestFor)이 정한다 — A/B 하네스와 같은 값.
    const request = narrativeRequestFor(kind)
    const checkOptions =
      kind === 'together'
        ? {
            headings: TOGETHER_SECTIONS,
            maxChars: NARRATIVE_MAX_CHARS_TOGETHER,
            jargonMax: TOGETHER_JARGON_MAX,
            ignore: material.meta?.names ?? [],
          }
        : undefined
    let text: string | null = null
    let lastReason = ''
    for (let attempt = 0; attempt < 2 && !text; attempt++) {
      const ai = await generateAIContent({
        featureKey,
        actionType: featureKey,
        systemPrompt: request.systemPrompt,
        userPrompt: attempt === 0 ? material.prompt : `${material.prompt}\n\n${request.retryNote(lastReason)}`,
        temperature: request.temperature,
        maxTokens: request.maxTokens,
        userId: user.id,
      })
      const checked = validateNarrative(ai.text, checkOptions)
      if (checked.ok) text = checked.text
      else lastReason = checked.reason
    }
    if (!text) {
      logger.warn('[narrative] 출력 거르기 실패:', lastReason)
      if (refundOnFailure) await refundOnFailure()
      const error = refundOnFailure
        ? '풀이를 다듬지 못했어요. 쓴 이용권은 돌려드렸어요.'
        : '풀이를 다듬지 못했어요. 잠시 후 다시 시도해 주세요.'
      return { success: false, error, errorType: 'AI_FAILED' }
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
        talisman_cost: FEATURE_COST[costKey].display,
        meta: material.meta ?? null,
      })
      .select('created_at')
      .single()
    if (saveError) logger.error('[narrative] 저장 실패(풀이는 반환):', saveError.message)

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
