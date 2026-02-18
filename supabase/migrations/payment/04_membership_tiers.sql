-- ============================================
-- 04. 멤버십 등급 시스템 (3-Tier System)
-- ============================================

-- ==========================================
-- 1. Membership Plans 테이블
-- ==========================================
CREATE TABLE IF NOT EXISTS public.membership_plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    description text,
    tier text NOT NULL CHECK (tier IN ('SINGLE', 'FAMILY', 'BUSINESS')),
    price integer NOT NULL,
    interval text DEFAULT 'MONTH' CHECK (interval IN ('MONTH', 'YEAR')),
    talismans_per_period integer NOT NULL DEFAULT 10,
    daily_talisman_limit integer DEFAULT 10,
    relationship_limit integer DEFAULT 3,
    storage_limit integer DEFAULT 10,
    features jsonb DEFAULT '{}',
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_membership_plans_tier ON public.membership_plans(tier);
CREATE INDEX IF NOT EXISTS idx_membership_plans_active ON public.membership_plans(is_active);

-- RLS
ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active plans" ON public.membership_plans;
CREATE POLICY "Anyone can view active plans"
ON public.membership_plans FOR SELECT
USING (is_active = true OR is_admin());

DROP POLICY IF EXISTS "Admins can manage plans" ON public.membership_plans;
CREATE POLICY "Admins can manage plans"
ON public.membership_plans FOR ALL
USING (is_admin());

-- ==========================================
-- 2. 3단계 멤버십 플랜 초기 데이터
-- ==========================================

-- 싱글 멤버십
INSERT INTO public.membership_plans (
    name, tier, price, description,
    talismans_per_period, daily_talisman_limit,
    relationship_limit, storage_limit,
    features, sort_order
) VALUES (
    '싱글 멤버십', 'SINGLE', 9900, '나를 위한 데일리 운세 루틴',
    10, 10, 3, 10,
    '{
        "daily_fortune": true,
        "pdf_archive": true,
        "kakao_daily": true,
        "ai_shaman": true,
        "bonus_rate": 10
    }'::jsonb,
    1
) ON CONFLICT (name) DO UPDATE SET
    tier = EXCLUDED.tier,
    price = EXCLUDED.price,
    description = EXCLUDED.description,
    talismans_per_period = EXCLUDED.talismans_per_period,
    daily_talisman_limit = EXCLUDED.daily_talisman_limit,
    relationship_limit = EXCLUDED.relationship_limit,
    storage_limit = EXCLUDED.storage_limit,
    features = EXCLUDED.features,
    sort_order = EXCLUDED.sort_order;

-- 패밀리 멤버십
INSERT INTO public.membership_plans (
    name, tier, price, description,
    talismans_per_period, daily_talisman_limit,
    relationship_limit, storage_limit,
    features, sort_order
) VALUES (
    '패밀리 멤버십', 'FAMILY', 29900, '우리 가족 모두를 위한 프리미엄 혜택',
    30, 30, 10, 50,
    '{
        "daily_fortune": true,
        "pdf_archive": true,
        "kakao_daily": true,
        "ai_shaman": true,
        "family_compatibility": true,
        "network_visualization": true,
        "bonus_rate": 15
    }'::jsonb,
    2
) ON CONFLICT (name) DO UPDATE SET
    tier = EXCLUDED.tier,
    price = EXCLUDED.price,
    description = EXCLUDED.description,
    talismans_per_period = EXCLUDED.talismans_per_period,
    daily_talisman_limit = EXCLUDED.daily_talisman_limit,
    relationship_limit = EXCLUDED.relationship_limit,
    storage_limit = EXCLUDED.storage_limit,
    features = EXCLUDED.features,
    sort_order = EXCLUDED.sort_order;

-- 비즈니스 멤버십
INSERT INTO public.membership_plans (
    name, tier, price, description,
    talismans_per_period, daily_talisman_limit,
    relationship_limit, storage_limit,
    features, sort_order
) VALUES (
    '비즈니스 멤버십', 'BUSINESS', 99000, '전문가를 위한 무제한 분석 솔루션',
    100, 100, 50, 999,
    '{
        "daily_fortune": true,
        "pdf_archive": true,
        "kakao_daily": true,
        "ai_shaman": true,
        "family_compatibility": true,
        "network_visualization": true,
        "api_access": true,
        "priority_support": true,
        "custom_reports": true,
        "bonus_rate": 20
    }'::jsonb,
    3
) ON CONFLICT (name) DO UPDATE SET
    tier = EXCLUDED.tier,
    price = EXCLUDED.price,
    description = EXCLUDED.description,
    talismans_per_period = EXCLUDED.talismans_per_period,
    daily_talisman_limit = EXCLUDED.daily_talisman_limit,
    relationship_limit = EXCLUDED.relationship_limit,
    storage_limit = EXCLUDED.storage_limit,
    features = EXCLUDED.features,
    sort_order = EXCLUDED.sort_order;

