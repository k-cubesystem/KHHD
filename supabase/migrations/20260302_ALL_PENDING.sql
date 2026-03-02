-- 알림 설정 테이블
-- 카카오 알림톡 수신 동의 및 전화번호 관리

CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- 연락처
    phone_number TEXT,                          -- 정규화된 전화번호 (01012345678)

    -- 알림톡 수신 동의
    alimtalk_enabled BOOLEAN NOT NULL DEFAULT FALSE,         -- 카카오 알림톡 전체 수신 동의
    daily_fortune_enabled BOOLEAN NOT NULL DEFAULT FALSE,    -- 오늘의 운세 매일 수신
    attendance_reward_enabled BOOLEAN NOT NULL DEFAULT FALSE, -- 출석 보상 알림
    payment_enabled BOOLEAN NOT NULL DEFAULT FALSE,          -- 복채 결제/충전 알림

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT notification_preferences_user_id_key UNIQUE (user_id),
    CONSTRAINT phone_number_format CHECK (
        phone_number IS NULL OR phone_number ~ '^01[0-9]{8,9}$'
    )
);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION public.update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_notification_preferences_updated_at ON public.notification_preferences;
CREATE TRIGGER set_notification_preferences_updated_at
    BEFORE UPDATE ON public.notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION public.update_notification_preferences_updated_at();

-- RLS 활성화
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- 사용자 본인만 조회/수정 가능
CREATE POLICY "Users can view own notification preferences"
    ON public.notification_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences"
    ON public.notification_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences"
    ON public.notification_preferences FOR UPDATE
    USING (auth.uid() = user_id);

-- 어드민은 모든 레코드 접근 가능 (알림톡 일괄 발송용)
CREATE POLICY "Service role can manage all notification preferences"
    ON public.notification_preferences
    USING (auth.role() = 'service_role');

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id
    ON public.notification_preferences (user_id);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_alimtalk_daily
    ON public.notification_preferences (alimtalk_enabled, daily_fortune_enabled)
    WHERE alimtalk_enabled = TRUE AND daily_fortune_enabled = TRUE;

COMMENT ON TABLE public.notification_preferences IS '카카오 알림톡 수신 설정 및 전화번호';
COMMENT ON COLUMN public.notification_preferences.phone_number IS '정규화된 전화번호 (하이픈 없이, 01012345678 형식)';
COMMENT ON COLUMN public.notification_preferences.alimtalk_enabled IS '카카오 알림톡 전체 수신 동의 마스터 스위치';
-- 해화지기 채팅 세션 및 메시지 영속화
-- chat_sessions: 한 대화 세션 (새 대화 시작 = 새 세션)
-- chat_messages: 각 세션의 메시지들

CREATE TABLE IF NOT EXISTS chat_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  family_member_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
  title       TEXT,                         -- 세션 첫 메시지 요약 (첫 user 메시지 앞 20자)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at    TIMESTAMPTZ                   -- 명시적 종료 시각 (새 대화 시작 클릭 시)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS chat_sessions_user_id_idx ON chat_sessions(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS chat_messages_session_id_idx ON chat_messages(session_id, created_at ASC);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_chat_session_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE chat_sessions SET updated_at = now() WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chat_messages_update_session ON chat_messages;
CREATE TRIGGER chat_messages_update_session
  AFTER INSERT ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION update_chat_session_timestamp();

-- RLS
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- chat_sessions RLS
CREATE POLICY "users can read own sessions"
  ON chat_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users can insert own sessions"
  ON chat_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users can update own sessions"
  ON chat_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "users can delete own sessions"
  ON chat_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- chat_messages RLS (세션 소유자만)
CREATE POLICY "users can read own messages"
  ON chat_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM chat_sessions s
    WHERE s.id = chat_messages.session_id AND s.user_id = auth.uid()
  ));

CREATE POLICY "users can insert own messages"
  ON chat_messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM chat_sessions s
    WHERE s.id = chat_messages.session_id AND s.user_id = auth.uid()
  ));
-- Add share_view_count column to analysis_history for view tracking
ALTER TABLE analysis_history
  ADD COLUMN IF NOT EXISTS share_view_count integer NOT NULL DEFAULT 0;

