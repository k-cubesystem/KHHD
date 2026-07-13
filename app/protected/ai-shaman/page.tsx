import { ShamanChatInterface, type SeatedDeityInfo } from '@/components/ai/shaman-chat-interface'
import { createClient } from '@/lib/supabase/server'
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

    const { data: shrine } = await supabase.from('shrines').select('main_deity_id').eq('user_id', user.id).maybeSingle()
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
  const seated = await loadSeatedDeity()
  return <ShamanChatInterface initialDeity={seated} />
}
