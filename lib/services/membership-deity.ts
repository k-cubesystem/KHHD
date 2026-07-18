import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

/**
 * 멤버십 무료신 패키지 (로드맵 P1-6) — 등급당 1위 증정.
 * 사용자 결정(2026-07-19): 등급당 1위만. 해지해도 **보유는 유지**(신위는 영구 소장 원칙).
 *
 * 등급이 올라가면 상위 등급 신위를 추가로 받는다(하위 것을 회수하지 않음).
 * 이미 보유한 신위는 건너뛴다 — 멱등.
 */
const TIER_GIFT: Record<string, { code: string; label: string }> = {
  SINGLE: { code: 'daegam', label: '대감신' }, // 명신(tier2)
  FAMILY: { code: 'choiyoung', label: '최영 장군' }, // 장군신(tier3)
  BUSINESS: { code: 'chilseong', label: '칠성신' }, // 천신(tier4)
}

export interface DeityGiftResult {
  granted: boolean
  deityCode?: string
  deityName?: string
}

/**
 * 구독 활성화 시 등급별 신위 증정. 실패해도 구독 자체는 성공 처리(부가 혜택).
 * 좌정은 하지 않는다 — 유저가 신위전에서 직접 고르도록(기존 좌정을 덮지 않기 위해).
 */
export async function grantMembershipDeity(userId: string, tier: string | null | undefined): Promise<DeityGiftResult> {
  try {
    const gift = tier ? TIER_GIFT[tier] : undefined
    if (!gift) return { granted: false }

    const admin = createAdminClient()
    const { data: deity } = await admin.from('shrine_deities').select('id, name').eq('code', gift.code).maybeSingle()
    if (!deity) {
      logger.error(new Error(`[membership-deity] 카탈로그에 없는 신위: ${gift.code}`))
      return { granted: false }
    }

    // 이미 보유하면 조용히 종료 (갱신마다 중복 지급 방지)
    const { data: owned } = await admin
      .from('user_shrine_deities')
      .select('deity_id')
      .eq('user_id', userId)
      .eq('deity_id', deity.id)
      .maybeSingle()
    if (owned) return { granted: false, deityCode: gift.code, deityName: deity.name }

    const { error: grantError } = await admin
      .from('user_shrine_deities')
      .upsert(
        { user_id: userId, deity_id: deity.id, source: 'membership' },
        { onConflict: 'user_id,deity_id', ignoreDuplicates: true }
      )
    if (grantError) {
      logger.error(new Error(`[membership-deity] 지급 실패: ${grantError.message}`))
      return { granted: false }
    }

    // 인연 1단계 초기화 (본인 신당 스코프)
    await admin
      .from('user_deity_bonds')
      .upsert(
        { user_id: userId, deity_id: deity.id, family_member_id: null, bond_level: 1, bond_points: 0 },
        { onConflict: 'user_id,deity_id,family_member_id', ignoreDuplicates: true }
      )

    // 알림으로 알려 신위전 방문을 유도
    await admin.from('notifications').insert({
      user_id: userId,
      title: `${deity.name}이(가) 그대를 찾아왔습니다`,
      message: `멤버십 혜택으로 「${deity.name}」을 봉안했습니다. 신위전에서 좌정하시면 그 신위가 그대의 신당을 지킵니다.`,
      type: 'membership_deity_gift',
      is_read: false,
    })

    logger.log('[membership-deity] 증정 완료:', { userId, tier, code: gift.code })
    return { granted: true, deityCode: gift.code, deityName: deity.name }
  } catch (e) {
    logger.error(e instanceof Error ? e : new Error('[membership-deity] 예외'))
    return { granted: false }
  }
}
