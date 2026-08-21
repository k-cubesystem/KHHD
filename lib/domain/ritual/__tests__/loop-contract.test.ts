/**
 * 초하루 의례 — 보안·멱등 계약 동결 테스트 (baekil.test.ts 패턴).
 * 라이브 DB 없이 마이그레이션 SQL·서버 액션 소스를 텍스트로 검증해
 * V1(서비스롤 전용)·E2(원자 upsert)·3A(적립 원자화) 계약의 회귀를 잡는다.
 */
import { readFileSync } from 'fs'
import { join } from 'path'

const ROOT = process.cwd()
const sql = readFileSync(join(ROOT, 'supabase/migrations/20260821_ritual_loop.sql'), 'utf8')
const action = readFileSync(join(ROOT, 'app/actions/ritual/loop.ts'), 'utf8')
const cron = readFileSync(join(ROOT, 'app/api/cron/ritual-push/route.ts'), 'utf8')

describe('마이그레이션 계약 (V1·E2·V3)', () => {
  it('두 RPC 모두 authenticated 직접 호출이 봉쇄된다 (V1)', () => {
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.enter_ritual[\s\S]*?FROM PUBLIC, anon, authenticated/)
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.complete_ritual[\s\S]*?FROM PUBLIC, anon, authenticated/)
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.enter_ritual[\s\S]*?TO service_role/)
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.complete_ritual[\s\S]*?TO service_role/)
  })

  it('진입은 ON CONFLICT DO NOTHING — 2탭 동시 안전 (E2)', () => {
    const enterBody = sql.split('FUNCTION public.enter_ritual')[1]?.split('$$;')[0] ?? ''
    expect(enterBody).toContain('ON CONFLICT (user_id, ritual_month, is_leap_month) DO NOTHING')
  })

  it('완주는 completed_at IS NULL 가드 upsert — 멱등 (E2·3A)', () => {
    const completeBody = sql.split('FUNCTION public.complete_ritual')[1]?.split('$$;')[0] ?? ''
    expect(completeBody).toContain('ON CONFLICT (user_id, ritual_month, is_leap_month) DO UPDATE')
    expect(completeBody).toContain('WHERE ritual_records.completed_at IS NULL')
    expect(completeBody).toContain("RAISE EXCEPTION 'WISH_REQUIRED'")
    expect(completeBody).toContain('add_bok_points')
    expect(completeBody).toContain("'RITUAL_COMPLETE'")
  })

  it('wish_category 는 nullable + CHECK, wish_text 100자 제한 (V3·D9)', () => {
    expect(sql).toMatch(/wish_category TEXT CHECK \(wish_category IN \('PEACE','WEALTH','STUDY','HEALTH','CUSTOM'\)\)/)
    expect(sql).toContain('char_length(wish_text) <= 100')
    expect(sql).not.toMatch(/wish_category TEXT NOT NULL/)
  })

  it('ritual_records 에 유저 INSERT/UPDATE 정책이 없다 (쓰기는 RPC 전용)', () => {
    const tableBlock = sql.split('-- 2. AI')[0]
    expect(tableBlock).toContain('ritual_records_select_own')
    expect(tableBlock).not.toMatch(/ritual_records.*FOR INSERT/i)
    expect(tableBlock).not.toMatch(/ritual_records.*FOR UPDATE/i)
  })

  it('push_subscriptions.topics 와 발송 멱등 로그가 존재한다 (V2·V5)', () => {
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS topics')
    expect(sql).toContain('ritual_push_log')
    expect(sql).toContain('UNIQUE (user_id, lunar_month_seq)')
  })
})

describe('서버 액션 계약 (3A·V1)', () => {
  it('적립량은 system_settings 에서 읽는다 — 클라 입력 불신 (3A)', () => {
    expect(action).toContain("eq('key', 'ritual_bok_amount')")
    expect(action).toContain('p_bok_amount: amount')
  })

  it('RPC 는 admin client 로만 호출한다 (V1)', () => {
    expect(action).toMatch(/admin\.rpc\('enter_ritual'/)
    expect(action).toMatch(/admin\.rpc\('complete_ritual'/)
  })

  it("'use server' 파일에 상수 export 가 없다 (빌드 사망 함정)", () => {
    expect(action.startsWith("'use server'")).toBe(true)
    expect(action).not.toMatch(/^export const /m)
  })

  it('창 판정은 서버 단일 함수 getRitualWindow 를 쓴다 (5A)', () => {
    expect(action).toContain('getRitualWindow()')
  })
})

describe('크론 계약 (E1·V5)', () => {
  it('발송 조건은 창 내 && 미발송 — 미스런 복원 (E1)', () => {
    expect(cron).toContain('window.inWindow')
    expect(cron).toContain('ritual_push_log')
  })

  it('CRON_SECRET 인증 패턴을 따른다', () => {
    expect(cron).toContain('CRON_SECRET')
    expect(cron).toContain('status: 401')
  })

  it('옵트인 토픽 필터가 있다 (V2)', () => {
    expect(cron).toContain("contains('topics'")
  })
})
