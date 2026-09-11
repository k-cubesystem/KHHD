'use server'

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

/**
 * 웹툰 이어보기 — «마지막으로 읽은 회차» 한 줄.
 *
 * ⚠️ 비로그인 독자의 진행은 서버가 모른다 — 그쪽은 브라우저(localStorage)가 기억하고,
 *    화면(WebtoonContinue)이 둘을 합친다. 여기는 로그인 유저의 기기 간 동기화만 맡는다.
 * ⚠️ RLS own-only — 남의 진행은 조회조차 안 된다. 실패는 전부 비치명(읽기를 막지 않는다).
 */
export async function markEpisodeRead(no: number): Promise<void> {
  if (!Number.isInteger(no) || no < 0) return
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase
      .from('webtoon_reading_progress')
      .upsert({ user_id: user.id, episode_no: no, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    if (error) logger.warn('[webtoon] 이어보기 저장 실패(비치명):', error)
  } catch (e) {
    logger.warn('[webtoon] 이어보기 저장 예외(비치명):', e)
  }
}

export async function getLastReadEpisode(): Promise<number | null> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null
    const { data } = await supabase
      .from('webtoon_reading_progress')
      .select('episode_no')
      .eq('user_id', user.id)
      .maybeSingle()
    return typeof data?.episode_no === 'number' ? data.episode_no : null
  } catch (e) {
    logger.warn('[webtoon] 이어보기 조회 예외(비치명):', e)
    return null
  }
}
