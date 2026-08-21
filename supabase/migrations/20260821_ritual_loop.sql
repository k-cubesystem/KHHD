-- =====================================================================
-- 초하루 의례 루프 (ritual loop)
-- 설계: docs/designs/ritual-loop-traditional-rollout.md
--   3A  complete_ritual SECURITY DEFINER 원자화 (기록+적립 단일 트랜잭션)
--   T5  lunar_month_seq(서수)·entered_at·윤달 구분
--   V1  RPC 는 service_role 전용 — authenticated 직접 호출 금지 (인자 위조 차단)
--   V2  push_subscriptions.topics — 목적별 구독 (초하루 옵트인)
--   V3  wish_category nullable — 진입 INSERT 는 소원 없이, 완주 시 필수 검증
--   V5  발송 멱등 — ritual_push_log 로 유저·월 단위 1회 발송
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
  wish_category TEXT CHECK (wish_category IN ('PEACE','WEALTH','STUDY','HEALTH','CUSTOM')),
  wish_text TEXT CHECK (char_length(wish_text) <= 100),
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

-- 5. bok_transactions type 확장 — 의례 완주 적립
ALTER TABLE bok_transactions
  DROP CONSTRAINT IF EXISTS bok_transactions_type_check;
ALTER TABLE bok_transactions
  ADD CONSTRAINT bok_transactions_type_check
  CHECK (type IN (
    'REGISTER','ANALYSIS','COMPATIBILITY','FORTUNE','SHARE',
    'CHECKIN','BONUS','REFERRAL','MISSION',
    'SHRINE_WISH_OWN','SHRINE_WISH_VISIT','SHRINE_ITEM_PURCHASE',
    'RITUAL_COMPLETE'
  ));

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

-- 7. 완주 RPC — 기록 + 복 적립 단일 트랜잭션 (3A). 멱등: 유저·음력월(윤달 구분)당 1회.
--    E2: 행 부재 시에도 원자 upsert 로 entered_at=completed_at 동시 기록.
--    V3: wish_category 는 여기서 필수 검증 (진입 행은 소원 없이 존재 가능).
CREATE OR REPLACE FUNCTION public.complete_ritual(
  p_user_id UUID,
  p_ritual_month TEXT,
  p_is_leap BOOLEAN,
  p_seq INTEGER,
  p_wish_category TEXT,
  p_wish_text TEXT,
  p_members_viewed UUID[],
  p_bok_amount INTEGER
) RETURNS TABLE (already_completed BOOLEAN, awarded INTEGER, balance INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_id UUID;
  v_balance INTEGER := 0;
  v_amount INTEGER := GREATEST(COALESCE(p_bok_amount, 0), 0);
BEGIN
  IF p_wish_category IS NULL
     OR p_wish_category NOT IN ('PEACE','WEALTH','STUDY','HEALTH','CUSTOM') THEN
    RAISE EXCEPTION 'WISH_REQUIRED';
  END IF;
  IF p_wish_category = 'CUSTOM'
     AND (p_wish_text IS NULL OR length(btrim(p_wish_text)) = 0) THEN
    RAISE EXCEPTION 'WISH_TEXT_REQUIRED';
  END IF;

  INSERT INTO ritual_records
    (user_id, ritual_month, is_leap_month, lunar_month_seq,
     completed_at, wish_category, wish_text, members_viewed)
  VALUES
    (p_user_id, p_ritual_month, p_is_leap, p_seq,
     now(), p_wish_category, LEFT(p_wish_text, 100), COALESCE(p_members_viewed, '{}'))
  ON CONFLICT (user_id, ritual_month, is_leap_month) DO UPDATE SET
    completed_at   = now(),
    wish_category  = EXCLUDED.wish_category,
    wish_text      = EXCLUDED.wish_text,
    members_viewed = EXCLUDED.members_viewed
  WHERE ritual_records.completed_at IS NULL
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    -- 이미 완주된 달 (중복 탭·2탭) — 멱등 성공, 적립 없음
    RETURN QUERY SELECT true, 0, (SELECT COALESCE(points, 0) FROM bok_points WHERE bok_points.user_id = p_user_id);
    RETURN;
  END IF;

  IF v_amount > 0 THEN
    v_balance := add_bok_points(p_user_id, v_amount);
    INSERT INTO bok_transactions (user_id, amount, type, description)
    VALUES (p_user_id, v_amount, 'RITUAL_COMPLETE', p_ritual_month || CASE WHEN p_is_leap THEN '(윤)' ELSE '' END || ' 초하루 문안');
  END IF;

  RETURN QUERY SELECT false, v_amount, v_balance;
END;
$$;

-- 8. 권한 — service_role 전용 (V1, burn_shrine_aekmak 패턴)
REVOKE ALL ON FUNCTION public.enter_ritual(UUID, TEXT, BOOLEAN, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enter_ritual(UUID, TEXT, BOOLEAN, INTEGER) TO service_role;
REVOKE ALL ON FUNCTION public.complete_ritual(UUID, TEXT, BOOLEAN, INTEGER, TEXT, TEXT, UUID[], INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_ritual(UUID, TEXT, BOOLEAN, INTEGER, TEXT, TEXT, UUID[], INTEGER) TO service_role;

-- 9. 설정 시드 — 킬스위치(2A) + 적립량 서버 고정(3A)
INSERT INTO system_settings (key, value, description) VALUES
  ('ritual_enabled', 'true', '초하루 의례 기능 스위치 (false 면 페이지·크론 전부 차단)'),
  ('ritual_bok_amount', '30', '초하루 기원 완주 복 포인트 적립량')
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
