'use server'

import { createClient } from '@/lib/supabase/server'
import { getDestinyTarget } from '../user/destiny'
import { saveAnalysisHistoryObserved, type AnalysisContextMode } from '../user/history'
import { deductTalisman } from '../payment/wallet'
import { refundBokchae } from '@/lib/services/bokchae'
import { addBokPoints } from '@/lib/services/bok-grant'
import { UNLIMITED_BALANCE } from '@/lib/auth/privileges'
import { FEATURE_COST } from '@/lib/domain/payment/feature-costs'
import { generateAIContent } from '@/lib/services/ai-client'
import { buildMasterPromptForAction } from '@/lib/saju-engine/master-prompt-builder'
import { buildSajuContext, type PersonInfo } from '@/lib/saju-engine/context-builder'
import { evaluateAllRules } from '@/lib/saju-engine/rule-base'
import { calculateYearlyFortune } from '@/lib/saju-engine/woon-calculator'
import { isSolarCalendar } from '@/lib/domain/saju/calendar'
import { MODEL_FLASH } from '@/lib/config/ai-models'
import { rateLimit } from '@/lib/utils/rate-limit'
import { logger } from '@/lib/utils/logger'
import {
  buildThemeAdditionalContext,
  parseThemeNarration,
  THEME_OUTPUT_FORMAT_GUIDE,
} from '@/lib/domain/theme-fortune/ai-contract'
import { themeResolver } from '@/lib/domain/theme-fortune/resolvers'
import {
  THEME_CACHE_DAYS,
  themeById,
  themeReadingCostKey,
  type ThemeCategory,
  type ThemeFortune,
} from '@/lib/domain/theme-fortune/themes'
import type { ThemeReading } from '@/lib/domain/theme-fortune/verdict-types'

/**
 * 인기테마운세 — **테마 전체가 쓰는 단 하나의 서버 액션**.
 *
 * 테마마다 액션을 만들지 않는다. 다른 것은 «판정 함수와 프롬프트 조각»뿐이고, 인가·복채·캐시·
 * 저장·환불은 전부 같다(마스터 §6-2). 테마가 늘어나도 이 파일은 안 늘어난다.
 *
 * ## 🔴 'use server' export = 공개 엔드포인트
 * 이 파일이 export 하는 것은 **누구나 부를 수 있는 HTTP 끝점**이다. 그래서 인가·rate limit·
 * 대상 소유권 확인이 인자가 아니라 **함수 안에** 있다. 클라이언트가 보낸 값은 themeId·targetId
 * 두 개뿐이고 둘 다 서버에서 다시 해석한다(단가를 클라이언트에서 받지 않는다).
 *
 * ## 🔴 지갑은 기존 경로로만 만진다
 * `wallets` 직접 쓰기 없음. 차감 `deductTalisman` · 환불 `refundBokchae` 둘뿐이며, 실패 시
 * 환불은 `analyzeWealth` 의 `refundOnFailure` 패턴 그대로다(마스터 §7-2).
 *
 * ## 흐름
 *   인가 → rate limit → 테마·판정기 해석 → 대상 조회 → **캐시(7일)** → 차감 → L1 → L2 → L3
 *   → 월(月) 검증 → 저장 → 반환
 *
 * 캐시를 **차감보다 먼저** 본다. 「캐시 히트 = 환불」(수익화 v2)과 결과는 같고, 돈을 건드렸다가
 * 되돌리는 왕복이 없어 실패 지점이 하나 적다. 재분석은 `force` 로 캐시를 건너뛰며 그때는 다시
 * 차감된다(§7-2 — 버튼 문구가 차감을 밝히는 것은 화면의 몫).
 */

/** 분당 허용 횟수. 유료 AI 호출이라 넉넉히 잡지 않는다. */
const RATE_LIMIT = { interval: 60_000, uniqueTokenPerInterval: 5 }

