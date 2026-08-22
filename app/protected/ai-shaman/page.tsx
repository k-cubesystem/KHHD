import { ShamanChatInterface, type SeatedDeityInfo } from '@/components/ai/shaman-chat-interface'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserMembership } from '@/lib/auth/subscription'
import { hasActiveChatPass } from '@/app/actions/payment/vouchers'
import { MembershipGate } from '@/components/shared/membership-gate'
import { GENERIC_MEMBERSHIP_BENEFIT_LINES } from '@/lib/domain/payment/membership-benefits'
import { DAILY_FREE_QUESTIONS } from '@/lib/domain/chat/constants'
import { logger } from '@/lib/utils/logger'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '해화당 속풀이',
  description: '신령님께 여쭙고 속을 푸는 명리학 기반 AI 문답',
}

/** 좌정 主神을 서버에서 시딩 — 첫 로드부터 신위 아바타·이름 표시 (응답 전 해화지기 회귀 방지) */
async function loadSeatedDeity(): Promise<SeatedDeityInfo | null> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    const { data: shrine } = await supabase
      .from('shrines')
      .select('main_deity_id')
      .eq('user_id', user.id)
      .is('family_member_id', null)
      .maybeSingle()
    if (!shrine?.main_deity_id) return null

    const { data: deity } = await supabase
      .from('shrine_deities')
      .select('code, name')
      .eq('id', shrine.main_deity_id)
      .maybeSingle()
    return deity ? { code: deity.code, name: deity.name } : null
  } catch (e) {
    logger.warn('[AIShamanPage] seated deity seed skipped:', e)
    return null
  }
}

export default async function AIShamanPage() {
  // 게이트: 멤버십 or 활성 1일 이용권. 마스터는 subscription 내부에서 통과.
  const [membership, chatPass] = await Promise.all([getCurrentUserMembership(), hasActiveChatPass()])
  if (!membership && !chatPass) {
    return (
      <MembershipGate
        feature="counsel"
        title="속풀이 · 신령님과의 문답"
        description="좌정하신 神이 사주를 근거로 답합니다. 작은 질문도 좋습니다 — 멤버십 회원으로, 또는 1일 이용권으로 지금 바로 여쭤보세요."
        benefits={[
          '신령님과의 속풀이 입장',
          `질문은 하루 ${DAILY_FREE_QUESTIONS}문까지 무료 · 더 필요하면 복채로 충전`,
          '신당 · 가족관리 입장 포함',
          ...GENERIC_MEMBERSHIP_BENEFIT_LINES,
        ]}
        dayPassType="CHAT_DAY_PASS"
      />
    )
  }

  const seated = await loadSeatedDeity()
  return <ShamanChatInterface initialDeity={seated} />
}
