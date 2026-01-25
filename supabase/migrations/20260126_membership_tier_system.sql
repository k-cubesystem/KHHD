-- Phase 25: Membership Tier System (3-Tier Upgrade)
-- Date: 2026-01-26
-- Description: 멤버십 3단계 등급제 (Single/Family/Business) 확장

-- ============================================
-- 1. membership_plans 테이블 확장
-- ============================================

-- 새 컬럼 추가
ALTER TABLE public.membership_plans
ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'SINGLE' CHECK (tier IN ('SINGLE', 'FAMILY', 'BUSINESS')),
ADD COLUMN IF NOT EXISTS daily_talisman_limit INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS relationship_limit INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS storage_limit INTEGER DEFAULT 10;

-- 기존 데이터 업데이트 (기존 '해화 멤버십'을 SINGLE 등급으로)
UPDATE public.membership_plans
SET
    tier = 'SINGLE',
    daily_talisman_limit = 10,
    relationship_limit = 3,
    storage_limit = 10
WHERE name = '해화 멤버십';

-- ============================================
-- 2. 3단계 멤버십 플랜 데이터 생성
-- ============================================

-- 기존 데이터 삭제 (재생성)
DELETE FROM public.membership_plans;

-- 1. Single (싱글) - 기본 멤버십
INSERT INTO public.membership_plans (
    name,
    description,
    tier,
    price,
    interval,
    talismans_per_period,
    daily_talisman_limit,
    relationship_limit,
    storage_limit,
    features,
    is_active,
    sort_order
) VALUES (
    '싱글 플랜',
    '혼자서도 충분한 운세 멤버십',
    'SINGLE',
    9900,
    'MONTH',
    10,
    10,
    3,
    10,
    '{
        "daily_fortune": true,
        "pdf_archive": true,
        "kakao_daily": true,
        "ai_shaman": true,
        "bonus_rate": 10
    }'::jsonb,
    true,
    1
);

-- 2. Family (패밀리) - 인기 플랜
INSERT INTO public.membership_plans (
    name,
    description,
    tier,
    price,
    interval,
    talismans_per_period,
    daily_talisman_limit,
    relationship_limit,
    storage_limit,
    features,
    is_active,
    sort_order
) VALUES (
    '패밀리 플랜',
    '가족과 함께하는 프리미엄 멤버십',
    'FAMILY',
    29900,
    'MONTH',
    30,
    30,
    10,
    50,
    '{
        "daily_fortune": true,
        "pdf_archive": true,
        "kakao_daily": true,
        "ai_shaman": true,
        "family_compatibility": true,
        "network_visualization": true,
        "bonus_rate": 15
    }'::jsonb,
    true,
    2
);

-- 3. Business (비즈니스) - 프로페셔널 플랜
INSERT INTO public.membership_plans (
    name,
    description,
    tier,
    price,
    interval,
    talismans_per_period,
    daily_talisman_limit,
    relationship_limit,
    storage_limit,
    features,
    is_active,
    sort_order
) VALUES (
    '비즈니스 플랜',
    '프로페셔널을 위한 최고급 멤버십',
    'BUSINESS',
    99000,
    'MONTH',
    100,
    100,
    50,
    999,
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
    true,
    3
);

-- ============================================
-- 3. daily_usage_logs 테이블 생성 (일일 사용량 추적)
-- ============================================
CREATE TABLE IF NOT EXISTS public.daily_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
    talismans_used INTEGER DEFAULT 0,
    features_used JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_user_date UNIQUE (user_id, usage_date)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_daily_usage_user_date ON public.daily_usage_logs(user_id, usage_date);
CREATE INDEX IF NOT EXISTS idx_daily_usage_date ON public.daily_usage_logs(usage_date);

