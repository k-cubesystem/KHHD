-- 속풀이 P0-F5 — AI 실패 시 일일 무료 질문권 보상 환급 RPC (2026-08-22)
-- 차감(record_ai_chat_turn / consume_shaman_credit)이 Gemini 호출 «전»에 일어나므로,
-- 호출이 실패하면 질문권이 그냥 소실됐다. 전송 액션의 catch 가 이 함수로 되돌린다.
-- (구매권 환급은 기존 add_shaman_credits(+1) 재사용 — 이 파일은 무료분 전용.)
-- 20260713_shaman_credit_rpcs.sql 과 동일 원칙: service_role 전용 원자 함수.

CREATE OR REPLACE FUNCTION public.refund_ai_chat_turn(p_user_id uuid, p_date date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.ai_chat_usage
  SET total_turns = GREATEST(0, total_turns - 1),
      updated_at = NOW()
  WHERE user_id = p_user_id AND usage_date = p_date;
END $$;

REVOKE ALL ON FUNCTION public.refund_ai_chat_turn(uuid, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_ai_chat_turn(uuid, date) TO service_role;