-- Update the RPC to also increment the view counter on each public fetch
CREATE OR REPLACE FUNCTION get_shared_analysis_record(token_input text)
RETURNS SETOF analysis_history
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Increment view counter (best-effort, non-blocking)
  UPDATE analysis_history
  SET share_view_count = share_view_count + 1
  WHERE share_token = token_input;

  RETURN QUERY
  SELECT *
  FROM analysis_history
  WHERE share_token = token_input
  LIMIT 1;
END;
$$;

-- Grant execution rights to all users (including anonymous for public sharing)
GRANT EXECUTE ON FUNCTION get_shared_analysis_record(text) TO anon, authenticated, service_role;
-- ============================================================
-- Database Index Optimization
-- 2026-03-02
-- Performance optimization for frequently queried tables
-- ============================================================

-- ===================================================
-- 1. ANALYSIS_HISTORY - Composite Indexes
-- ===================================================
-- Purpose: Support common query patterns for retrieving user's analysis history
-- Pattern: Filter by user_id + created_at (DESC), user_id + category
-- Replaces: Individual idx_analysis_history_user_id + idx_analysis_history_created_at

-- Composite index for (user_id, created_at DESC) - most common query pattern
CREATE INDEX IF NOT EXISTS idx_analysis_history_user_created
  ON public.analysis_history(user_id, created_at DESC);
COMMENT ON INDEX idx_analysis_history_user_created IS
  'Composite index for retrieving user analysis history sorted by date';

-- Composite index for (user_id, category) - category filtering queries
CREATE INDEX IF NOT EXISTS idx_analysis_history_user_category
  ON public.analysis_history(user_id, category);
COMMENT ON INDEX idx_analysis_history_user_category IS
  'Composite index for filtering user analysis by category';

-- Index for (target_id, category) - dependency chain lookups
CREATE INDEX IF NOT EXISTS idx_analysis_history_target_category
  ON public.analysis_history(target_id, category)
  WHERE target_id IS NOT NULL;
COMMENT ON INDEX idx_analysis_history_target_category IS
  'Index for querying analysis by target and category for dependency tracking';

-- ===================================================
-- 2. PAYMENTS - Composite Indexes
-- ===================================================
-- Purpose: Support payment history queries and reconciliation
-- Pattern: Filter by user_id + created_at (DESC), status + created_at (DESC)

-- Composite index for (user_id, created_at DESC)
CREATE INDEX IF NOT EXISTS idx_payments_user_created
  ON public.payments(user_id, created_at DESC);
COMMENT ON INDEX idx_payments_user_created IS
  'Composite index for retrieving user payment history sorted by date';

-- Composite index for (status, created_at DESC) for admin reconciliation
CREATE INDEX IF NOT EXISTS idx_payments_status_created
  ON public.payments(status, created_at DESC);
COMMENT ON INDEX idx_payments_status_created IS
  'Index for admin queries filtering payments by status and date range';

-- ===================================================
-- 3. WALLET_TRANSACTIONS - Composite Indexes
-- ===================================================
-- Purpose: Support wallet transaction lookups and reconciliation
-- Pattern: Filter by user_id + created_at (DESC), type + created_at

-- Composite index for (user_id, created_at DESC)
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_created
  ON public.wallet_transactions(user_id, created_at DESC);
COMMENT ON INDEX idx_wallet_transactions_user_created IS
  'Composite index for retrieving user wallet transaction history';

-- Composite index for (user_id, type, created_at DESC)
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_type_created
  ON public.wallet_transactions(user_id, type, created_at DESC);
COMMENT ON INDEX idx_wallet_transactions_user_type_created IS
  'Index for filtering wallet transactions by user, type and date';

-- ===================================================
-- 4. FORTUNE_JOURNAL - Composite Indexes
-- ===================================================
-- Purpose: Optimize monthly/yearly fortune calculations
-- Pattern: Filter by family_member_id + year + month, user_id + year + month
-- Note: Already has idx_fortune_journal_user_year_month, adding more specific ones

-- Index for (family_member_id, year, month, category) - mission tracking
CREATE INDEX IF NOT EXISTS idx_fortune_journal_member_year_month_category
  ON public.fortune_journal(family_member_id, year, month, category);
COMMENT ON INDEX idx_fortune_journal_member_year_month_category IS
  'Index for checking if specific analysis already recorded for member/month';

