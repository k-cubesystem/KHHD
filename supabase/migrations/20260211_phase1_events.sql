-- =============================================
-- PHASE 1: 메인 페이지 리뉴얼 - 이벤트 테이블
-- Created: 2026-02-11
-- Author: DB_MASTER
-- =============================================

-- 1. 일일 출석 테이블
CREATE TABLE IF NOT EXISTS daily_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  checked_at DATE NOT NULL DEFAULT CURRENT_DATE,
  consecutive_days INT DEFAULT 1 CHECK (consecutive_days >= 1),
  reward_talisman INT NOT NULL CHECK (reward_talisman >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, checked_at)
);

-- 인덱스
CREATE INDEX idx_daily_attendance_user ON daily_attendance(user_id);
CREATE INDEX idx_daily_attendance_date ON daily_attendance(checked_at DESC);

-- RLS 정책
ALTER TABLE daily_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own attendance"
  ON daily_attendance FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own attendance"
  ON daily_attendance FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 2. 행운의 룰렛 기록 테이블
CREATE TABLE IF NOT EXISTS roulette_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reward_type VARCHAR(50) NOT NULL CHECK (reward_type IN ('talisman', 'premium', 'discount')),
  reward_value INT NOT NULL CHECK (reward_value >= 0),
  spun_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_roulette_user ON roulette_history(user_id);
CREATE INDEX idx_roulette_date ON roulette_history(user_id, DATE(spun_at));

-- RLS 정책
ALTER TABLE roulette_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own roulette history"
  ON roulette_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own roulette history"
  ON roulette_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3. 이벤트 배너 관리 테이블 (관리자 전용)
CREATE TABLE IF NOT EXISTS event_banners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  cta_text VARCHAR(50) NOT NULL,
  cta_link VARCHAR(200) NOT NULL,
  icon VARCHAR(50), -- 이모지 또는 아이콘 이름
  background_color VARCHAR(50) DEFAULT '#ECB613',
  is_active BOOLEAN DEFAULT true,
  priority INT DEFAULT 0, -- 높을수록 먼저 표시
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_event_banners_active ON event_banners(is_active, priority DESC);

-- RLS 정책 (모든 사용자 읽기 가능, 관리자만 수정)
ALTER TABLE event_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active banners"
  ON event_banners FOR SELECT
  USING (is_active = true);

-- 관리자 정책 (나중에 profiles.role 추가 후 활성화)
-- CREATE POLICY "Admins can manage banners"
--   ON event_banners FOR ALL
--   USING (
--     EXISTS (
--       SELECT 1 FROM profiles
--       WHERE profiles.id = auth.uid()
--       AND profiles.role = 'admin'
--     )
--   );

-- 4. 기본 이벤트 배너 데이터 삽입
INSERT INTO event_banners (title, description, cta_text, cta_link, icon, priority, is_active) VALUES
('신규 가입 혜택', '첫 운세 무료 + 부적 1,000장 증정', '1분 만에 시작하기', '/protected/membership', '🎁', 3, true),
('친구 초대 이벤트', '친구 1명당 부적 500장 + 친구도 500장 받기', '초대 링크 복사', '/protected/referral', '👥', 2, true),
('이달의 특가', '프리미엄 패키지 30% 할인 (7일 남음)', '지금 구매하고 절약하기', '/protected/membership', '⚡', 1, true)
ON CONFLICT DO NOTHING;

-- 5. 온보딩 상태 추가 (profiles 테이블 확장)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_step INT DEFAULT 0;

-- 6. RPC 함수: 일일 출석 증가
CREATE OR REPLACE FUNCTION increment_daily_attendance(
  p_user_id UUID,
  p_date DATE,
  p_consecutive_days INT,
  p_reward INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO daily_attendance (user_id, checked_at, consecutive_days, reward_talisman)
  VALUES (p_user_id, p_date, p_consecutive_days, p_reward);
END;
$$;

-- 7. RPC 함수: 부적 추가 (wallet 시스템 연동)
CREATE OR REPLACE FUNCTION add_talisman(
  p_user_id UUID,
  p_amount INT,
  p_reason TEXT DEFAULT '부적 지급'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- wallet 테이블 업데이트 (balance 증가)
  UPDATE wallet
  SET
    balance = balance + p_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- wallet 레코드가 없으면 생성
  IF NOT FOUND THEN
    INSERT INTO wallet (user_id, balance)
    VALUES (p_user_id, p_amount);
  END IF;

  -- 트랜잭션 기록
  INSERT INTO wallet_transactions (user_id, amount, type, description, created_at)
  VALUES (p_user_id, p_amount, 'earn', p_reason, NOW());
END;
$$;

-- 8. 마이그레이션 완료 확인
DO $$
BEGIN
  RAISE NOTICE 'PHASE 1 마이그레이션 완료: daily_attendance, roulette_history, event_banners 테이블 생성됨';
  RAISE NOTICE '- add_talisman RPC 함수 생성됨';
END $$;
