-- 속풀이 질문권 자격 개편 (2026-08-25, CEO 결정)
--
-- 바뀌는 것:
--   · 무료 일일 10회 폐지 → 0 (일반·신규 가입자)
--   · 멤버십은 «구독 주기 기준 7일»마다 10회 (집계는 ai_chat_usage 합산 — 스키마 변경 없음)
--   · 명식 입력을 마친 계정에 평생 1회 맛보기
--   · 구매 질문권: 1만냥 20회·무기한 → 1만냥 10회·30일 소비기한
--   · 「속풀이 1일권」(24시간 입장권) 폐기 → 「속풀이 10문 이용권」으로 대체
--
-- 🔴 이미 판 물건에 소급 만료를 걸지 않는다. 이 마이그레이션 이전에 구매된 질문권은
--    expires_at IS NULL 로 남고, 그 상태를 «무기한»으로 읽는다(lib/domain/chat/entitlements.ts
--    isCreditExpired). 소비기한은 이 시점 이후의 신규 구매분에만 붙는다.
--
-- 🔴 이 리포에는 마이그레이션 자동 적용 파이프라인이 없다 — 사람이 Supabase MCP 로 적용한다.
--    반드시 «마이그레이션 적용 → 코드 배포» 순서. 코드를 먼저 올리면 없는 컬럼을 부르며 죽는다.

-- ① 스키마 확장 -------------------------------------------------------------

ALTER TABLE public.shaman_question_credits
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS onboarding_credits int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS onboarding_granted_at timestamptz;

COMMENT ON COLUMN public.shaman_question_credits.expires_at IS
  '구매 질문권 소비기한. NULL = 무기한(2026-08-25 소비기한 도입 이전 구매분) — 소급 만료 금지.';
COMMENT ON COLUMN public.shaman_question_credits.onboarding_credits IS
  '명식 입력 완료 맛보기 질문 잔여. 평생 1회만 지급된다.';
COMMENT ON COLUMN public.shaman_question_credits.onboarding_granted_at IS
  '맛보기 지급 시각. NOT NULL 이면 재지급하지 않는다(멱등 잠금).';

CREATE INDEX IF NOT EXISTS shaman_question_credits_live
  ON public.shaman_question_credits (user_id)
  WHERE purchased_credits > 0 OR onboarding_credits > 0;

-- ② 운영 스위치 (어드민이 무배포 조정) ---------------------------------------

INSERT INTO public.system_settings (key, value, description) VALUES
  ('chat_credit_expire_days', '30', '구매 질문권 소비기한(일). 0 이면 무기한'),
  ('chat_member_weekly_questions', '10', '멤버십 회원에게 구독 주기 기준 7일마다 주어지는 질문 수'),
  ('chat_onboarding_free_questions', '1', '명식 입력 완료 시 평생 1회 지급되는 맛보기 질문 수')
ON CONFLICT (key) DO NOTHING;

-- ③ 구매 적립 — 소비기한을 붙인다 ---------------------------------------------
-- 시그니처(uuid, int)를 유지한다: 인자를 늘리면 오버로드가 생겨 호출이 모호해진다.
-- 레거시 무기한 풀이 남아 있는 계정은 계속 무기한으로 둔다(사용자에게 불리해지지 않는다).

CREATE OR REPLACE FUNCTION public.add_shaman_credits(p_user_id uuid, p_amount int)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new int;
  v_days int;
  v_legacy boolean;
