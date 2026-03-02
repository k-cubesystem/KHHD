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