/** 기록 화면·통계가 이 풀이를 어느 결로 묶는가. `context_mode` 는 이미 있는 컬럼이다. */
const CONTEXT_MODE: Record<ThemeCategory, AnalysisContextMode> = {
  career: 'CAREER',
  wealth: 'WEALTH',
  love: 'LOVE',
  face: 'GENERAL',
  fengshui: 'GENERAL',
}

export interface ThemeAnalyzeParams {
  readonly themeId: string
  /** destiny target id — 다형(본인=profiles.id / 가족=family_members.id). */
  readonly targetId: string
  /** 캐시를 건너뛰고 다시 푼다. 🔴 복채가 다시 나간다. */
  readonly force?: boolean
}

export type ThemeAnalyzeResult =
  | { success: true; reading: ThemeReading; cached: boolean }
  | { success: false; error: string; errorType?: string; currentTier?: string }

/** KST 기준 연도 — 세운의 기준점. 엔진의 «현재 시점»과 같은 계산이다. */
function kstYear(): number {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).getUTCFullYear()
}

function isThemeReading(value: unknown, themeId: string): value is ThemeReading {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return record.themeId === themeId && typeof record.narration === 'object' && typeof record.verdict === 'object'
}

/** 7일 안에 같은 대상·같은 테마로 푼 결과가 있으면 그것을 돌려준다(복채 안 나간다). */
async function findCachedReading(targetId: string, themeId: string): Promise<ThemeReading | null> {
  const supabase = await createClient()
  const cutoff = new Date(Date.now() - THEME_CACHE_DAYS * 24 * 60 * 60 * 1000)

  const { data: rows } = await supabase
    .from('analysis_history')
    .select('result_json')
    .eq('target_id', targetId)
    .eq('category', 'THEME')
    .gte('created_at', cutoff.toISOString())
    .order('created_at', { ascending: false })
    .limit(20)

  for (const row of rows ?? []) {
    if (isThemeReading(row.result_json, themeId)) return row.result_json
  }
  return null
}

function personOf(target: Awaited<ReturnType<typeof getDestinyTarget>>, name: string): PersonInfo {
  return {
    name,
    birthDate: target?.birth_date ?? '',
    birthTime: target?.birth_time || '12:00',
    gender: (target?.gender || 'male') as 'male' | 'female',
    isSolar: isSolarCalendar(target?.calendar_type ?? null),
    isLeapMonth: target?.is_leap_month ?? false,
    birthTimeUnknown: !target?.birth_time,
  }
}

