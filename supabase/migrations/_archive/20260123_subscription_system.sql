-- Phase 13: Subscription System Migration
-- Date: 2026-01-23
-- Description: 멤버십 구독 시스템 테이블 및 정책 생성

-- ============================================
-- 1. membership_plans 테이블 (멤버십 상품)
-- ============================================
CREATE TABLE IF NOT EXISTS public.membership_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL,
    interval TEXT DEFAULT 'MONTH' CHECK (interval IN ('MONTH', 'YEAR')),
    talismans_per_period INTEGER NOT NULL DEFAULT 10,
    features JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 초기 멤버십 상품 데이터
INSERT INTO public.membership_plans (name, description, price, interval, talismans_per_period, features, sort_order)
VALUES (
    '해화 멤버십',
    '매월 부적 10장 + 오늘의 운세 무제한',
    9900,
    'MONTH',
    10,
    '{
        "daily_fortune": true,
        "pdf_archive": true,
        "kakao_daily": true,
        "bonus_rate": 10
    }'::jsonb,
    1
) ON CONFLICT DO NOTHING;

-- ============================================
-- 2. subscriptions 테이블 (구독 정보)
-- ============================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.membership_plans(id),
    billing_key TEXT,
    customer_key TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED', 'PAYMENT_FAILED')),
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    next_billing_date TIMESTAMP WITH TIME ZONE,
    last_payment_date TIMESTAMP WITH TIME ZONE,
    retry_count INTEGER DEFAULT 0,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancel_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_user_subscription UNIQUE (user_id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing ON public.subscriptions(next_billing_date);
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_key ON public.subscriptions(customer_key);

-- ============================================
-- 3. subscription_payments 테이블 (구독 결제 내역)
-- ============================================
CREATE TABLE IF NOT EXISTS public.subscription_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    payment_key TEXT,
    order_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED')),
    failure_code TEXT,
    failure_reason TEXT,
    billing_period_start TIMESTAMP WITH TIME ZONE,
    billing_period_end TIMESTAMP WITH TIME ZONE,
    talismans_granted INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_sub_payments_subscription ON public.subscription_payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_sub_payments_user ON public.subscription_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_sub_payments_order ON public.subscription_payments(order_id);

-- ============================================
-- 4. wallets 테이블 업데이트 트리거
-- ============================================
-- 구독 상태 변경 시 wallets 테이블 동기화
CREATE OR REPLACE FUNCTION sync_wallet_subscription_status()
RETURNS TRIGGER AS $$
BEGIN
    -- 구독 활성화 시
    IF NEW.status = 'ACTIVE' AND (OLD.status IS NULL OR OLD.status != 'ACTIVE') THEN
        UPDATE public.wallets
        SET
            is_subscribed = TRUE,
            subscription_end_date = NEW.current_period_end,
            updated_at = NOW()
        WHERE user_id = NEW.user_id;
    -- 구독 비활성화 시
    ELSIF NEW.status IN ('CANCELLED', 'EXPIRED', 'PAYMENT_FAILED') AND OLD.status = 'ACTIVE' THEN
        UPDATE public.wallets
        SET
            is_subscribed = FALSE,
            updated_at = NOW()
        WHERE user_id = NEW.user_id;
    -- 기간 연장 시
    ELSIF NEW.status = 'ACTIVE' AND NEW.current_period_end != OLD.current_period_end THEN
        UPDATE public.wallets
        SET
            subscription_end_date = NEW.current_period_end,
            updated_at = NOW()
        WHERE user_id = NEW.user_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 생성
DROP TRIGGER IF EXISTS on_subscription_status_change ON public.subscriptions;
CREATE TRIGGER on_subscription_status_change
    AFTER INSERT OR UPDATE OF status, current_period_end ON public.subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION sync_wallet_subscription_status();

-- ============================================
-- 5. updated_at 자동 업데이트 트리거
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- membership_plans
DROP TRIGGER IF EXISTS update_membership_plans_updated_at ON public.membership_plans;
CREATE TRIGGER update_membership_plans_updated_at
    BEFORE UPDATE ON public.membership_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- subscriptions
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. RLS (Row Level Security) 정책
-- ============================================

-- membership_plans: 모두 읽기 가능, Admin만 수정
ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "membership_plans_select_all" ON public.membership_plans;
CREATE POLICY "membership_plans_select_all" ON public.membership_plans
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "membership_plans_admin_all" ON public.membership_plans;
CREATE POLICY "membership_plans_admin_all" ON public.membership_plans
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- subscriptions: 본인만 조회, Admin은 전체
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscriptions_select_own" ON public.subscriptions;
CREATE POLICY "subscriptions_select_own" ON public.subscriptions
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "subscriptions_insert_own" ON public.subscriptions;
CREATE POLICY "subscriptions_insert_own" ON public.subscriptions
    FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "subscriptions_update_own" ON public.subscriptions;
CREATE POLICY "subscriptions_update_own" ON public.subscriptions
    FOR UPDATE USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- subscription_payments: 본인만 조회, Admin은 전체
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sub_payments_select_own" ON public.subscription_payments;
CREATE POLICY "sub_payments_select_own" ON public.subscription_payments
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "sub_payments_insert_system" ON public.subscription_payments;
CREATE POLICY "sub_payments_insert_system" ON public.subscription_payments
    FOR INSERT WITH CHECK (true);

-- ============================================
-- 7. 헬퍼 함수: 구독 만료 체크
-- ============================================
CREATE OR REPLACE FUNCTION check_subscription_expiry()
RETURNS void AS $$
BEGIN
    -- 만료된 구독을 EXPIRED로 변경
    UPDATE public.subscriptions
    SET
        status = 'EXPIRED',
        updated_at = NOW()
    WHERE
        status = 'ACTIVE'
        AND current_period_end < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. 뷰: 활성 구독자 통계
-- ============================================
CREATE OR REPLACE VIEW public.subscription_stats AS
SELECT
    COUNT(*) FILTER (WHERE status = 'ACTIVE') as active_count,
    COUNT(*) FILTER (WHERE status = 'CANCELLED') as cancelled_count,
    COUNT(*) FILTER (WHERE status = 'EXPIRED') as expired_count,
    COUNT(*) FILTER (WHERE status = 'PAYMENT_FAILED') as failed_count,
    SUM(CASE WHEN status = 'ACTIVE' THEN
        (SELECT price FROM public.membership_plans WHERE id = subscriptions.plan_id)
    ELSE 0 END) as monthly_revenue
FROM public.subscriptions;

-- ============================================
-- 완료 메시지
-- ============================================
DO $$
BEGIN
    RAISE NOTICE 'Phase 13: Subscription System Migration completed successfully!';
END $$;
