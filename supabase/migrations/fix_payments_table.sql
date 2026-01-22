-- ============================================
-- Step 1: 기존 payments 테이블 완전 삭제
-- ============================================

-- 기존 테이블이 있다면 삭제 (트리거, 정책 포함)
DROP TABLE IF EXISTS public.payments CASCADE;

-- ============================================
-- Step 2: payments 테이블 새로 생성
-- ============================================

CREATE TABLE public.payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    payment_key TEXT NOT NULL,
    order_id TEXT NOT NULL UNIQUE,
    amount INTEGER NOT NULL,
    credits_purchased INTEGER NOT NULL DEFAULT 1,
    credits_remaining INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Step 3: 인덱스 생성
-- ============================================

CREATE INDEX idx_payments_user_id ON public.payments(user_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_order_id ON public.payments(order_id);

-- ============================================
-- Step 4: RLS (Row Level Security) 활성화
-- ============================================

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Step 5: RLS 정책 생성
-- ============================================

-- 사용자는 자신의 결제 내역만 조회 가능
CREATE POLICY "Users can view own payments"
    ON public.payments
    FOR SELECT
    USING (auth.uid() = user_id);

-- 사용자는 자신의 결제 내역만 삽입 가능
CREATE POLICY "Users can insert own payments"
    ON public.payments
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 결제 내역만 업데이트 가능
CREATE POLICY "Users can update own payments"
    ON public.payments
    FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================
-- Step 6: 업데이트 시간 자동 갱신 트리거
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 완료! 
-- ============================================

-- 테이블 구조 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'payments'
ORDER BY ordinal_position;