BEGIN
  IF p_amount <= 0 THEN RETURN -1; END IF;

  SELECT COALESCE(NULLIF(value, '')::int, 30) INTO v_days
  FROM public.system_settings WHERE key = 'chat_credit_expire_days';
  IF v_days IS NULL THEN v_days := 30; END IF;

  -- 이 계정이 «무기한 잔여»를 들고 있으면 그 성질을 지킨다.
  SELECT (purchased_credits > 0 AND expires_at IS NULL) INTO v_legacy
  FROM public.shaman_question_credits WHERE user_id = p_user_id;

  INSERT INTO public.shaman_question_credits (user_id, purchased_credits, expires_at)
  VALUES (
    p_user_id,
    p_amount,
    CASE WHEN v_days <= 0 THEN NULL ELSE now() + make_interval(days => v_days) END
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    purchased_credits = public.shaman_question_credits.purchased_credits + EXCLUDED.purchased_credits,
    expires_at = CASE
      WHEN COALESCE(v_legacy, false) THEN NULL           -- 레거시 무기한 유지
      WHEN v_days <= 0 THEN NULL
      -- 재구매는 만료를 «연장»만 한다. 절대 앞당기지 않는다.
      ELSE GREATEST(
        COALESCE(public.shaman_question_credits.expires_at, now()),
        now() + make_interval(days => v_days)
      )
    END,
    updated_at = now()
  RETURNING purchased_credits INTO v_new;

  RETURN v_new;
END $$;

-- ④ 구매 질문권 소비 — 만료분은 없는 셈 친다 -----------------------------------

CREATE OR REPLACE FUNCTION public.consume_shaman_credit(p_user_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_new int;
BEGIN
  UPDATE public.shaman_question_credits
  SET purchased_credits = purchased_credits - 1, updated_at = now()
  WHERE user_id = p_user_id
    AND purchased_credits > 0
    AND (expires_at IS NULL OR expires_at > now())
  RETURNING purchased_credits INTO v_new;
  IF v_new IS NULL THEN RETURN -1; END IF;
  RETURN v_new;
END $$;

-- ⑤ 구매 질문권 환급 — 만료 시각을 건드리지 않는다 -------------------------------
-- add_shaman_credits 로 환급하면 소비기한이 연장돼 «실패가 이득»이 된다. 갈라 둔다.

CREATE OR REPLACE FUNCTION public.refund_shaman_credit(p_user_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_new int;
BEGIN
  UPDATE public.shaman_question_credits
  SET purchased_credits = purchased_credits + 1, updated_at = now()
  WHERE user_id = p_user_id
  RETURNING purchased_credits INTO v_new;
  IF v_new IS NULL THEN RETURN -1; END IF;
  RETURN v_new;
END $$;

-- ⑥ 명식 완료 맛보기 — 평생 1회, 멱등 -------------------------------------------
-- 지급 근거(명식 보유)는 호출 «전»에 서버가 판정한다. 여기서는 재지급만 막는다.
-- 반환값: 실제 지급된 수(이미 받았으면 0).

CREATE OR REPLACE FUNCTION public.grant_onboarding_credit(p_user_id uuid, p_amount int)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_granted int;
BEGIN
  IF p_amount <= 0 THEN RETURN 0; END IF;

  INSERT INTO public.shaman_question_credits (user_id, onboarding_credits, onboarding_granted_at)
  VALUES (p_user_id, p_amount, now())
  ON CONFLICT (user_id)
  DO UPDATE SET
    onboarding_credits = public.shaman_question_credits.onboarding_credits + EXCLUDED.onboarding_credits,
    onboarding_granted_at = now(),
    updated_at = now()
  WHERE public.shaman_question_credits.onboarding_granted_at IS NULL
  RETURNING onboarding_credits INTO v_granted;

  -- 충돌 조건(WHERE)이 걸러 UPDATE 가 일어나지 않으면 RETURNING 이 없다 = 이미 받은 계정.
  IF v_granted IS NULL THEN RETURN 0; END IF;
  RETURN p_amount;
END $$;

CREATE OR REPLACE FUNCTION public.consume_onboarding_credit(p_user_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_new int;
BEGIN
  UPDATE public.shaman_question_credits
  SET onboarding_credits = onboarding_credits - 1, updated_at = now()
  WHERE user_id = p_user_id AND onboarding_credits > 0
  RETURNING onboarding_credits INTO v_new;
  IF v_new IS NULL THEN RETURN -1; END IF;
  RETURN v_new;
END $$;

CREATE OR REPLACE FUNCTION public.refund_onboarding_credit(p_user_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_new int;
BEGIN
  UPDATE public.shaman_question_credits
  SET onboarding_credits = onboarding_credits + 1, updated_at = now()
  WHERE user_id = p_user_id
  RETURNING onboarding_credits INTO v_new;
  IF v_new IS NULL THEN RETURN -1; END IF;
  RETURN v_new;
END $$;

-- ⑦ 멤버십 주간 사용량 — 구독 주기 앵커 [start, start+7d) 합산 --------------------
-- 창 계산은 TS(lib/domain/chat/entitlements.ts memberWeekWindow)와 같은 규칙이지만,
-- 집계는 여기서 한다 — ai_chat_usage 는 날짜 행이라 앱에서 훑으면 왕복이 늘어난다.

CREATE OR REPLACE FUNCTION public.get_member_week_turns(p_user_id uuid, p_window_start timestamptz)
RETURNS int
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(total_turns), 0)::int
  FROM public.ai_chat_usage
  WHERE user_id = p_user_id
    AND usage_date >= (p_window_start AT TIME ZONE 'Asia/Seoul')::date
    AND usage_date <  ((p_window_start + interval '7 days') AT TIME ZONE 'Asia/Seoul')::date;
$$;

-- ⑧ 권한 — 전부 service_role 전용 (인자 위조 표면 차단) --------------------------

REVOKE ALL ON FUNCTION public.add_shaman_credits(uuid, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_shaman_credit(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refund_shaman_credit(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.grant_onboarding_credit(uuid, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_onboarding_credit(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refund_onboarding_credit(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_member_week_turns(uuid, timestamptz) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.add_shaman_credits(uuid, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_shaman_credit(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_shaman_credit(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.grant_onboarding_credit(uuid, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_onboarding_credit(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_onboarding_credit(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_member_week_turns(uuid, timestamptz) TO service_role;
