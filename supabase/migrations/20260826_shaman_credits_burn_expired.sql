-- 만료된 구매 질문권이 재구매 때 부활하던 것 — 더하기 전에 소각 (2026-08-26)
--
-- 사고: purchased_credits 는 풀 하나 + expires_at 한 개다. 만료돼도 숫자를 0으로 깎지
-- 않고 «표시와 소비에서만» 없는 셈 쳤다. 그래서 재구매가 죽은 잔여를 되살렸다.
--   Day1  10문 구매 → purchased_credits=10, expires_at=Day31
--   2문만 쓰고 방치 → Day31 만료(화면·소비 모두 0)
--   Day60 다시 1만냥 결제 → 8 + 10 = 18 → **1만냥에 18문**
--
-- 처방: ON CONFLICT 갱신에서 기존 잔여가 이미 만료됐으면 그 값을 버리고 새로 산 것만 남긴다.
-- 레거시 무기한(expires_at IS NULL)은 만료 개념이 없으므로 영향받지 않는다.
--
-- 라이브 영향: 현재 shaman_question_credits 는 레거시 무기한 1행뿐이라 즉시 변화 없음.
-- 오픈 후 첫 만료 사이클부터 상시 새던 구조를 미리 막는다.

CREATE OR REPLACE FUNCTION public.add_shaman_credits(p_user_id uuid, p_amount integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    -- 🔴 기존 잔여가 이미 만료됐으면 더하지 않는다(소각). 되살리면 «1만냥에 18문»이 된다.
    purchased_credits = CASE
      WHEN public.shaman_question_credits.expires_at IS NOT NULL
       AND public.shaman_question_credits.expires_at <= now()
      THEN EXCLUDED.purchased_credits
      ELSE public.shaman_question_credits.purchased_credits + EXCLUDED.purchased_credits
    END,
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
END $function$;

REVOKE ALL ON FUNCTION public.add_shaman_credits(uuid, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.add_shaman_credits(uuid, integer) FROM anon, authenticated;
