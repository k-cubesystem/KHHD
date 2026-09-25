'use server'

import { isEdgeEnabled } from '@/lib/supabase/edge-config'
import { invokeEdgeSafe } from '@/lib/supabase/invoke-edge'
import { rateLimit } from '@/lib/utils/rate-limit'
import { generateDailyFortuneCore, type DailyFortuneResult, type TargetType } from '@/lib/services/daily-fortune'

export type { TargetType }

/**
 * 오늘의 운세 — **사용자 요청** 경로(공개 서버 액션).
 *
 * 🔴 본체(generateDailyFortuneCore)는 `lib/services/daily-fortune` 에 있고 여기서는 **세션 클라이언트로만** 부른다.
 *    reader 를 인자로 열면 `'use server'` export 특성상 누구나 'admin' 을 넘겨 남의 명식을 읽을 수 있다.
 *    세션이 없는 서버 맥락(크론·어드민 일괄)은 이 액션이 아니라 본체를 직접 부른다.
 */
export async function generateDailyFortune(
  userId: string,
  targetId: string,
  type: TargetType = 'USER',
  dateStr?: string,
  force: boolean = false
): Promise<DailyFortuneResult> {
  if (isEdgeEnabled('fortune')) {
    return invokeEdgeSafe('fortune', { action: 'generateDailyFortune', userId, targetId, type, dateStr, force })
  }

  // Rate limiting: 1분에 20회 (일운은 자주 조회될 수 있으므로 여유있게)
  const rateLimitResult = await rateLimit(`daily-fortune:${userId}`, {
    interval: 60 * 1000,
    uniqueTokenPerInterval: 20,
  })

  if (!rateLimitResult.success) {
    const waitTime = Math.ceil((rateLimitResult.reset - Date.now()) / 1000)
    return {
      success: false,
      error: `요청 제한을 초과했습니다. ${waitTime}초 후에 다시 시도해주세요.`,
    }
  }

  return generateDailyFortuneCore(userId, targetId, type, { reader: 'session', dateStr, force })
}
