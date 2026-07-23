import { ShamanChatInterface, type SeatedDeityInfo } from '@/components/ai/shaman-chat-interface'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserMembership } from '@/lib/auth/subscription'
import { hasActiveChatPass } from '@/app/actions/payment/vouchers'
import { MembershipGate } from '@/components/shared/membership-gate'
import { logger } from '@/lib/utils/logger'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '해화당 고민 상담소',
  description: '당신의 깊은 고민을 들어주는 명리학 기반 AI 상담소',
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
        title="고민상담 · 해화지기와의 대화"
        description="명리학에 뿌리를 둔 AI 상담사가 당신의 고민을 깊이 들어드립니다. 멤버십 회원은 언제든 무제한, 또는 1일 이용권으로 지금 바로 시작하세요."
        benefits={['해화지기 고민상담 무제한', '매일 복채 정액 지급', '신당 · 가족관리 · 전체 기록 평생 보관']}
        dayPassType="CHAT_DAY_PASS"
      />
    )
  }

  const seated = await loadSeatedDeity()
  return <ShamanChatInterface initialDeity={seated} />
}
