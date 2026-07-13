-- 질문권 원자 RPC (2026-07-13, 신당 3.1 §5.1-4)
-- 기존 read-then-write(UPSERT/UPDATE)는 동시 요청 시 이중지급·단일차감 레이스 —
-- award_deity_bond와 동일하게 service_role 전용 원자 함수로 대체.

CREATE OR REPLACE FUNCTION public.add_shaman_credits(p_user_id uuid, p_amount int)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_new int;
BEGIN
  IF p_amount <= 0 THEN RETURN -1; END IF;
  INSERT INTO public.shaman_question_credits (user_id, purchased_credits)
  VALUES (p_user_id, p_amount)
  ON CONFLICT (user_id)
  DO UPDATE SET purchased_credits = public.shaman_question_credits.purchased_credits + EXCLUDED.purchased_credits
  RETURNING purchased_credits INTO v_new;
  RETURN v_new;
END $$;

CREATE OR REPLACE FUNCTION public.consume_shaman_credit(p_user_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_new int;
BEGIN
  UPDATE public.shaman_question_credits
  SET purchased_credits = purchased_credits - 1
  WHERE user_id = p_user_id AND purchased_credits > 0
  RETURNING purchased_credits INTO v_new;
  IF v_new IS NULL THEN RETURN -1; END IF;
  RETURN v_new;
END $$;

REVOKE ALL ON FUNCTION public.add_shaman_credits(uuid, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_shaman_credit(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_shaman_credits(uuid, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_shaman_credit(uuid) TO service_role;
