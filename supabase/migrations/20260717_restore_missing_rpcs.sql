-- 7/4 DB 재구축 때 소실된 RPC 7종 복원 (코드 호출 vs pg_proc 전수 대조로 발견 — 로드맵 P0-3)
-- 원본: payment/20260214_bokchae_system.sql, payment/20260302_referral_system.sql,
--       fortune/20260207_fortune_journal.sql, analysis/20260204_analysis_history.sql
-- S1 보안 원칙 반영: 재화 발행은 service_role 전용, user_id 파라미터 조회는 본인-또는-admin 가드.
-- (get_user_destiny_targets 는 구 뷰 스키마 의존 + test-destiny 페이지 전용이라 복원하지 않음)

-- ============================================================
-- 1. add_bokchae — 복채 지급 (출석·룰렛·데일리체크). 재화 발행 → service_role 전용.
-- ============================================================
CREATE OR REPLACE FUNCTION public.add_bokchae(
  p_user_id UUID,
  p_amount INT,
  p_reason TEXT DEFAULT '복채 지급'
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT: must be positive, got %', p_amount;
  END IF;

  INSERT INTO public.wallets (user_id, balance)
  VALUES (p_user_id, p_amount)
  ON CONFLICT (user_id) DO UPDATE
    SET balance = wallets.balance + p_amount, updated_at = now();

  INSERT INTO public.wallet_transactions (user_id, amount, type, description)
  VALUES (p_user_id, p_amount, 'BONUS', p_reason);

  RETURN true;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.add_bokchae(UUID, INT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_bokchae(UUID, INT, TEXT) TO service_role;

-- ============================================================
-- 2. 추천 시스템 2종 — 본인 가드 후 authenticated 허용
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_or_create_referral_code(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_attempt int := 0;
BEGIN
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN: can only access own referral code';
  END IF;

  SELECT code INTO v_code FROM public.referral_codes WHERE user_id = p_user_id;
  IF v_code IS NOT NULL THEN
    RETURN v_code;
  END IF;

  LOOP
    v_code := upper(substring(md5(p_user_id::text || now()::text || v_attempt::text) FROM 1 FOR 8));
    BEGIN
      INSERT INTO public.referral_codes (user_id, code) VALUES (p_user_id, v_code);
      RETURN v_code;
    EXCEPTION WHEN unique_violation THEN
      v_attempt := v_attempt + 1;
      IF v_attempt > 10 THEN
        RAISE EXCEPTION 'Failed to generate unique referral code after 10 attempts';
      END IF;
    END;
  END LOOP;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_or_create_referral_code(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_referral_code(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.process_referral_bonus(
  p_referee_id uuid,
  p_code       text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id  uuid;
  v_bonus        integer := 5; -- 5만냥
BEGIN
  -- 재화 발행 함수 — 피추천인 본인만 자기 몫을 트리거 가능 (service_role 은 무제한)
  IF auth.uid() IS NOT NULL AND p_referee_id IS DISTINCT FROM auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN: can only claim own referral bonus';
  END IF;

  IF EXISTS (SELECT 1 FROM public.referral_uses WHERE referee_id = p_referee_id) THEN
    RETURN jsonb_build_object('success', false, 'error', '이미 추천 혜택을 받으셨습니다.');
  END IF;

  SELECT user_id INTO v_referrer_id FROM public.referral_codes WHERE code = upper(p_code);
  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', '유효하지 않은 추천 코드입니다.');
  END IF;
  IF v_referrer_id = p_referee_id THEN
    RETURN jsonb_build_object('success', false, 'error', '본인 추천은 불가합니다.');
  END IF;

  INSERT INTO public.referral_uses (referrer_id, referee_id, code, bonus_amount)
  VALUES (v_referrer_id, p_referee_id, upper(p_code), v_bonus);

  INSERT INTO public.wallets (user_id, balance) VALUES (p_referee_id, v_bonus)
  ON CONFLICT (user_id) DO UPDATE SET balance = wallets.balance + v_bonus, updated_at = now();
  INSERT INTO public.wallet_transactions (user_id, amount, type, feature_key, description)
  VALUES (p_referee_id, v_bonus, 'BONUS', 'REFERRAL_BONUS', '추천인 가입 보너스 ' || v_bonus || '만냥');

  INSERT INTO public.wallets (user_id, balance) VALUES (v_referrer_id, v_bonus)
  ON CONFLICT (user_id) DO UPDATE SET balance = wallets.balance + v_bonus, updated_at = now();
  INSERT INTO public.wallet_transactions (user_id, amount, type, feature_key, description)
  VALUES (v_referrer_id, v_bonus, 'BONUS', 'REFERRAL_REWARD', '친구 추천 보상 ' || v_bonus || '만냥');

  RETURN jsonb_build_object('success', true, 'referrerId', v_referrer_id, 'bonus', v_bonus);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.process_referral_bonus(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_referral_bonus(uuid, text) TO authenticated, service_role;

-- ============================================================
-- 3. 운세 저널 집계 3종 — 본인 데이터 가드 후 authenticated 허용
-- ============================================================
CREATE OR REPLACE FUNCTION public.calculate_monthly_fortune(
  member_id_param uuid,
  year_param integer,
  month_param integer
)
RETURNS TABLE (total_possible integer, current_fortune integer, percentage numeric, completed_categories text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() AND NOT EXISTS (
    SELECT 1 FROM public.family_members fm WHERE fm.id = member_id_param AND fm.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN: not your family member';
  END IF;

  RETURN QUERY
  SELECT
    800 as total_possible,
    COALESCE(SUM(fj.fortune_points), 0)::integer as current_fortune,
    ROUND(COALESCE(SUM(fj.fortune_points), 0)::numeric / 800 * 100, 1) as percentage,
    ARRAY_AGG(fj.category) FILTER (WHERE fj.category IS NOT NULL) as completed_categories
  FROM public.fortune_journal fj
  WHERE fj.family_member_id = member_id_param
    AND fj.year = year_param
    AND fj.month = month_param;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.calculate_monthly_fortune(uuid, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.calculate_monthly_fortune(uuid, integer, integer) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.calculate_yearly_fortune(
  user_id_param uuid,
  year_param integer
)
RETURNS TABLE (month integer, fortune integer, member_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND user_id_param IS DISTINCT FROM auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN: can only access own fortune data';
  END IF;

  RETURN QUERY
  SELECT fj.month, SUM(fj.fortune_points)::integer as fortune,
    COUNT(DISTINCT fj.family_member_id)::integer as member_count
  FROM public.fortune_journal fj
  WHERE fj.user_id = user_id_param AND fj.year = year_param
  GROUP BY fj.month ORDER BY fj.month;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.calculate_yearly_fortune(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.calculate_yearly_fortune(uuid, integer) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.calculate_family_fortune(
  user_id_param uuid,
  year_param integer,
  month_param integer
)
RETURNS TABLE (member_id uuid, member_name text, relationship text, fortune integer, missions_completed integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND user_id_param IS DISTINCT FROM auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN: can only access own fortune data';
  END IF;

  RETURN QUERY
  SELECT fm.id, fm.name, fm.relationship,
    COALESCE(SUM(fj.fortune_points), 0)::integer as fortune,
    COUNT(DISTINCT fj.category)::integer as missions_completed
  FROM public.family_members fm
  LEFT JOIN public.fortune_journal fj
    ON fm.id = fj.family_member_id AND fj.year = year_param AND fj.month = month_param
  WHERE fm.user_id = user_id_param
  GROUP BY fm.id, fm.name, fm.relationship
  ORDER BY fortune DESC;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.calculate_family_fortune(uuid, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.calculate_family_fortune(uuid, integer, integer) TO authenticated, service_role;

-- ============================================================
-- 4. get_analysis_stats — 분석 기록 통계 (본인 가드)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_analysis_stats(user_id_param uuid)
RETURNS TABLE (category text, count bigint, total_cost integer, last_analyzed timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND user_id_param IS DISTINCT FROM auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN: can only access own stats';
  END IF;

  RETURN QUERY
  SELECT ah.category, COUNT(*) as count, SUM(ah.talisman_cost)::integer as total_cost, MAX(ah.created_at) as last_analyzed
  FROM public.analysis_history ah
  WHERE ah.user_id = user_id_param
  GROUP BY ah.category ORDER BY count DESC;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_analysis_stats(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_analysis_stats(uuid) TO authenticated, service_role;