-- RLS 정책
ALTER TABLE public.daily_usage_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "daily_usage_select_own" ON public.daily_usage_logs;
CREATE POLICY "daily_usage_select_own" ON public.daily_usage_logs
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "daily_usage_insert_own" ON public.daily_usage_logs;
CREATE POLICY "daily_usage_insert_own" ON public.daily_usage_logs
    FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "daily_usage_update_own" ON public.daily_usage_logs;
CREATE POLICY "daily_usage_update_own" ON public.daily_usage_logs
    FOR UPDATE USING (user_id = auth.uid());

-- updated_at 트리거
DROP TRIGGER IF EXISTS update_daily_usage_logs_updated_at ON public.daily_usage_logs;
CREATE TRIGGER update_daily_usage_logs_updated_at
    BEFORE UPDATE ON public.daily_usage_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. 헬퍼 함수: 사용자 등급 조회
-- ============================================
CREATE OR REPLACE FUNCTION get_user_tier(p_user_id UUID)
RETURNS TABLE (
    tier TEXT,
    daily_talisman_limit INTEGER,
    relationship_limit INTEGER,
    storage_limit INTEGER,
    talismans_per_period INTEGER
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

-- ============================================
-- 5. 헬퍼 함수: 일일 사용량 체크
-- ============================================
CREATE OR REPLACE FUNCTION check_daily_talisman_limit(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_limit INTEGER;
    v_used INTEGER;
BEGIN
    -- 사용자의 일일 부적 한도 조회
    SELECT daily_talisman_limit INTO v_limit
    FROM get_user_tier(p_user_id);

    -- 구독이 없으면 false 반환
    IF v_limit IS NULL THEN
        RETURN FALSE;
    END IF;

    -- 오늘 사용량 조회
    SELECT COALESCE(talismans_used, 0) INTO v_used
    FROM public.daily_usage_logs
    WHERE user_id = p_user_id
        AND usage_date = CURRENT_DATE;

    -- 한도 체크
    RETURN (v_used < v_limit);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. 헬퍼 함수: 일일 사용량 증가
-- ============================================
CREATE OR REPLACE FUNCTION increment_daily_talisman_usage(p_user_id UUID, p_amount INTEGER DEFAULT 1)
RETURNS BOOLEAN AS $$
BEGIN
    -- daily_usage_logs에 UPSERT
    INSERT INTO public.daily_usage_logs (user_id, usage_date, talismans_used)
    VALUES (p_user_id, CURRENT_DATE, p_amount)
    ON CONFLICT (user_id, usage_date)
    DO UPDATE SET
        talismans_used = daily_usage_logs.talismans_used + p_amount,
        updated_at = NOW();

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. 헬퍼 함수: 인연 한도 체크
-- ============================================
CREATE OR REPLACE FUNCTION check_relationship_limit(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_limit INTEGER;
    v_count INTEGER;
BEGIN
    -- 사용자의 인연 한도 조회
    SELECT relationship_limit INTO v_limit
    FROM get_user_tier(p_user_id);

    -- 구독이 없으면 기본 한도 3명
    IF v_limit IS NULL THEN
        v_limit := 3;
    END IF;

    -- 현재 등록된 인연 수 조회
    SELECT COUNT(*) INTO v_count
    FROM public.family_members
    WHERE user_id = p_user_id;

    -- 한도 체크
    RETURN (v_count < v_limit);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. 뷰: 등급별 통계
-- ============================================
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

-- ============================================
-- 9. 자동 정리: 30일 지난 일일 사용량 로그 삭제
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_old_usage_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM public.daily_usage_logs
    WHERE usage_date < CURRENT_DATE - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 완료 메시지
-- ============================================
DO $$
BEGIN
    RAISE NOTICE 'Phase 25: Membership Tier System Migration completed successfully!';
    RAISE NOTICE '  - 3 tiers added: SINGLE, FAMILY, BUSINESS';
    RAISE NOTICE '  - Daily usage tracking enabled';
    RAISE NOTICE '  - Limit check functions created';
END $$;
