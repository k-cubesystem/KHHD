'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

const GIFT_MARKER = '봉헌'

/**
 * 신당지기에게 공물을 건넸을 때 장기 기억으로 기록.
 * 해화지기(고민상담)가 recallMemories로 주입하므로 다음 대화에서 회상된다.
 * 중복 방지: 기존 봉헌 기억을 갱신(하나만 유지).
 */
export async function recordKeeperGift(itemName: string): Promise<void> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const admin = createAdminClient()

    // 기존 봉헌 기억 제거 (본인 대상만)
    const { data: existing } = await admin
      .from('user_ai_memory')
      .select('id, content')
      .eq('user_id', user.id)
      .is('family_member_id', null)
    const stale = (existing ?? []).filter((m) => typeof m.content === 'string' && m.content.includes(GIFT_MARKER))
    if (stale.length > 0) {
      await admin
        .from('user_ai_memory')
        .delete()
        .in(
          'id',
          stale.map((m) => m.id)
        )
    }

    await admin.from('user_ai_memory').insert({
      user_id: user.id,
      family_member_id: null,
      memory_type: 'profile_fact',
      content: `신물 '${itemName}'을(를) 신령께 ${GIFT_MARKER}한 정성이 깊은 분`.slice(0, 300),
      importance: 5,
    })
  } catch (e) {
    logger.warn('[shrine/keeper] recordKeeperGift failed:', e)
  }
}
