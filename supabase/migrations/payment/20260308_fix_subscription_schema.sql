-- ============================================
-- subscriptions 테이블 스키마를 코드와 동기화
-- ============================================

-- 1. subscriptions 테이블 컬럼 추가 + CHECK 제약 수정
ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_status_check;

ALTER TABLE public.subscriptions
  ALTER COLUMN status SET DEFAULT 'PENDING',
  ADD CONSTRAINT subscriptions_status_check
    CHECK (status IN ('PENDING', 'ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED', 'PAYMENT_FAILED', 'INACTIVE', 'CANCELED'));

-- UNIQUE(user_id, status) 제약 제거 (여러 구독 레코드 허용)
ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_user_id_status_key;

-- 누락된 컬럼 추가
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS current_period_start timestamp with time zone,
  ADD COLUMN IF NOT EXISTS current_period_end  timestamp with time zone,
  ADD COLUMN IF NOT EXISTS last_payment_date   timestamp with time zone,
  ADD COLUMN IF NOT EXISTS cancelled_at        timestamp with time zone,
  ADD COLUMN IF NOT EXISTS cancel_reason       text,
  ADD COLUMN IF NOT EXISTS retry_count         integer DEFAULT 0;

-- 기존 컬럼명 alias (start_date → current_period_start 로 이미 데이터 있으면 복사)
UPDATE public.subscriptions
  SET current_period_start = start_date
  WHERE current_period_start IS NULL AND start_date IS NOT NULL;

UPDATE public.subscriptions
  SET current_period_end = end_date
  WHERE current_period_end IS NULL AND end_date IS NOT NULL;

-- ============================================
-- 2. subscription_payments 테이블 생성
-- ============================================
CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id      uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  user_id              uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  payment_key          text,
  order_id             text NOT NULL,
  amount               integer NOT NULL,
  status               text NOT NULL DEFAULT 'PENDING'
                         CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED')),
  failure_code         text,
  failure_reason       text,
  billing_period_start timestamp with time zone,
  billing_period_end   timestamp with time zone,
  talismans_granted    integer DEFAULT 0,
  created_at           timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_user
  ON public.subscription_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_sub
  ON public.subscription_payments(subscription_id);

ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own payments" ON public.subscription_payments;
CREATE POLICY "Users can view own payments"
  ON public.subscription_payments FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage payments" ON public.subscription_payments;
CREATE POLICY "Service role can manage payments"
  ON public.subscription_payments FOR ALL
  USING (true);

-- ============================================
-- 3. subscriptions RLS 정책 재설정
-- ============================================
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can view own subscriptions"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can insert own subscriptions"
  ON public.subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can update own subscriptions"
  ON public.subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

SELECT 'subscription schema migration complete' AS result;
