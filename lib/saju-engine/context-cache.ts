/**
 * 사주 컨텍스트 캐시 — 결정론적 사주 계산을 person·날짜 단위로 1회만 수행
 *
 * buildSajuContext()는 getSajuData + 전체 분석 엔진(십성/신살/대운/용신 등)을 매번
 * 재계산한다. 같은 생년월일시는 항상 동일한 결과이므로, 컨텍스트 텍스트를 DB에 캐시하여
 * 같은 유저의 2번째 채팅 턴부터는 계산을 완전히 건너뛴다.
 *
 * 단, 컨텍스트 텍스트에는 "현재 시점(오늘 날짜)"과 과거/현재/미래 대운 태그가 포함되므로
 * KST 날짜 단위로 무효화한다(cache_key당 1행 유지 → 무한 증가 없음).
 */

import { createHash } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { buildSajuContext, type PersonInfo } from './context-builder'

/** 사주 엔진 로직이 바뀌면 이 버전을 올려 전체 캐시를 자연 무효화한다. */
const ENGINE_VERSION = 'v1'

/** KST 기준 오늘 날짜 (YYYY-MM-DD). context-builder의 '현재 시점' 기준과 동일. */
function getKstDate(): string {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const y = kst.getUTCFullYear()
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0')
  const d = String(kst.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** 컨텍스트 텍스트 출력에 영향을 주는 모든 필드를 해시하여 캐시 키 생성 */
function makeCacheKey(person: PersonInfo): string {
  const normalized = [
    person.birthDate,
    person.birthTime || '00:00',
    person.isSolar === false ? 'lunar' : 'solar',
    person.gender,
    person.name || '',
    person.job || '',
    person.focusAreas || '',
    person.maritalStatus || '',
    person.lifePhilosophy || '',
    ENGINE_VERSION,
  ].join('|')
  return createHash('sha256').update(normalized).digest('hex')
}

/**
 * 사주 컨텍스트 텍스트를 캐시에서 가져오거나 계산 후 저장한다.
 * - HIT (같은 person + 같은 KST 날짜 + 같은 엔진 버전): 계산 스킵
 * - MISS: buildSajuContext() 실행 후 upsert
 * 캐시 조회/저장 실패는 계산으로 폴백하여 서비스 중단을 방지한다.
 */
export async function buildSajuContextTextCached(person: PersonInfo): Promise<string> {
  const cacheKey = makeCacheKey(person)
  const today = getKstDate()

  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('saju_context_cache')
      .select('context_text, context_date, engine_version')
      .eq('cache_key', cacheKey)
      .maybeSingle()

    if (data && data.context_date === today && data.engine_version === ENGINE_VERSION) {
      void admin.rpc('increment_saju_cache_hit', { p_cache_key: cacheKey }).then(
        () => {},
        () => {}
      )
      return data.context_text
    }
  } catch (e) {
    logger.warn('[SajuContextCache] read failed, computing fresh:', e)
  }

  // MISS → 계산
  const contextText = buildSajuContext(person).promptContext

  try {
    const admin = createAdminClient()
    await admin.from('saju_context_cache').upsert(
      {
        cache_key: cacheKey,
        context_text: contextText,
        context_date: today,
        engine_version: ENGINE_VERSION,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'cache_key' }
    )
  } catch (e) {
    logger.warn('[SajuContextCache] write failed:', e)
  }

  return contextText
}
