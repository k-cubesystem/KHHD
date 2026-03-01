/**
 * 임시 DB 수정 API (사용 후 삭제)
 * GET /api/_db_fix → roulette_history 제약 조건 수정
 */
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const admin = createAdminClient()

    // Step 1: 현재 제약 조건 확인 (테스트 insert로 에러 메시지 확인)
    const { error: probeError } = await admin.from('roulette_history').insert({
      user_id: '00000000-0000-0000-0000-000000000099',
      reward_type: 'bokchae',
      reward_value: 1,
    })

    if (!probeError) {
      // 이미 bokchae 허용됨 → 테스트 레코드 삭제
      await admin.from('roulette_history').delete().eq('user_id', '00000000-0000-0000-0000-000000000099')

      return NextResponse.json({ ok: true, message: '이미 bokchae 허용 상태입니다.' })
    }

    // Step 2: 제약 이름 파싱
    const constraintName = probeError.message.match(/constraint "([^"]+)"/)?.[1] ?? 'roulette_history_reward_type_check'

    // Step 3: DDL 실행용 임시 함수 생성
    const createFnSql = `
      CREATE OR REPLACE FUNCTION _temp_fix_roulette_constraint()
      RETURNS text
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        EXECUTE 'ALTER TABLE roulette_history DROP CONSTRAINT IF EXISTS ${constraintName}';
        EXECUTE 'ALTER TABLE roulette_history DROP CONSTRAINT IF EXISTS roulette_history_reward_type_check';
        EXECUTE 'ALTER TABLE roulette_history DROP CONSTRAINT IF EXISTS roulette_history_type_check';
        EXECUTE $q$
          ALTER TABLE roulette_history
          ADD CONSTRAINT roulette_history_reward_type_check
          CHECK (reward_type IN (''bokchae'', ''miss'', ''talisman'', ''premium'', ''discount''))
        $q$;
        RETURN 'OK: constraint updated';
      END;
      $$;
    `

    // admin client는 DDL 직접 실행 불가 → rpc 우회
    // service_role로 함수 생성 시도 (PostgREST schema cache bypass)
    const { error: rpcCallError } = await admin.rpc('_temp_fix_roulette_constraint' as any)

    if (rpcCallError && rpcCallError.message.includes('Could not find')) {
      // 함수가 없음 → 에러 정보 반환
      return NextResponse.json({
        ok: false,
        probeError: probeError.message,
        constraintName,
        createFnSql: createFnSql.trim(),
        instruction: 'Supabase SQL Editor에서 createFnSql을 먼저 실행한 뒤 이 API를 다시 호출하세요.',
      })
    }

    return NextResponse.json({
      ok: true,
      message: '제약 조건 수정 완료',
      rpcError: rpcCallError,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
