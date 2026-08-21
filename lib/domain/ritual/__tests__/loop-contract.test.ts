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
  })

  it('완주 RPC 가 기원 누적을 record_shrine_devotion 에 위임한다 (10A)', () => {
    const completeBody = sql.split('FUNCTION public.complete_ritual')[1]?.split('$$;')[0] ?? ''
    // 향을 올리면 신당 기원 누적(= 단 진행)도 같이 올라야 축적이 한 갈래로 남는다.
    expect(completeBody).toContain('record_shrine_devotion')
    // ⚠️ KST 일 멱등을 여기서 재구현하면 자정 경계가 갈라진다 — 그 함수만 알고 있어야 한다.
    expect(completeBody).not.toContain('last_prayer_date')
  })

  it('보상은 복채(add_bokchae) — bok_points 는 소비처 없는 게이지라 쓰지 않는다 (11A)', () => {
    const completeBody = sql.split('FUNCTION public.complete_ritual')[1]?.split('$$;')[0] ?? ''
    expect(completeBody).toContain('add_bokchae')
    expect(completeBody).not.toContain('add_bok_points')
    // 새 원장을 만들지 않는다 — add_bokchae 가 wallet_transactions 에 이미 남긴다.
    expect(completeBody).not.toContain('INSERT INTO bok_transactions')
    expect(sql).not.toContain('bok_transactions_type_check')
  })

  it('소원 갈래는 기존 신당 소원 목록과 같다 — 새 enum 금지 (9A)', () => {
    expect(sql).toMatch(
      /wish_category TEXT CHECK \(wish_category IN \('health','exam','love','wealth','family','business','other'\)\)/
    )
    expect(sql).not.toMatch(/wish_category TEXT NOT NULL/)
  })

  it('소원 원문 컬럼도 RPC 인자도 없다 — 자리를 안 만드는 것이 유일한 강제다 (9A)', () => {
    // baekil.ts 가 같은 이유로 이미 정한 규율. 되살리면 로그·백업에서 회수가 안 된다.
    // (주석에서의 언급까지 막지는 않는다 — 왜 없는지가 적혀 있어야 되살아나지 않는다.)
    expect(sql).not.toMatch(/^\s*wish_text\s+TEXT/m)
    expect(sql).not.toMatch(/p_wish_text/)
    const completeBody = sql.split('FUNCTION public.complete_ritual')[1]?.split('$$;')[0] ?? ''
    expect(completeBody).not.toContain('wish_text')
  })

  it('ritual_records 에 유저 INSERT/UPDATE 정책이 없다 (쓰기는 RPC 전용)', () => {
    const tableBlock = sql.split('-- 2. AI')[0]
    expect(tableBlock).toContain('ritual_records_select_own')
    expect(tableBlock).not.toMatch(/ritual_records.*FOR INSERT/i)
    expect(tableBlock).not.toMatch(/ritual_records.*FOR UPDATE/i)
  })

  // ── 회귀 (기존 신당 기원·백일기도가 이 변경의 사정권에 들어온다) ────────────
  //
  // complete_ritual 이 record_shrine_devotion 을 부르는 순간 shrine_devotion.total_days 가
  // 움직이고, 백일기도 진행도는 그 값에서 파생된다(vowProgress = total − snapshot).
  // 아래 두 계약이 깨지면 기존 기능이 조용히 틀어진다.

  it('회귀: 기원 적립은 완주 upsert 가 성공한 뒤에만 일어난다 — 이미 완주한 달은 안 올린다', () => {
    const completeBody = sql.split('FUNCTION public.complete_ritual')[1]?.split('$$;')[0] ?? ''
    const guardAt = completeBody.indexOf('IF v_id IS NULL THEN')
    const devotionAt = completeBody.indexOf('record_shrine_devotion')
    const awardAt = completeBody.indexOf('add_bokchae')
    expect(guardAt).toBeGreaterThan(-1)
    // 멱등 가드(early RETURN)가 적립·지급보다 **먼저** 와야 중복 탭이 누적을 부풀리지 않는다.
    expect(guardAt).toBeLessThan(devotionAt)
    expect(devotionAt).toBeLessThan(awardAt)
  })

  it('회귀: 기원이 no-op(오늘 이미 기원함)이어도 의례는 완주로 남는다', () => {
    const completeBody = sql.split('FUNCTION public.complete_ritual')[1]?.split('$$;')[0] ?? ''
    // gained 는 읽어서 돌려줄 뿐, 완주 여부를 되돌리는 분기의 조건이 되어선 안 된다.
    // (신당 페이지에서 오늘 이미 기원한 유저가 의례를 못 끝내는 회귀가 여기서 난다.)
    expect(completeBody).toContain('INTO v_gained')
    expect(completeBody).not.toMatch(/IF\s+(NOT\s+)?v_gained/i)
    expect(completeBody).not.toMatch(/v_gained[\s\S]{0,40}RAISE EXCEPTION/i)
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

  it('클라이언트로부터 uuid 배열을 받지 않는다 — 가족 가설 지표 위조 차단 (7A)', () => {
    // 열람 목록은 서버가 자기 family_members 에서 파생한다. 인터페이스에 배열이 다시
    // 생기면 「식구 모시기」 지표가 조작 가능해지고, 그 숫자가 2단계 확산을 결정한다.
    expect(action).not.toMatch(/membersViewed\?:\s*string\[\]/)
    expect(action).toMatch(/from\('family_members'\)[\s\S]{0,120}eq\('user_id', user\.id\)/)
    expect(action).toContain('p_members_viewed: membersViewed')
  })

  it('소원 원문을 인자로도 받지 않는다 (9A)', () => {
    expect(action).not.toContain('wishText')
    expect(action).not.toContain('p_wish_text')
  })

  it('기원 누적의 KST 날짜는 창 판정과 같은 서버 시계에서 나온다 (10A)', () => {
    expect(action).toContain('p_kst_today: window.kstDate')
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
