-- 배치 아이템 = 기능 해금 시스템 1호: 기억의 함 (P2)
-- 근거: TEAM_G_DESIGN/prd/PLAN-family-shrine-chat-v1.md §2·§3
-- 원칙: 효과는 카탈로그 JSONB(unlock_effect)로 선언, 서버(RPC)가 배치 여부를 검증.

-- ============================================================
-- 1. shrine_item_catalog.unlock_effect — 배치 시 발동하는 기능 해금 선언
--    예: {"type":"chat_retention","days":90,"max_stack":2}
-- ============================================================
ALTER TABLE public.shrine_item_catalog
  ADD COLUMN IF NOT EXISTS unlock_effect jsonb;
COMMENT ON COLUMN public.shrine_item_catalog.unlock_effect IS '배치 효험 선언 JSONB. type=chat_retention: 배치 1개당 days일 보존 연장, 최대 max_stack개.';

-- ============================================================
-- 2. 기억의 함 아이템 (3복채, 제단 배치, 배치 1개당 채팅 보존 +90일, 최대 2개)
-- ============================================================
INSERT INTO public.shrine_item_catalog
  (name, description, type, rarity, price_bok_points, price_krw, price_bokchae, emoji,
   element, energy_power, placement_layer, size_grade, behavior, unlock_effect, sort_order)
SELECT
  '기억의 함', '신당에 모셔두면 신이 지난 문답을 더 오래 기억합니다. 배치 1개당 대화 보존 +90일 (최대 2개).',
  'statue', 'rare', 0, 0, 3, '🗃️',
  NULL, 0, 'altar', 'md', '{"tap":"smoke","sound":"chime"}'::jsonb,
  '{"type":"chat_retention","days":90,"max_stack":2}'::jsonb, 40
WHERE NOT EXISTS (SELECT 1 FROM public.shrine_item_catalog WHERE name = '기억의 함');

-- ============================================================
-- 3. purge_expired_chat_messages — 기억함 배치 보너스 반영
--    유저 보존일 = (구독 플랜 days | 무료 p_free_days) + 기억함 배치 보너스(LEAST(배치수, max_stack) × days)
--    배치는 본인 소유 신당(가족 신당 포함) 전체에서 집계.
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
  expired AS (
    SELECT cs.id
    FROM public.chat_sessions cs
    LEFT JOIN retention r ON r.user_id = cs.user_id
    LEFT JOIN chest_bonus cb ON cb.user_id = cs.user_id
    WHERE cs.ended_at IS NOT NULL
      AND cs.purged_at IS NULL
      AND cs.ended_at < now() - make_interval(days => COALESCE(r.days, p_free_days) + COALESCE(cb.bonus_days, 0))
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
