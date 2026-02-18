-- Prevent duplicate tester daily top-up via unique constraint
-- wallet_transactions: (user_id, feature_key, date) must be unique
-- This enforces idempotency at the DB level for TESTER_DAILY grants

CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_transactions_tester_daily
  ON wallet_transactions (user_id, feature_key, DATE(created_at AT TIME ZONE 'Asia/Seoul'))
  WHERE feature_key = 'TESTER_DAILY';
