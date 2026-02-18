-- ============================================================
-- 복채 시스템 마이그레이션
-- 부적(talisman) 시스템을 복채(bokchae) 시스템으로 전환
-- 기본 단위: 1 복채 = 10,000원
-- ============================================================

-- 1. 출석 체크 테이블
CREATE TABLE IF NOT EXISTS attendance_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  checked_date DATE NOT NULL,
  week_start DATE NOT NULL, -- ISO 주 시작 (월요일)
  bokchae_awarded INT DEFAULT 1,
  is_weekly_bonus BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, checked_date)
);

-- 출석 체크 RLS
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own attendance" ON attendance_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own attendance" ON attendance_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 관리자 전체 접근
CREATE POLICY "Admin full access attendance" ON attendance_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'tester')
    )
  );

-- 2. 룰렛 설정 테이블 (관리자가 확률 조정 가능)
CREATE TABLE IF NOT EXISTS roulette_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('bokchae', 'miss')),
  reward_value INT NOT NULL DEFAULT 0, -- 복채 단위 (miss는 0)
  label TEXT NOT NULL,
  probability NUMERIC(5,2) NOT NULL DEFAULT 10.00, -- 확률 (0-100)
  color TEXT NOT NULL DEFAULT '#8b5cf6', -- 룰렛 색상
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 룰렛 설정 RLS
ALTER TABLE roulette_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view roulette config" ON roulette_config
  FOR SELECT USING (true);

CREATE POLICY "Admin can manage roulette config" ON roulette_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'tester')
    )
  );

-- 3. 룰렛 기본 설정 데이터 삽입
INSERT INTO roulette_config (reward_type, reward_value, label, probability, color, sort_order) VALUES
  ('bokchae', 1,  '1만냥', 40.00, '#f59e0b', 1),
  ('bokchae', 3,  '3만냥', 30.00, '#10b981', 2),
  ('bokchae', 5,  '5만냥', 15.00, '#3b82f6', 3),
  ('bokchae', 10, '10만냥', 10.00, '#8b5cf6', 4),
  ('miss',    0,  '꽝',         5.00,  '#ef4444', 5)
ON CONFLICT DO NOTHING;

-- 4. feature_costs 복채 단위 업데이트
-- 기존 feature_costs 테이블이 있다면 비용 업데이트
UPDATE feature_costs SET cost = 1 WHERE key IN (
  'wealth_fortune', 'real_estate_fortune', 'love_fortune', 'health_fortune',
  'career_fortune', 'monthly_fortune', 'yearly_fortune', 'daily_fortune',
  'lucky_day', 'lucky_color', 'lucky_number'
) AND cost > 0;

UPDATE feature_costs SET cost = 2 WHERE key IN (
  'face_reading', 'palm_reading', 'fengshui'
) AND cost > 0;

UPDATE feature_costs SET cost = 5 WHERE key IN (
  'cheonjiin_saju', 'comprehensive_saju', 'saju_analysis'
) AND cost > 0;

-- 5. 멤버십 플랜 일일 복채 수당 업데이트 (단위 통일)
-- SINGLE: 10 복채/일 (=10만냥), FAMILY: 30 복채/일 (=30만냥), BUSINESS: 100 복채/일 (=100만냥)
UPDATE membership_plans SET
  daily_talisman_limit = 10
WHERE tier = 'SINGLE';

UPDATE membership_plans SET
  daily_talisman_limit = 30
WHERE tier = 'FAMILY';

UPDATE membership_plans SET
  daily_talisman_limit = 100
WHERE tier = 'BUSINESS';

-- 6. 룰렛 히스토리 테이블 - reward_type 업데이트 (기존 호환)
-- roulette_history 테이블이 있다면 그대로 사용 (이미 있음)

-- 7. 출석 체크 주별 현황 조회 함수
CREATE OR REPLACE FUNCTION get_weekly_attendance(p_user_id UUID, p_week_start DATE)
RETURNS TABLE (
  checked_date DATE,
  bokchae_awarded INT,
  is_weekly_bonus BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT al.checked_date, al.bokchae_awarded, al.is_weekly_bonus
  FROM attendance_logs al
  WHERE al.user_id = p_user_id
    AND al.week_start = p_week_start
  ORDER BY al.checked_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. 이번 주 출석 횟수 계산 함수
CREATE OR REPLACE FUNCTION get_weekly_attendance_count(p_user_id UUID)
RETURNS INT AS $$
DECLARE
  v_week_start DATE;
  v_count INT;
BEGIN
  -- 이번 주 월요일 계산
  v_week_start := date_trunc('week', CURRENT_DATE)::DATE;

  SELECT COUNT(*) INTO v_count
  FROM attendance_logs
  WHERE user_id = p_user_id
    AND week_start = v_week_start;

  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. 복채 지급 RPC 함수 (기존 add_talisman 함수 별칭)
CREATE OR REPLACE FUNCTION add_bokchae(
  p_user_id UUID,
  p_amount INT,
  p_reason TEXT DEFAULT '복채 지급'
) RETURNS BOOLEAN AS $$
DECLARE
  v_current_balance INT;
BEGIN
  SELECT balance INTO v_current_balance FROM wallets WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO wallets (user_id, balance) VALUES (p_user_id, p_amount);
  ELSE
    UPDATE wallets SET balance = v_current_balance + p_amount WHERE user_id = p_user_id;
  END IF;

  INSERT INTO wallet_transactions (user_id, amount, type, description)
  VALUES (p_user_id, p_amount, 'BONUS', p_reason);

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
