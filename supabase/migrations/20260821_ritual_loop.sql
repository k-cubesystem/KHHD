-- =====================================================================
-- 초하루 의례 루프 (ritual loop)
-- 설계: docs/designs/ritual-loop-traditional-rollout.md
--   3A  complete_ritual SECURITY DEFINER 원자화 (기록+적립 단일 트랜잭션)
--   T5  lunar_month_seq(서수)·entered_at·윤달 구분
--   V1  RPC 는 service_role 전용 — authenticated 직접 호출 금지 (인자 위조 차단)
--   V2  push_subscriptions.topics — 목적별 구독 (초하루 옵트인)
--   V3  wish_category nullable — 진입 INSERT 는 소원 없이, 완주 시 필수 검증
--   V5  발송 멱등 — ritual_push_log 로 유저·월 단위 1회 발송
--
-- Eng 리뷰 보정 (2026-08-21, /gstack-plan-eng-review):
--   9A  wish_text 컬럼 삭제 — 소원 원문은 스키마에 자리를 만들지 않는 것으로 강제
--       (lib/domain/ritual/baekil.ts 가 같은 이유로 이미 정한 규율)
--   10A complete_ritual 이 record_shrine_devotion 을 **호출**한다 — 적립과 KST 일
--       멱등은 그 함수 안에만 있고 여기서 재구현하지 않는다
--   11A 보상은 복채(wallets) — bok_points 는 소비처 없는 tier 게이지라 체감이 없다
--   7A  members_viewed 는 서버가 파생한 값만 들어온다 (액션이 클라 uuid 를 받지 않음)
--
-- 적용 검증 (2026-08-21, 라이브 plzvanxcxjkaazcfrtls · BEGIN…ROLLBACK · 무흔적):
--   이 파일은 아직 **라이브에 적용되지 않았다**. 아래는 적용 전 검증 기록이다.
--   로컬에 supabase CLI·psql·docker 가 없어, 전문을 트랜잭션으로 감싸 실행하고
--   되돌리는 방식으로 확인했다(사전에 빈 프로브 테이블로 ROLLBACK 동작을 확인).
--
--   ① 파스·적용 — 테이블 3종·RLS·topics 컬럼·RPC 2종·GRANT/REVOKE·시드 전부 통과.
--      특히 record_shrine_devotion 을 FROM 절에서 부르고 INTO 로 받는 문법,
--      구 8인자 시그니처 DROP, 중첩 SECURITY DEFINER 호출이 유효함을 확인.
--   ② 실행 — 실제 유저로 complete_ritual 호출:
--        복채       590 → 650  (+30 × 완주 2회)
--        기원 누적    0 → 1    ← **완주 2회인데 +1**. KST 일 멱등(10A)이 작동한다.
--        T1 첫 완주   already=false / awarded=30 / gained=true  / total=1
--        T2 같은 달   already=true  / awarded=0                  ← 음력월 멱등
--        T3 회귀      already=false / awarded=30 / gained=false  ← 기원이 no-op 이어도
--           의례는 완주한다. 「신당에서 오늘 기원한 유저가 의례를 못 끝내는」 회귀가
--           실제로 없음을 실행으로 재현한 것(계약 테스트 회귀 #2 의 라이브 대응).
--   ③ 잔존물 0 — ritual 테이블·함수·설정·topics 컬럼 전부 미생성,
--      wallets 7행/합 1135 · shrine_devotion 1행/합 3 로 검증 전과 동일.
--
--   ⚠️ 재검증이 필요하면 같은 방법(BEGIN…ROLLBACK)을 쓸 것.
--
--   🔴 정정(2026-08-21): 이 자리에 «배포 파이프라인이 적용한다»고 적었던 것은 **거짓**이다.
--      그런 파이프라인이 없다 — 워크플로는 .github/workflows/prod-smoke.yml 하나뿐이고,
--      package.json 스크립트·vercel.json 빌드 훅 어디에도 마이그레이션 적용이 없다.
--      **적용 경로는 사람이 Supabase MCP(apply_migration)로 거는 것 하나뿐이다.**
--      기다리면 영영 안 올라가고, 코드만 먼저 배포되면 없는 테이블을 부르며 죽는다.
--      (이 파일은 2026-08-21 18시경 MCP 로 적용 완료 — 재적용 불필요.)
-- =====================================================================

-- 1. 의례 기록 원장 ----------------------------------------------------
CREATE TABLE IF NOT EXISTS ritual_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- 음력 "YYYY-MM" (윤달 여부는 is_leap_month 로 구분 — 같은 월번호 초하루가 한 해 두 번 가능)
  ritual_month TEXT NOT NULL,
  is_leap_month BOOLEAN NOT NULL DEFAULT false,
  -- 2000년 음력 정월=0 기준 월 서수. 연속 기록 판정 = seq + 1 비교 (윤달 삽입 위치 무관)
  lunar_month_seq INTEGER NOT NULL,
  -- 의례 창(음력 1~3일) 내 첫 진입 시각 = 완주율 분모. 창 밖 진입은 행을 만들지 않는다.
  entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- 기원 서버 액션 성공 시각 = 완주 판정 단일 정의 (GA ritual_complete 와 동시)
  completed_at TIMESTAMPTZ,
  -- 완주 시점에 열람한 가족 카드 (family_member_id 만, 본인 제외 — E3)
  members_viewed UUID[] NOT NULL DEFAULT '{}',
  -- 9A: 소원 갈래는 기존 신당 소원(shrine_wishes.category)과 **같은 목록**이다.
  --     갈래가 두 벌이 되면 통계도 이미지 자산(public/shrine/wish/*.webp)도 갈라진다.
  --     ⚠️ 소원 **원문 컬럼은 만들지 않는다** — 자리를 안 만드는 것이 유일하게 확실한 강제다.
  --        (원문은 클라이언트의 소원 카드 연출로만 쓰이고 화면을 떠나지 않는다.)
  wish_category TEXT CHECK (wish_category IN ('health','exam','love','wealth','family','business','other')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ritual_records_month_uniq UNIQUE (user_id, ritual_month, is_leap_month)
);

CREATE INDEX IF NOT EXISTS ritual_records_user_seq_idx ON ritual_records (user_id, lunar_month_seq DESC);

ALTER TABLE ritual_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ritual_records_select_own" ON ritual_records;
CREATE POLICY "ritual_records_select_own" ON ritual_records FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "ritual_records_service_role" ON ritual_records;
CREATE POLICY "ritual_records_service_role" ON ritual_records FOR ALL USING (auth.role() = 'service_role');
-- INSERT/UPDATE 유저 정책 없음 — 쓰기는 아래 RPC(service_role) 전용

-- 2. AI 월간 1줄 카드 캐시 (결정 1A — 폴백은 결정론이라 캐시 불필요, AI 만 캐시)
CREATE TABLE IF NOT EXISTS ritual_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- 본인 카드는 전량 0 UUID 로 표기 (nullable unique 회피)
  family_member_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  ritual_month TEXT NOT NULL,
  is_leap_month BOOLEAN NOT NULL DEFAULT false,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ritual_cards_uniq UNIQUE (user_id, family_member_id, ritual_month, is_leap_month)
);

ALTER TABLE ritual_cards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ritual_cards_select_own" ON ritual_cards;
CREATE POLICY "ritual_cards_select_own" ON ritual_cards FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "ritual_cards_service_role" ON ritual_cards;
CREATE POLICY "ritual_cards_service_role" ON ritual_cards FOR ALL USING (auth.role() = 'service_role');

-- 3. 초하루 푸시 발송 로그 — 유저·월 단위 멱등 (V5: 부분 실패에도 안전)
CREATE TABLE IF NOT EXISTS ritual_push_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lunar_month_seq INTEGER NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ritual_push_log_uniq UNIQUE (user_id, lunar_month_seq)
);

ALTER TABLE ritual_push_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ritual_push_log_service_role" ON ritual_push_log;
CREATE POLICY "ritual_push_log_service_role" ON ritual_push_log FOR ALL USING (auth.role() = 'service_role');

-- 4. 푸시 목적별 구독 (V2) — 기존 구독자는 빈 배열 = 초하루 미옵트인
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS topics TEXT[] NOT NULL DEFAULT '{}';

-- 5. (삭제됨) bok_transactions type 확장
--    11A 로 보상이 복채(wallets)로 바뀌면서 필요 없어졌다. 적립은 기존 add_bokchae 가
--    wallet_transactions 에 type='BONUS' 로 남기고, 그 CHECK 에 BONUS 가 이미 있다
--    (실측: CHARGE·USE·BONUS·SUBSCRIPTION·REFUND). **기존 원장 제약을 건드리지 않는다.**

-- 6. 진입 RPC — 창 내 첫 진입만 행 생성 (E2: ON CONFLICT DO NOTHING = 2탭 동시 안전)
--    창 판정·서수 계산은 서버(KST 단일 함수)가 하고 인자로 전달한다.
--    service_role 전용이므로 인자 위조 불가(V1).
CREATE OR REPLACE FUNCTION public.enter_ritual(
  p_user_id UUID,
  p_ritual_month TEXT,
  p_is_leap BOOLEAN,
  p_seq INTEGER
) RETURNS TABLE (already_completed BOOLEAN, entered_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO ritual_records (user_id, ritual_month, is_leap_month, lunar_month_seq)
  VALUES (p_user_id, p_ritual_month, p_is_leap, p_seq)
  ON CONFLICT (user_id, ritual_month, is_leap_month) DO NOTHING;

  RETURN QUERY
    SELECT r.completed_at IS NOT NULL, r.entered_at
    FROM ritual_records r
    WHERE r.user_id = p_user_id
      AND r.ritual_month = p_ritual_month
      AND r.is_leap_month = p_is_leap;
END;
$$;

-- 7. 완주 RPC — 기록 + 기원 누적 + 복채 적립을 **한 트랜잭션**으로 (3A·10A·11A).
--    멱등: 유저·음력월(윤달 구분)당 1회.
--    E2: 행 부재 시에도 원자 upsert 로 entered_at=completed_at 동시 기록.
--    V3: wish_category 는 여기서 필수 검증 (진입 행은 소원 없이 존재 가능).
--
--    ⚠️ 세 단계의 **순서가 계약이다.** 1이 실패하면 2·3을 시도하지 않는다. 순서를 바꾸거나
--       단계를 밖으로 빼면 「향은 올라갔는데 장부는 빈달」 이 무증상으로 생긴다
--       (Eng 리뷰 실패모드 #1 — complete_shrine_vow 가 같은 이유로 한 함수 안에 있다).
--
--    ⚠️ **하루 중복 적립 방지를 여기서 다시 구현하지 말 것(10A).** record_shrine_devotion 이
--       `last_prayer_date is distinct from p_today` 로 이미 하고 있고 gained 를 돌려준다.
--       같은 규칙을 두 곳에 두면 자정 경계가 갈라진다. 신당에서 오늘 이미 기원했으면
--       gained=false 로 no-op 되지만 **의례는 정상 완주한다** — 두 멱등은 서로 다른 질문
--       ("이 달의 의례를 했나" / "오늘 적립했나")에 답하므로 이중화가 아니다.
CREATE OR REPLACE FUNCTION public.complete_ritual(
  p_user_id UUID,
  p_ritual_month TEXT,
  p_is_leap BOOLEAN,
  p_seq INTEGER,
  p_wish_category TEXT,
  p_members_viewed UUID[],
  p_bok_amount INTEGER,
  p_kst_today DATE
) RETURNS TABLE (
  already_completed BOOLEAN,
  awarded INTEGER,
  balance INTEGER,
  devotion_gained BOOLEAN,
  devotion_total INTEGER
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_id UUID;
  v_balance INTEGER := 0;
  v_amount INTEGER := GREATEST(COALESCE(p_bok_amount, 0), 0);
  v_gained BOOLEAN := false;
  v_total INTEGER := 0;
BEGIN
  -- 소원 갈래는 기존 신당 소원 목록과 같아야 한다(9A). 원문은 받지 않는다.
  IF p_wish_category IS NULL
     OR p_wish_category NOT IN ('health','exam','love','wealth','family','business','other') THEN
    RAISE EXCEPTION 'WISH_REQUIRED';
  END IF;

  -- ① 음력월 멱등 게이트 — 이 달의 의례를 이미 했는지는 오직 여기서만 판정한다.
  INSERT INTO ritual_records
    (user_id, ritual_month, is_leap_month, lunar_month_seq,
     completed_at, wish_category, members_viewed)
  VALUES
    (p_user_id, p_ritual_month, p_is_leap, p_seq,
     now(), p_wish_category, COALESCE(p_members_viewed, '{}'))
  ON CONFLICT (user_id, ritual_month, is_leap_month) DO UPDATE SET
    completed_at   = now(),
    wish_category  = EXCLUDED.wish_category,
    members_viewed = EXCLUDED.members_viewed
  WHERE ritual_records.completed_at IS NULL
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    -- 이미 완주된 달 (중복 탭·2탭) — 멱등 성공, 적립 없음
    RETURN QUERY SELECT
      true, 0,
      COALESCE((SELECT w.balance FROM wallets w WHERE w.user_id = p_user_id), 0),
      false,
      COALESCE((SELECT d.total_days FROM shrine_devotion d WHERE d.user_id = p_user_id), 0);
    RETURN;
  END IF;

  -- ② 기원 누적 — 적립·KST 일 멱등은 이 함수가 단독으로 소유한다(10A).
  --    반환값을 그대로 읽을 뿐 여기서 다시 세지 않는다.
  SELECT r.gained, r.total_days INTO v_gained, v_total
  FROM public.record_shrine_devotion(p_user_id, COALESCE(p_kst_today, (now() AT TIME ZONE 'Asia/Seoul')::date)) AS r;

  -- ③ 복채 적립 — 기존 지급 경로(add_bokchae → wallets + wallet_transactions).
  --    새 원장을 만들지 않으므로 이원화 금지 원칙이 유지된다(11A).
  IF v_amount > 0 THEN
    PERFORM add_bokchae(
      p_user_id,
      v_amount,
      p_ritual_month || CASE WHEN p_is_leap THEN '(윤)' ELSE '' END || ' 초하루 문안'
    );
  END IF;
  SELECT COALESCE(w.balance, 0) INTO v_balance FROM wallets w WHERE w.user_id = p_user_id;

  RETURN QUERY SELECT false, v_amount, COALESCE(v_balance, 0), COALESCE(v_gained, false), COALESCE(v_total, 0);
END;
$$;

-- 8. 권한 — service_role 전용 (V1, burn_shrine_aekmak 패턴)
REVOKE ALL ON FUNCTION public.enter_ritual(UUID, TEXT, BOOLEAN, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enter_ritual(UUID, TEXT, BOOLEAN, INTEGER) TO service_role;
-- 구(舊) 시그니처가 남아 있으면 오버로드가 되어 호출이 갈린다 — 먼저 지운다.
DROP FUNCTION IF EXISTS public.complete_ritual(UUID, TEXT, BOOLEAN, INTEGER, TEXT, TEXT, UUID[], INTEGER);
REVOKE ALL ON FUNCTION public.complete_ritual(UUID, TEXT, BOOLEAN, INTEGER, TEXT, UUID[], INTEGER, DATE) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_ritual(UUID, TEXT, BOOLEAN, INTEGER, TEXT, UUID[], INTEGER, DATE) TO service_role;

-- 9. 설정 시드 — 킬스위치(2A) + 적립량 서버 고정(3A·11A)
INSERT INTO system_settings (key, value, description) VALUES
  ('ritual_enabled', 'true', '초하루 의례 기능 스위치 (false 면 페이지·크론 전부 차단)'),
  ('ritual_bok_amount', '30', '초하루 기원 완주 복채 적립량 (만냥). 0 이면 적립 없음')
ON CONFLICT (key) DO NOTHING;

-- 10. AI 프롬프트 시드 (1A — 수동 입력 금지, 마이그레이션이 정본)
INSERT INTO ai_prompts (key, label, category, template, description, talisman_cost)
VALUES (
  'ritual_month_line',
  '초하루 월간 1줄 문안',
  'fortune',
  E'당신은 청담해화당의 해화지기다. 아래 명식의 주인에게 이번 달({{month_label}}) 문안 한 줄을 건넨다.\n\n[명식] {{name}} — {{saju}}\n\n규칙:\n- 정확히 한 문장, 60자 이내.\n- 존대하되 점잖고 따뜻한 어조. 「~로 봅니다」 「~하세요」 어미.\n- 이번 달의 기운 한 가지와 실천 한 가지만 담는다.\n- 과장·공포 조장 금지. 의료·투자 단정 금지.',
  '초하루 의례 카드의 월간 1줄 생성 (실패 시 결정론 폴백 사용)',
  0
)
ON CONFLICT (key) DO NOTHING;