export async function analyzeThemeFortune(params: ThemeAnalyzeParams): Promise<ThemeAnalyzeResult> {
  let refundOnFailure: (() => Promise<void>) | null = null

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: '로그인이 필요합니다.' }

    const limited = await rateLimit(`theme-fortune:${user.id}`, RATE_LIMIT)
    if (!limited.success) {
      return { success: false, error: '요청이 너무 잦습니다. 잠시 후 다시 시도해주세요.', errorType: 'RATE_LIMIT' }
    }

    // 테마·판정기는 서버에서만 해석한다 — 클라이언트가 보낸 것은 문자열 하나뿐이다.
    const theme: ThemeFortune | null = themeById(params.themeId)
    if (!theme || !theme.shipped) return { success: false, error: '준비 중인 테마입니다.' }

    const resolver = themeResolver(theme.id)
    if (!resolver) return { success: false, error: '이 테마의 풀이는 아직 준비 중입니다.' }

    // 대상은 단일 출처(v_destiny_targets)로만 해석한다. 🔴 차감보다 먼저 본다 —
    //    대상이 없거나 남의 것이면 복채를 건드리지 않는다.
    const target = await getDestinyTarget(params.targetId)
    if (!target) return { success: false, error: '대상 정보를 찾을 수 없습니다.' }
    if (!target.birth_date) {
      return { success: false, error: '생년월일 정보가 없습니다. 사주 정보를 먼저 입력해주세요.' }
    }
    const targetName = target.name?.trim() || '본인'

    if (!params.force) {
      const cached = await findCachedReading(target.id, theme.id)
      if (cached) return { success: true, reading: cached, cached: true }
    }

    // 🔴 표시 = 실차감. 무료 미끼 테마(§7-1)는 키가 없고, 그래서 차감 경로 자체를 타지 않는다.
    const costKey = themeReadingCostKey(theme)
    const cost = costKey ? FEATURE_COST[costKey].display : 0

    if (cost > 0) {
      const deducted = await deductTalisman(`theme_${theme.id}`, cost)
      if (!deducted.success) {
        return {
          success: false,
          error: deducted.error ?? '복채가 부족합니다.',
          errorType: deducted.errorType,
          currentTier: deducted.currentTier,
        }
      }
      // 마스터(무제한)는 실차감이 없으므로 환불 대상이 아니다.
      if (deducted.remainingBalance !== UNLIMITED_BALANCE) {
        refundOnFailure = () => refundBokchae(user.id, cost, `${theme.title} 풀이 실패 환불`)
      }
    }

    // ── L1 결정론 ────────────────────────────────────────────────────────────
    // 판정에는 컨텍스트 «객체»가 필요해서 엔진을 직접 부른다(프롬프트용 캐시는 텍스트만 준다).
    const person = personOf(target, targetName)
    const ctx = buildSajuContext(person)
    const rules = evaluateAllRules(ctx.sajuData, ctx.analysis.sipseong, ctx.analysis.warnings, ctx.analysis.sinsal)
    const baseYear = kstYear()
    const yearly = resolver.yearOffsets.map((offset) => calculateYearlyFortune(ctx, baseYear + offset))

    // ── L2 판정 (순수 함수) ─────────────────────────────────────────────────
    const verdict = resolver.judge({ ctx, yearly, baseYear, rules })

    // ── L3 서술 (AI 는 문장만 쓴다) ─────────────────────────────────────────
    const { prompt } = await buildMasterPromptForAction(
      person,
      resolver.prompt.analysisType,
      '',
      buildThemeAdditionalContext(resolver.prompt, verdict),
      THEME_OUTPUT_FORMAT_GUIDE
    )
    const ai = await generateAIContent({
      featureKey: `theme_${theme.id}`,
      actionType: 'theme_fortune',
      systemPrompt: '당신은 사주 기반 운세 전문가입니다. 반드시 유효한 JSON만 출력하십시오.',
      userPrompt: prompt,
    })
    // 판정에 없는 달은 여기서 판정의 달로 덮인다 — 조용히 틀린 달을 내보내지 않는다(§5-4).
    const narration = parseThemeNarration(ai.text, verdict)

    const reading: ThemeReading = {
      themeId: theme.id,
      targetId: target.id,
      targetName,
      verdict,
      narration,
      analyzedAt: new Date().toISOString(),
    }

    // 저장은 부가 작업이다 — 실패해도 사용자는 방금 산 풀이를 받는다(관측 래퍼가 Sentry 로 잇는다).
    await saveAnalysisHistoryObserved({
      target_id: target.id,
      target_name: targetName,
      target_relation: target.relation_type || '본인',
      category: 'THEME',
      context_mode: CONTEXT_MODE[theme.category],
      result_json: reading,
      summary: narration.headline,
      model_used: MODEL_FLASH,
      talisman_cost: cost,
    })

    await addBokPoints(20, 'ANALYSIS', undefined, '테마 풀이').catch(() => {})
    return { success: true, reading, cached: false }
  } catch (error) {
    logger.error('[ThemeFortune] 분석 실패:', error)
    if (refundOnFailure) {
      await refundOnFailure().catch((e) => logger.error('[ThemeFortune] 환불 실패:', e))
      return { success: false, error: '복채는 돌려드렸습니다. 잠시 후 다시 시도해주세요.' }
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : '풀이 중 오류가 발생했습니다.',
    }
  }
}
