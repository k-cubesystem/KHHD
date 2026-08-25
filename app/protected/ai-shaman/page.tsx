import { ShamanChatInterface, type SeatedDeityInfo } from '@/components/ai/shaman-chat-interface'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserMembership } from '@/lib/auth/subscription'
import { getShamanQuestionStatus } from '@/app/actions/ai/shaman-chat'
import { AdGateCta } from '@/components/ai/chat/ad-gate-cta'
import { MembershipGate } from '@/components/shared/membership-gate'
import { GENERIC_MEMBERSHIP_BENEFIT_LINES } from '@/lib/domain/payment/membership-benefits'
import {
  MEMBER_WEEKLY_QUESTIONS,
  ONBOARDING_FREE_QUESTIONS,
  PURCHASE_COST_BOKCHAE,
  PURCHASE_QUESTIONS,
  PURCHASE_EXPIRE_DAYS,
} from '@/lib/domain/chat/entitlements'
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

export default async function AIShamanPage({
  searchParams,
}: {
  // 신탁 알림·푸시에서 「이어서 여쭙기」로 넘어오는 딥링크(P1-C): /protected/ai-shaman?oracle=<id>
  searchParams?: Promise<{ oracle?: string }>
}) {
  const params = searchParams ? await searchParams : undefined
  const oracleId = typeof params?.oracle === 'string' ? params.oracle : undefined
  // 게이트(2026-08-25 개편): 멤버십이거나 «질문이 1회라도 남았으면» 입장.
  // 🔴 종전의 «멤버십 or 1일권 or 광고권» 3분기를 버린 이유 — 무료 일일분이 0이 되면서
  //    1일권(입장만 여는 권)이 빈 방 열쇠가 됐고, 질문권을 «산» 사람이 문 앞에서 막혔다.
  //    이제 잔여가 곧 입장권이다. 잔여 0인 사람에게는 게이트가 광고·충전 두 길을 함께 보여준다.
  const [membership, status] = await Promise.all([getCurrentUserMembership(), getShamanQuestionStatus()])
  if (!membership && status.totalRemaining <= 0) {
    return (
      <MembershipGate
        feature="counsel"
        title="속풀이 · 신령님과의 문답"
        description="좌정하신 神이 사주를 근거로 답합니다. 작은 질문도 좋습니다 — 광고를 보고 한 번 여쭙거나, 질문권을 충전해 이어가세요."
        benefits={[
          `멤버십 회원은 주 ${MEMBER_WEEKLY_QUESTIONS}문`,
          `명식을 채우면 맛보기 ${ONBOARDING_FREE_QUESTIONS}문`,
          `질문권 ${PURCHASE_QUESTIONS}문 = 복채 ${PURCHASE_COST_BOKCHAE}만냥 · ${PURCHASE_EXPIRE_DAYS}일 이내 사용`,
          '신당 · 가족관리 입장 포함',
          ...GENERIC_MEMBERSHIP_BENEFIT_LINES,
        ]}
        footerSlot={<AdGateCta />}
      />
    )
  }

  const seated = await loadSeatedDeity()
  return <ShamanChatInterface initialDeity={seated} oracleId={oracleId} />
}