-- Index for (user_id, year, month) - yearly aggregation
CREATE INDEX IF NOT EXISTS idx_fortune_journal_user_year_month
  ON public.fortune_journal(user_id, year, month);
COMMENT ON INDEX idx_fortune_journal_user_year_month IS
  'Index for yearly fortune calculation aggregations';

-- ===================================================
-- 5. ANALYSIS_SESSIONS - Additional Indexes
-- ===================================================
-- Purpose: Optimize multimodal analysis session queries
-- Pattern: Filter by user_id + category, target_member_id + created_at

-- Composite index for (user_id, category, created_at DESC)
CREATE INDEX IF NOT EXISTS idx_analysis_sessions_user_category_created
  ON public.analysis_sessions(user_id, category, created_at DESC);
COMMENT ON INDEX idx_analysis_sessions_user_category_created IS
  'Index for retrieving user analysis sessions by category';

-- Composite index for (target_member_id, created_at DESC)
CREATE INDEX IF NOT EXISTS idx_analysis_sessions_target_created
  ON public.analysis_sessions(target_member_id, created_at DESC);
COMMENT ON INDEX idx_analysis_sessions_target_created IS
  'Index for family member session history retrieval';

-- ===================================================
-- 6. AI_CHAT_USAGE - Composite Indexes
-- ===================================================
-- Purpose: Optimize AI chat usage tracking queries
-- Pattern: Filter by user_id + usage_date (DESC), usage_date only

-- Composite index for (user_id, usage_date DESC)
CREATE INDEX IF NOT EXISTS idx_ai_chat_usage_user_date
  ON public.ai_chat_usage(user_id, usage_date DESC);
COMMENT ON INDEX idx_ai_chat_usage_user_date IS
  'Index for retrieving user AI chat usage by date';

-- ===================================================
-- 7. REFERRAL_CODES - Lookup Indexes
-- ===================================================
-- Purpose: Fast code validation and user lookup
-- Pattern: Query by code, query by user_id

-- Index for code uniqueness lookup (already defined, ensuring it exists)
CREATE INDEX IF NOT EXISTS idx_referral_codes_code
  ON public.referral_codes(code);
COMMENT ON INDEX idx_referral_codes_code IS
  'Index for referral code validation and lookup';

-- Index for user-specific referral code retrieval
CREATE INDEX IF NOT EXISTS idx_referral_codes_user_id
  ON public.referral_codes(user_id);
COMMENT ON INDEX idx_referral_codes_user_id IS
  'Index for retrieving user referral code';

-- ===================================================
-- 8. REFERRAL_USES - Tracking Indexes
-- ===================================================
-- Purpose: Optimize referral reward queries
-- Pattern: Filter by referrer_id, referee_id

-- Composite index for (referrer_id, rewarded_at DESC)
CREATE INDEX IF NOT EXISTS idx_referral_uses_referrer_rewarded
  ON public.referral_uses(referrer_id, rewarded_at DESC);
COMMENT ON INDEX idx_referral_uses_referrer_rewarded IS
  'Index for retrieving referrer reward history';

-- Index for referee verification (single-use constraint check)
CREATE INDEX IF NOT EXISTS idx_referral_uses_referee_id
  ON public.referral_uses(referee_id);
COMMENT ON INDEX idx_referral_uses_referee_id IS
  'Index for checking if referee has already used referral bonus';

-- ===================================================
-- 9. SUBSCRIPTIONS - Query Optimization
-- ===================================================
-- Purpose: Optimize subscription status and billing queries
-- Pattern: Filter by user_id + status, next_billing_date

-- Composite index for (user_id, status)
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status
  ON public.subscriptions(user_id, status);
COMMENT ON INDEX idx_subscriptions_user_status IS
  'Index for retrieving user subscription by status';

-- Index for billing date range queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing
  ON public.subscriptions(next_billing_date)
  WHERE status IN ('ACTIVE', 'INACTIVE');
COMMENT ON INDEX idx_subscriptions_next_billing IS
  'Partial index for upcoming billing date queries (excludes canceled/expired)';

-- ===================================================
-- 10. WALLETS - Balance and Status Queries
-- ===================================================
-- Purpose: Quick user balance lookups and subscription status
-- Pattern: Filter by is_subscribed, query by user_id

