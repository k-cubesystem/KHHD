-- ============================================
-- Phase 12: Wallet & Dynamic Pricing System
-- 작성일: 2026-01-22
-- ============================================

-- 1. Wallets 테이블 생성 (통합 부적 잔액 관리)
CREATE TABLE IF NOT EXISTS public.wallets (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    balance INTEGER DEFAULT 0 NOT NULL CHECK (balance >= 0),
    is_subscribed BOOLEAN DEFAULT FALSE,
    subscription_end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Wallet Transactions 테이블 생성 (사용/충전 이력)
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.wallets(user_id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('CHARGE', 'USE', 'BONUS', 'REFUND', 'SUBSCRIPTION')),
    feature_key TEXT,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Feature Costs 테이블 생성 (기능별 동적 가격)
CREATE TABLE IF NOT EXISTS public.feature_costs (
    key TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    cost INTEGER NOT NULL DEFAULT 1 CHECK (cost >= 0),
    is_active BOOLEAN DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 초기 기능 가격 데이터 시딩
INSERT INTO public.feature_costs (key, label, cost, description) VALUES
('SAJU_BASIC', '사주 정밀 분석', 1, '기본 사주 분석 서비스'),
('COMPATIBILITY', '궁합 분석', 2, '2인 궁합 분석'),
('FACE_AI', 'AI 관상 분석', 2, 'AI 비전 기반 관상 분석'),
('PALM_AI', 'AI 손금 분석', 2, 'AI 비전 기반 손금 분석'),
('FENGSHUI_AI', 'AI 풍수 분석', 3, 'AI 비전 기반 풍수 인테리어 분석'),
('IMAGE_GEN', '개운 이미지 생성', 5, 'AI 이미지 생성 (Imagen 3)')
ON CONFLICT (key) DO NOTHING;

-- 5. 기존 데이터 마이그레이션 (payments -> wallets)
-- 기존 payments 테이블의 credits_remaining 합계를 wallets로 이관
INSERT INTO public.wallets (user_id, balance)
SELECT 
    user_id,
    COALESCE(SUM(credits_remaining), 0) as balance
FROM public.payments
WHERE status IN ('completed', 'test_charge')
GROUP BY user_id
ON CONFLICT (user_id) DO UPDATE
SET balance = EXCLUDED.balance;

-- 6. 모든 기존 유저에게 wallets 레코드 생성 (잔액 0)
INSERT INTO public.wallets (user_id, balance)
SELECT id, 0
FROM public.profiles
WHERE id NOT IN (SELECT user_id FROM public.wallets)
ON CONFLICT (user_id) DO NOTHING;

-- 7. RLS 정책 설정
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_costs ENABLE ROW LEVEL SECURITY;

-- Wallets: 본인만 조회, 관리자는 모두 조회
CREATE POLICY "Users can view own wallet"
ON public.wallets FOR SELECT
USING (
    auth.uid() = user_id
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- Wallet Transactions: 본인만 조회, 관리자는 모두 조회
CREATE POLICY "Users can view own transactions"
ON public.wallet_transactions FOR SELECT
USING (
    auth.uid() = user_id
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- Feature Costs: 누구나 조회 가능, 관리자만 수정
CREATE POLICY "Anyone can view feature costs"
ON public.feature_costs FOR SELECT
USING (true);

CREATE POLICY "Admins can manage feature costs"
ON public.feature_costs FOR ALL
USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- 8. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON public.wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON public.wallet_transactions(type);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON public.wallet_transactions(created_at DESC);

-- 9. 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_wallet_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER wallet_updated_at
BEFORE UPDATE ON public.wallets
FOR EACH ROW
EXECUTE FUNCTION update_wallet_updated_at();

CREATE TRIGGER feature_costs_updated_at
BEFORE UPDATE ON public.feature_costs
FOR EACH ROW
EXECUTE FUNCTION update_wallet_updated_at();

-- 10. 새 유저 가입 시 자동으로 wallet 생성 (기존 트리거 확장)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Profile 생성
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  
  -- Wallet 생성 (가입 보너스 1부적)
  INSERT INTO public.wallets (user_id, balance)
  VALUES (new.id, 1);
  
  -- 가입 보너스 트랜잭션 기록
  INSERT INTO public.wallet_transactions (user_id, amount, type, description)
  VALUES (new.id, 1, 'BONUS', '회원가입 축하 부적');
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 완료!
-- ============================================
SELECT 'Wallet System Migration Complete!' as status;
