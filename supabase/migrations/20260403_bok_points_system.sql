-- ============================================
-- 복 포인트 시스템 (Bok Points Ecosystem)
-- 2026-04-03
-- ============================================

-- 1. 복 포인트 잔액
CREATE TABLE IF NOT EXISTS bok_points (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  balance INTEGER DEFAULT 0 CHECK (balance >= 0),
  lifetime_earned INTEGER DEFAULT 0,
  tier TEXT DEFAULT 'SEED' CHECK (tier IN ('SEED','SPROUT','FLOWER','TREE','FOREST')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE bok_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bok_points_select_own" ON bok_points FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "bok_points_insert_own" ON bok_points FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bok_points_update_own" ON bok_points FOR UPDATE USING (auth.uid() = user_id);

-- 2. 복 포인트 트랜잭션 로그
CREATE TABLE IF NOT EXISTS bok_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  target_user_id UUID REFERENCES auth.users(id),
  family_member_id UUID,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('REGISTER','ANALYSIS','COMPATIBILITY','FORTUNE','SHARE','CHECKIN','BONUS','REFERRAL','MISSION')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE bok_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bok_tx_select_own" ON bok_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "bok_tx_insert_own" ON bok_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_bok_tx_user ON bok_transactions(user_id, created_at DESC);

-- 3. 복 미션 (일일/주간)
CREATE TABLE IF NOT EXISTS bok_missions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  family_member_id UUID,
  mission_type TEXT NOT NULL CHECK (mission_type IN ('DAILY_FORTUNE','WEEKLY_FORTUNE','ANALYSIS','COMPATIBILITY','SHARE')),
  mission_title TEXT NOT NULL,
  points_reward INTEGER DEFAULT 10,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  mission_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE bok_missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bok_missions_all_own" ON bok_missions FOR ALL USING (auth.uid() = user_id);

CREATE UNIQUE INDEX bok_missions_daily_unique ON bok_missions(user_id, family_member_id, mission_type, mission_date);
CREATE INDEX idx_bok_missions_user_date ON bok_missions(user_id, mission_date);

-- 4. RPC: 복 포인트 추가 (atomic)
CREATE OR REPLACE FUNCTION add_bok_points(p_user_id UUID, p_amount INT)
RETURNS INT AS $$
DECLARE
  v_balance INT;
  v_lifetime INT;
BEGIN
  INSERT INTO bok_points (user_id, balance, lifetime_earned)
  VALUES (p_user_id, p_amount, p_amount)
  ON CONFLICT (user_id) DO UPDATE
    SET balance = bok_points.balance + p_amount,
        lifetime_earned = bok_points.lifetime_earned + p_amount,
        updated_at = now();

  SELECT balance, lifetime_earned INTO v_balance, v_lifetime
  FROM bok_points WHERE user_id = p_user_id;

  UPDATE bok_points SET tier = CASE
    WHEN v_lifetime >= 15000 THEN 'FOREST'
    WHEN v_lifetime >= 5000 THEN 'TREE'
    WHEN v_lifetime >= 2000 THEN 'FLOWER'
    WHEN v_lifetime >= 500 THEN 'SPROUT'
    ELSE 'SEED'
  END WHERE user_id = p_user_id;

  RETURN v_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