-- ==========================================
-- 3. Daily Usage Logs 테이블
-- ==========================================
CREATE TABLE IF NOT EXISTS public.daily_usage_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    usage_date date NOT NULL DEFAULT CURRENT_DATE,
    talismans_used integer DEFAULT 0,
    features_used jsonb DEFAULT '{}',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT unique_user_date UNIQUE (user_id, usage_date)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_daily_usage_user_date ON public.daily_usage_logs(user_id, usage_date);
CREATE INDEX IF NOT EXISTS idx_daily_usage_date ON public.daily_usage_logs(usage_date);

-- RLS
ALTER TABLE public.daily_usage_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own logs" ON public.daily_usage_logs;
CREATE POLICY "Users can view own logs"
ON public.daily_usage_logs
FOR SELECT USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "Users can insert own logs" ON public.daily_usage_logs;
CREATE POLICY "Users can insert own logs"
ON public.daily_usage_logs
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own logs" ON public.daily_usage_logs;
CREATE POLICY "Users can update own logs"
ON public.daily_usage_logs
FOR UPDATE USING (auth.uid() = user_id);

-- 트리거
DROP TRIGGER IF EXISTS update_daily_usage_logs_updated_at ON public.daily_usage_logs;
CREATE TRIGGER update_daily_usage_logs_updated_at
  BEFORE UPDATE ON public.daily_usage_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 4. 헬퍼 함수들
-- ==========================================

-- 사용자 등급 조회
CREATE OR REPLACE FUNCTION get_user_tier(p_user_id uuid)
RETURNS TABLE (
    tier text,
    daily_talisman_limit integer,
    relationship_limit integer,
    storage_limit integer,
    talismans_per_period integer
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        mp.tier,
        mp.daily_talisman_limit,
        mp.relationship_limit,
        mp.storage_limit,
        mp.talismans_per_period
    FROM public.subscriptions s
    JOIN public.membership_plans mp ON s.plan_id = mp.id
    WHERE s.user_id = p_user_id
        AND s.status = 'ACTIVE'
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 일일 부적 한도 체크
CREATE OR REPLACE FUNCTION check_daily_talisman_limit(p_user_id uuid)
RETURNS boolean AS $$
DECLARE
    v_limit integer;
    v_used integer;
BEGIN
    SELECT daily_talisman_limit INTO v_limit
    FROM get_user_tier(p_user_id);

    IF v_limit IS NULL THEN
        RETURN false;
    END IF;

    SELECT COALESCE(talismans_used, 0) INTO v_used
    FROM public.daily_usage_logs
    WHERE user_id = p_user_id AND usage_date = CURRENT_DATE;

    RETURN (v_used < v_limit);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 일일 사용량 증가
CREATE OR REPLACE FUNCTION increment_daily_talisman_usage(p_user_id uuid, p_amount integer DEFAULT 1)
RETURNS boolean AS $$
BEGIN
    INSERT INTO public.daily_usage_logs (user_id, usage_date, talismans_used)
    VALUES (p_user_id, CURRENT_DATE, p_amount)
    ON CONFLICT (user_id, usage_date)
    DO UPDATE SET
        talismans_used = daily_usage_logs.talismans_used + p_amount,
        updated_at = now();
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 인연 한도 체크
CREATE OR REPLACE FUNCTION check_relationship_limit(p_user_id uuid)
RETURNS boolean AS $$
DECLARE
    v_limit integer;
    v_count integer;
BEGIN
    SELECT relationship_limit INTO v_limit
    FROM get_user_tier(p_user_id);

    IF v_limit IS NULL THEN
        v_limit := 3;
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM public.family_members
    WHERE user_id = p_user_id;

    RETURN (v_count < v_limit);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 30일 지난 로그 자동 정리
CREATE OR REPLACE FUNCTION cleanup_old_usage_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM public.daily_usage_logs
    WHERE usage_date < CURRENT_DATE - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 5. 등급별 통계 뷰
-- ==========================================
CREATE OR REPLACE VIEW public.tier_stats AS
SELECT
    mp.tier,
    mp.name as plan_name,
    COUNT(s.id) FILTER (WHERE s.status = 'ACTIVE') as active_subscribers,
    COUNT(s.id) as total_subscribers,
    SUM(CASE WHEN s.status = 'ACTIVE' THEN mp.price ELSE 0 END) as monthly_revenue
FROM public.membership_plans mp
LEFT JOIN public.subscriptions s ON s.plan_id = mp.id
GROUP BY mp.tier, mp.name, mp.sort_order
ORDER BY mp.sort_order;

-- 트리거
DROP TRIGGER IF EXISTS update_membership_plans_updated_at ON public.membership_plans;
CREATE TRIGGER update_membership_plans_updated_at
  BEFORE UPDATE ON public.membership_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
