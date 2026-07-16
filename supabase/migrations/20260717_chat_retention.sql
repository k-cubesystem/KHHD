-- 채팅 보존 정책 (P1) — 멤버십 차등 보존 + 종료 세션 원문 정리
-- 근거: TEAM_G_DESIGN/prd/PLAN-family-shrine-chat-v1.md §2 (보존기간 무료30/S90/F180/B365 — 2026-07-17 사용자 승인)
-- 원칙: 삭제 대상은 "종료된 세션(ended_at NOT NULL)의 원문 메시지"만. 요약(chat_sessions.summary)과
--       장기기억(user_ai_memory)은 영구 보존 — 원문이 지워져도 신은 기억한다.

-- ============================================================
-- 1. membership_plans.chat_retention_days — 등급별 종료 세션 보존일
-- ============================================================
ALTER TABLE public.membership_plans
  ADD COLUMN IF NOT EXISTS chat_retention_days integer NOT NULL DEFAULT 90;
COMMENT ON COLUMN public.membership_plans.chat_retention_days IS '종료된 채팅 세션 원문 보존일. 무료(구독 없음)는 코드 상수 30일.';

UPDATE public.membership_plans SET chat_retention_days = CASE tier
  WHEN 'SINGLE' THEN 90
  WHEN 'FAMILY' THEN 180
  WHEN 'BUSINESS' THEN 365
  ELSE 90 END;

-- ============================================================
-- 2. chat_sessions.purged_at — 원문 정리 완료 마커 (재스캔 방지 + 과거 세션 UI 표기용)
-- ============================================================
ALTER TABLE public.chat_sessions
  ADD COLUMN IF NOT EXISTS purged_at timestamptz;
COMMENT ON COLUMN public.chat_sessions.purged_at IS '원문 메시지 정리 시각. 세션 행·summary 는 유지(신의 기억).';

CREATE INDEX IF NOT EXISTS idx_chat_sessions_retention
  ON public.chat_sessions(ended_at)
  WHERE ended_at IS NOT NULL AND purged_at IS NULL;

-- ============================================================
-- 3. purge_expired_chat_messages — 일일 cron 이 호출하는 원자 정리 RPC (service_role 전용)
--    유저별 보존일 = 활성 구독 플랜의 chat_retention_days (복수 구독 시 최대값), 없으면 p_free_days.
-- ============================================================
CREATE OR REPLACE FUNCTION public.purge_expired_chat_messages(p_free_days integer DEFAULT 30)
 RETURNS TABLE(purged_sessions integer, purged_messages integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  IF p_free_days < 1 THEN
    RAISE EXCEPTION 'INVALID_FREE_DAYS: must be >= 1, got %', p_free_days;
  END IF;

  RETURN QUERY
  WITH retention AS (
    SELECT s.user_id, MAX(mp.chat_retention_days) AS days
    FROM public.subscriptions s
    JOIN public.membership_plans mp ON mp.id = s.plan_id
    WHERE s.status = 'ACTIVE'
    GROUP BY s.user_id
  ),
  expired AS (
    SELECT cs.id
    FROM public.chat_sessions cs
    LEFT JOIN retention r ON r.user_id = cs.user_id
    WHERE cs.ended_at IS NOT NULL
      AND cs.purged_at IS NULL
      AND cs.ended_at < now() - make_interval(days => COALESCE(r.days, p_free_days))
  ),
  del AS (
    DELETE FROM public.chat_messages cm
    USING expired e
    WHERE cm.session_id = e.id
    RETURNING cm.id
  ),
  upd AS (
    UPDATE public.chat_sessions cs
    SET purged_at = now()
    FROM expired e
    WHERE cs.id = e.id
    RETURNING cs.id
  )
  SELECT (SELECT count(*)::integer FROM upd), (SELECT count(*)::integer FROM del);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.purge_expired_chat_messages(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_chat_messages(integer) TO service_role;
