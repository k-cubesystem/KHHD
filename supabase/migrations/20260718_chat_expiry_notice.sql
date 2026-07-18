-- 채팅 보존 만료 D-7 예고 (P1-7) — 「곧 문답이 연기로 흩어집니다」 → 기억의 함 업셀
-- 근거: TEAM_G_DESIGN/prd/PLAN-improvement-roadmap-v1.md P1-7
-- 보존일 산식은 purge_expired_chat_messages 와 동일(구독 플랜 + 기억함 배치 보너스).

ALTER TABLE public.chat_sessions
  ADD COLUMN IF NOT EXISTS expiry_notified_at timestamptz;
COMMENT ON COLUMN public.chat_sessions.expiry_notified_at IS '만료 예고 알림 발송 시각(중복 발송 방지).';

CREATE INDEX IF NOT EXISTS idx_chat_sessions_expiry_notice
  ON public.chat_sessions(ended_at)
  WHERE ended_at IS NOT NULL AND purged_at IS NULL AND expiry_notified_at IS NULL;

-- ============================================================
-- notify_expiring_chat_sessions — 만료 D-N 세션을 찾아 유저별 알림 1건 생성
-- 반환: 알림 받은 유저 수, 예고된 세션 수
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_expiring_chat_sessions(
  p_free_days integer DEFAULT 30,
  p_lead_days integer DEFAULT 7
)
 RETURNS TABLE(notified_users integer, notified_sessions integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  IF p_free_days < 1 OR p_lead_days < 1 THEN
    RAISE EXCEPTION 'INVALID_DAYS: free=%, lead=%', p_free_days, p_lead_days;
  END IF;

  RETURN QUERY
  WITH retention AS (
    SELECT s.user_id, MAX(mp.chat_retention_days) AS days
    FROM public.subscriptions s
    JOIN public.membership_plans mp ON mp.id = s.plan_id
    WHERE s.status = 'ACTIVE'
    GROUP BY s.user_id
  ),
  chest_bonus AS (
    SELECT sh.user_id,
           LEAST(count(*)::int, COALESCE(MAX((c.unlock_effect->>'max_stack')::int), 2))
             * COALESCE(MAX((c.unlock_effect->>'days')::int), 90) AS bonus_days
    FROM public.shrine_placements sp
    JOIN public.shrines sh ON sh.id = sp.shrine_id
    JOIN public.shrine_item_catalog c ON c.id = sp.catalog_item_id
    WHERE c.unlock_effect->>'type' = 'chat_retention'
    GROUP BY sh.user_id
  ),
  expiring AS (
    SELECT cs.id, cs.user_id,
           cs.ended_at + make_interval(days => COALESCE(r.days, p_free_days) + COALESCE(cb.bonus_days, 0)) AS expires_at
    FROM public.chat_sessions cs
    LEFT JOIN retention r ON r.user_id = cs.user_id
    LEFT JOIN chest_bonus cb ON cb.user_id = cs.user_id
    WHERE cs.ended_at IS NOT NULL
      AND cs.purged_at IS NULL
      AND cs.expiry_notified_at IS NULL
  ),
  due AS (
    SELECT * FROM expiring
    WHERE expires_at > now() AND expires_at <= now() + make_interval(days => p_lead_days)
  ),
  per_user AS (
    SELECT user_id, count(*)::int AS cnt, min(expires_at) AS first_expiry
    FROM due GROUP BY user_id
  ),
  ins AS (
    INSERT INTO public.notifications (user_id, title, message, type, is_read)
    SELECT
      pu.user_id,
      '오래된 문답이 곧 흩어집니다',
      '보존 기한이 ' || GREATEST(1, EXTRACT(day FROM pu.first_expiry - now())::int) || '일 남은 지난 대화가 '
        || pu.cnt || '건 있습니다. 신당에 「기억의 함」을 모시면 그 문답을 90일 더 간직할 수 있습니다. '
        || '(요지는 지워져도 신이 기억하니 염려 마십시오.)',
      'chat_expiry_notice',
      false
    FROM per_user pu
    RETURNING user_id
  ),
  upd AS (
    UPDATE public.chat_sessions cs
    SET expiry_notified_at = now()
    FROM due d WHERE cs.id = d.id
    RETURNING cs.id
  )
  SELECT (SELECT count(*)::integer FROM ins), (SELECT count(*)::integer FROM upd);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.notify_expiring_chat_sessions(integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_expiring_chat_sessions(integer, integer) TO service_role;
