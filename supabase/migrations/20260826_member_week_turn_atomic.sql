-- 멤버십 주간분 차감을 원자적으로 (2026-08-26)
--
-- 사고: 네 주머니 중 멤버십 주간분만 «세기»와 «늘리기»가 갈라져 있었다.
--   1) status.memberWeeklyRemaining > 0  (별도 SELECT)
--   2) record_ai_chat_turn              (무조건 total_turns + 1)
-- 전형적 TOCTOU. 주간 잔여 1문인 회원이 요청 20개를 동시에 던지면 20개 전부 1)을 통과하고
-- 20개 전부 기록되어 **1문으로 20문**을 쓴다. 레이트리밋(20/분)은 상한을 정할 뿐 막지 못한다.
-- 나머지 세 주머니는 이미 조건부 UPDATE RPC 라 잔량이 없으면 -1 을 돌려준다.
--
-- 처방: 세기와 늘리기를 한 함수 안에 넣고, 같은 유저의 동시 호출을 advisory lock 으로
-- 직렬화한다. 창 계산은 get_member_week_turns 와 **같은 식**(KST)을 쓴다 — 정본은 SQL 한 곳.
--
-- 반환: 남은 문답 수(>=0). 상한 초과·잘못된 인자면 -1.

CREATE OR REPLACE FUNCTION public.consume_member_week_turn(
  p_user_id uuid,
  p_window_start timestamptz,
  p_limit integer,
  p_date date
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_used int;
BEGIN
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN: cross-user access denied' USING ERRCODE = '42501';
  END IF;
  IF p_limit IS NULL OR p_limit <= 0 THEN RETURN -1; END IF;

  -- 같은 유저의 동시 요청 직렬화 — 세고 늘리는 사이에 다른 요청이 끼어들지 못하게.
  PERFORM pg_advisory_xact_lock(hashtext('member_week_turn:' || p_user_id::text));

  SELECT COALESCE(SUM(total_turns), 0)::int INTO v_used
  FROM public.ai_chat_usage
  WHERE user_id = p_user_id
    AND usage_date >= (p_window_start AT TIME ZONE 'Asia/Seoul')::date
    AND usage_date <  ((p_window_start + interval '7 days') AT TIME ZONE 'Asia/Seoul')::date;

  IF v_used >= p_limit THEN RETURN -1; END IF;

  UPDATE public.ai_chat_usage
  SET total_turns = total_turns + 1, updated_at = NOW()
  WHERE user_id = p_user_id AND usage_date = p_date;
  IF NOT FOUND THEN
    INSERT INTO public.ai_chat_usage (user_id, usage_date, session_count, total_turns, total_talisman_used)
    VALUES (p_user_id, p_date, 0, 1, 0);
  END IF;

  RETURN p_limit - v_used - 1;
END $function$;

REVOKE ALL ON FUNCTION public.consume_member_week_turn(uuid, timestamptz, integer, date) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.consume_member_week_turn(uuid, timestamptz, integer, date) FROM anon, authenticated;
