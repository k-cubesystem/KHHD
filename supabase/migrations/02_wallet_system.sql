-- ============================================
-- 02. 월렛 시스템 (Wallet & Feature Costs)
-- ============================================

-- ==========================================
-- 1. Wallets 테이블 (통합 부적 잔액)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.wallets (
    user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    balance integer DEFAULT 0 NOT NULL CHECK (balance >= 0),
    is_subscribed boolean DEFAULT false,
    subscription_end_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_wallets_subscribed ON public.wallets(is_subscribed);

-- RLS
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own wallet" ON public.wallets;
CREATE POLICY "Users can view own wallet"
ON public.wallets FOR SELECT
USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "Users can update own wallet" ON public.wallets;
CREATE POLICY "Users can update own wallet"
ON public.wallets FOR UPDATE
USING (auth.uid() = user_id);

-- ==========================================
-- 2. Wallet Transactions 테이블
-- ==========================================
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.wallets(user_id) ON DELETE CASCADE,
    amount integer NOT NULL,
    type text NOT NULL CHECK (type IN ('CHARGE', 'USE', 'BONUS', 'REFUND', 'SUBSCRIPTION')),
    feature_key text,
    description text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON public.wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON public.wallet_transactions(type);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON public.wallet_transactions(created_at DESC);

-- RLS
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own transactions" ON public.wallet_transactions;
CREATE POLICY "Users can view own transactions"
ON public.wallet_transactions FOR SELECT
USING (auth.uid() = user_id OR is_admin());

-- ==========================================
-- 3. Feature Costs 테이블 (기능별 가격)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.feature_costs (
    key text PRIMARY KEY,
    label text NOT NULL,
    cost integer NOT NULL DEFAULT 1 CHECK (cost >= 0),
    category text DEFAULT 'GENERAL',
    is_active boolean DEFAULT true,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 기존 테이블이 있을 경우 category 컬럼 추가 보장
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'feature_costs' AND column_name = 'category') THEN
        ALTER TABLE public.feature_costs ADD COLUMN category text DEFAULT 'GENERAL';
    END IF;
END $$;

-- RLS
ALTER TABLE public.feature_costs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view feature costs" ON public.feature_costs;
CREATE POLICY "Anyone can view feature costs"
ON public.feature_costs FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admins can manage feature costs" ON public.feature_costs;
CREATE POLICY "Admins can manage feature costs"
ON public.feature_costs FOR ALL
USING (is_admin());

-- ==========================================
-- 4. 초기 기능 가격 데이터
-- ==========================================
INSERT INTO public.feature_costs (key, label, cost, category, description) VALUES
('SAJU_BASIC', '사주 정밀 분석', 1, 'SAJU', '기본 사주 분석 서비스'),
('COMPATIBILITY', '궁합 분석', 2, 'SAJU', '2인 궁합 분석'),
('FACE_AI', 'AI 관상 분석', 2, 'AI_SERVICES', 'AI 비전 기반 관상 분석'),
('PALM_AI', 'AI 손금 분석', 2, 'AI_SERVICES', 'AI 비전 기반 손금 분석'),
('FENGSHUI_AI', 'AI 풍수 분석', 3, 'AI_SERVICES', 'AI 비전 기반 풍수 인테리어 분석'),
('IMAGE_GEN', '개운 이미지 생성', 5, 'AI_SERVICES', 'AI 이미지 생성 (Imagen 3)'),
('SHAMAN_CHAT', 'AI 신당 채팅', 1, 'AI_SERVICES', 'AI 신당 채팅 1회당 부적 소모')
ON CONFLICT (key) DO NOTHING;

-- ==========================================
-- 5. 트리거
-- ==========================================

DROP TRIGGER IF EXISTS update_wallets_updated_at ON public.wallets;
CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_feature_costs_updated_at ON public.feature_costs;
CREATE TRIGGER update_feature_costs_updated_at
  BEFORE UPDATE ON public.feature_costs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 6. 신규 유저 가입 시 Wallet 자동 생성 (기존 함수 확장)
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Profile 생성
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email
  );

  -- Wallet 생성 (가입 보너스 1부적)
  INSERT INTO public.wallets (user_id, balance)
  VALUES (new.id, 1);

  -- 가입 보너스 트랜잭션 기록
  INSERT INTO public.wallet_transactions (user_id, amount, type, description)
  VALUES (new.id, 1, 'BONUS', '회원가입 축하 부적');

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
