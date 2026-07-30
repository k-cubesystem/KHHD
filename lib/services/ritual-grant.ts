import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { BAEKIL_ITEM_NAME } from '@/lib/domain/ritual/baekil'

/**
 * 의식 보상 **지급** 전용 모듈 — 백일기도 완주 보상(트로피 + 신당 걸이 아이템).
 *
 * ⚠️ 여기 있는 함수는 절대 `'use server'` 파일에서 re-export 하지 말 것.
 *    Next.js 규약상 `'use server'` 파일의 모든 export 는 로그인 유저가 직접 호출 가능한
 *    공개 엔드포인트가 된다. 인벤토리 아이템은 배치 효험·상점 정가(5만냥)가 걸린 재화이므로
 *    지급 함수가 그대로 노출되면 유저가 자기 계정에 무제한 발행할 수 있다(bok-grant.ts 와 같은 이유).
 *    공개되는 것은 **인자 없는** 얇은 액션(settleBaekilVow)뿐이고, 그 액션이 이 모듈을 부른다.
 *
 * ⚠️ 완주 판정과 지급은 **RPC 한 트랜잭션 안에서** 끝난다(complete_shrine_vow).
 *    여기서 "판정 → 지급"을 두 번의 호출로 나누면 그 사이에 두 번째 요청이 끼어들어
 *    트로피가 둘, 아이템이 둘 생긴다. 이 모듈은 RPC 를 한 번 부르고 응답을 읽기만 한다.
 */

export interface VowCompletionResult {
  /** 이번 호출이 실제로 완주를 확정했는가. 이미 완주했거나 100일 미달이면 false. */
  completed: boolean
  /** 완주 처리된 서약 id(= 트로피 1개). 미완주면 null */
  vowId: string | null
  /** 완주한 회차(1부터). 미완주면 0 */
  round: number
  /** 처리 후 누적 완주 횟수(= 보유 트로피 수) */
  totalCompleted: number
  /** 지급 후 「백일 소원끈」 보유 수량. 지급이 없었으면 0 */
  itemQty: number
  /** 실패 사유(RPC 자체가 깨졌을 때만). 성공·미달은 error 없이 completed=false */
  error?: 'GRANT_FAILED'
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

function readNumber(row: Record<string, unknown>, key: string): number {
  const v = row[key]
  return typeof v === 'number' && Number.isFinite(v) ? v : 0
}

/**
 * 백일기도 완주 확정 + 보상 지급. 멱등 — 몇 번을 불러도 회차당 트로피 1개·아이템 1개다.
 *
 * 진행도는 서버가 shrine_devotion 에서 다시 읽어 판정한다(클라이언트 값 미신뢰).
 * `userId` 를 인자로 받으므로 반드시 인증을 마친 서버 경로에서만 호출한다.
 */
export async function grantVowCompletion(userId: string): Promise<VowCompletionResult> {
  const miss: VowCompletionResult = { completed: false, vowId: null, round: 0, totalCompleted: 0, itemQty: 0 }
  try {
    const admin = createAdminClient()
    const { data, error } = await admin.rpc('complete_shrine_vow', {
      p_user_id: userId,
      p_item_name: BAEKIL_ITEM_NAME,
    })

    if (error) {
      logger.error('[ritual-grant] 백일기도 완주 RPC 실패:', error)
      return { ...miss, error: 'GRANT_FAILED' }
    }

    // returns table(...) → 배열의 첫 행
    const row: unknown = Array.isArray(data) ? data[0] : data
    if (!isRecord(row) || typeof row.completed !== 'boolean') {
      // 응답을 못 읽었다 — 완주했다고 말하지 않는다. 이미 DB 는 확정됐을 수 있으므로
      // 화면이 다시 부르면 그때 completed=false 로 정리된다(멱등이라 중복 지급 위험은 없다).
      logger.error('[ritual-grant] 백일기도 완주 RPC 응답 형식 불명')
      return { ...miss, error: 'GRANT_FAILED' }
    }

    const vowId = typeof row.vow_id === 'string' ? row.vow_id : null
    return {
      completed: row.completed === true,
      vowId,
      round: readNumber(row, 'round'),
      totalCompleted: readNumber(row, 'total_completed'),
      itemQty: readNumber(row, 'item_qty'),
    }
  } catch (e) {
    logger.error('[ritual-grant] 백일기도 완주 예외:', e)
    return { ...miss, error: 'GRANT_FAILED' }
  }
}
