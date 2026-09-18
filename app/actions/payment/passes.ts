'use server'

import { createClient } from '@/lib/supabase/server'
import { getPassLedger, getPassSummary, type PassLedgerEntry } from '@/lib/services/entitlement'
import type { PassSummary } from '@/lib/domain/entitlement/pass'

/**
 * 이용권 «읽기» 공개 엔드포인트 — 로그인한 본인 것만.
 *
 * 🔴 발급·사용·회수는 여기 두지 않는다. 이 파일의 export 는 전부 누구나 부를 수 있는 공개
 *    엔드포인트이므로, 인자로 사용자를 받지 않고 세션에서만 사용자를 읽는다.
 */

async function currentUserId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

/** 내 이용권 요약 — 멤버십 이번 달 몫과 보유 이용권을 따로. 비로그인이면 null. */
export async function getMyPassSummary(): Promise<PassSummary | null> {
  const userId = await currentUserId()
  if (!userId) return null
  return getPassSummary(userId)
}

/** 내 이용권 내역(최신순). */
export async function getMyPassLedger(limit = 50): Promise<PassLedgerEntry[]> {
  const userId = await currentUserId()
  if (!userId) return []
  return getPassLedger(userId, limit)
}