-- Index for subscription status queries
CREATE INDEX IF NOT EXISTS idx_wallets_subscribed_updated
  ON public.wallets(is_subscribed, updated_at DESC)
  WHERE is_subscribed = true;
COMMENT ON INDEX idx_wallets_subscribed_updated IS
  'Partial index for active subscriptions with recent activity';

-- ===================================================
-- 11. PROFILES - Activity Tracking
-- ===================================================
-- Purpose: Admin analytics and user engagement queries
-- Pattern: Filter by role, created_at, updated_at

-- Index for admin user queries
CREATE INDEX IF NOT EXISTS idx_profiles_role
  ON public.profiles(role)
  WHERE role IN ('admin', 'tester');
COMMENT ON INDEX idx_profiles_role IS
  'Partial index for admin and tester user lookups';

-- Index for user activity tracking
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at
  ON public.profiles(updated_at DESC);
COMMENT ON INDEX idx_profiles_updated_at IS
  'Index for retrieving recently active users';

-- ===================================================
-- 12. FAMILY_MEMBERS - User Queries
-- ===================================================
-- Purpose: Optimize family member queries
-- Pattern: Filter by user_id + relationship, user_id + updated_at

-- Composite index for (user_id, relationship)
CREATE INDEX IF NOT EXISTS idx_family_members_user_relationship
  ON public.family_members(user_id, relationship);
COMMENT ON INDEX idx_family_members_user_relationship IS
  'Index for retrieving family members by relationship type';

-- Composite index for (user_id, updated_at DESC)
CREATE INDEX IF NOT EXISTS idx_family_members_user_updated
  ON public.family_members(user_id, updated_at DESC);
COMMENT ON INDEX idx_family_members_user_updated IS
  'Index for retrieving recently updated family members';

-- ===================================================
-- COMPLETION LOG
-- ===================================================
DO $$
BEGIN
  RAISE NOTICE '================================';
  RAISE NOTICE '✓ Index Optimization Complete (2026-03-02)';
  RAISE NOTICE '================================';
  RAISE NOTICE '✓ analysis_history: 3 composite indexes';
  RAISE NOTICE '✓ payments: 2 composite indexes';
  RAISE NOTICE '✓ wallet_transactions: 2 composite indexes';
  RAISE NOTICE '✓ fortune_journal: 2 indexes';
  RAISE NOTICE '✓ analysis_sessions: 2 composite indexes';
  RAISE NOTICE '✓ ai_chat_usage: 1 composite index';
  RAISE NOTICE '✓ referral_codes: 2 indexes';
  RAISE NOTICE '✓ referral_uses: 2 indexes';
  RAISE NOTICE '✓ subscriptions: 2 indexes (1 partial)';
  RAISE NOTICE '✓ wallets: 1 partial index';
  RAISE NOTICE '✓ profiles: 2 indexes (1 partial)';
  RAISE NOTICE '✓ family_members: 2 composite indexes';
  RAISE NOTICE '================================';
  RAISE NOTICE 'Key Benefits:';
  RAISE NOTICE '- Faster (user_id, date DESC) queries for history';
  RAISE NOTICE '- Improved category filtering performance';
  RAISE NOTICE '- Optimized fortune calculation aggregations';
  RAISE NOTICE '- Better referral code lookups';
  RAISE NOTICE '- Reduced sequential scans in admin queries';
  RAISE NOTICE '================================';
END $$;
-- Business inquiries table for B2B enterprise landing page
CREATE TABLE IF NOT EXISTS business_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  employee_count TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'contracted', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for admin queries
CREATE INDEX IF NOT EXISTS business_inquiries_status_idx ON business_inquiries (status, created_at DESC);
CREATE INDEX IF NOT EXISTS business_inquiries_email_idx ON business_inquiries (email);

-- RLS: public can insert, only admin can read
ALTER TABLE business_inquiries ENABLE ROW LEVEL SECURITY;

-- Anyone can submit an inquiry (public page, no auth)
CREATE POLICY "Anyone can submit business inquiry"
  ON business_inquiries
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Only authenticated users with admin role can read/update inquiries
CREATE POLICY "Admins can manage business inquiries"
  ON business_inquiries
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
