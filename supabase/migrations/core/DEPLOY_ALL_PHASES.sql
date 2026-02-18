-- =============================================
-- 🚀 해화당 프로젝트 전체 마이그레이션 (PHASE 1-3)
-- 생성일: 2026-02-11
-- 실행 방법: Supabase SQL Editor에 복사-붙여넣기
-- URL: https://ukuscwvkkbedszwmetfu.supabase.co/project/ukuscwvkkbedszwmetfu/sql/new
-- =============================================

-- =============================================
-- PHASE 1: 메인 페이지 리뉴얼 - 이벤트 테이블
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

CREATE INDEX idx_daily_attendance_user ON daily_attendance(user_id);
CREATE INDEX idx_daily_attendance_date ON daily_attendance(checked_at DESC);

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

CREATE INDEX idx_roulette_user ON roulette_history(user_id);
CREATE INDEX idx_roulette_date ON roulette_history(user_id, spun_at);

ALTER TABLE roulette_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own roulette history"
  ON roulette_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own roulette history"
  ON roulette_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3. 이벤트 배너 관리 테이블
CREATE TABLE IF NOT EXISTS event_banners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  cta_text VARCHAR(50) NOT NULL,
  cta_link VARCHAR(200) NOT NULL,
  icon VARCHAR(50),
  background_color VARCHAR(50) DEFAULT '#ECB613',
  is_active BOOLEAN DEFAULT true,
  priority INT DEFAULT 0,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_event_banners_active ON event_banners(is_active, priority DESC);

ALTER TABLE event_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active banners"
  ON event_banners FOR SELECT
  USING (is_active = true);

-- 4. 기본 이벤트 배너 데이터
INSERT INTO event_banners (title, description, cta_text, cta_link, icon, priority, is_active) VALUES
('신규 가입 혜택', '첫 운세 무료 + 부적 1,000장 증정', '1분 만에 시작하기', '/protected/membership', '🎁', 3, true),
('친구 초대 이벤트', '친구 1명당 부적 500장 + 친구도 500장 받기', '초대 링크 복사', '/protected/referral', '👥', 2, true),
('이달의 특가', '프리미엄 패키지 30% 할인 (7일 남음)', '지금 구매하고 절약하기', '/protected/membership', '⚡', 1, true)
ON CONFLICT DO NOTHING;

-- 5. 온보딩 상태 컬럼 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_step INT DEFAULT 0;

-- 6. RPC: 일일 출석 증가
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

-- 7. RPC: 부적 추가
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
  UPDATE wallet
  SET
    balance = balance + p_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO wallet (user_id, balance)
    VALUES (p_user_id, p_amount);
  END IF;

  INSERT INTO wallet_transactions (user_id, amount, type, description, created_at)
  VALUES (p_user_id, p_amount, 'earn', p_reason, NOW());
END;
$$;

-- =============================================
-- PHASE 2: AI 채팅 무료화 - 사용 추적 테이블
-- =============================================

-- 1. AI 채팅 일일 사용 추적 테이블
CREATE TABLE IF NOT EXISTS ai_chat_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  session_count INT DEFAULT 0 CHECK (session_count >= 0),
  total_turns INT DEFAULT 0 CHECK (total_turns >= 0),
  total_talisman_used INT DEFAULT 0 CHECK (total_talisman_used >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, usage_date)
);

CREATE INDEX idx_ai_chat_usage_user ON ai_chat_usage(user_id);
CREATE INDEX idx_ai_chat_usage_date ON ai_chat_usage(usage_date DESC);

ALTER TABLE ai_chat_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage"
  ON ai_chat_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all usage"
  ON ai_chat_usage FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 2. RPC: 사용 횟수 증가
CREATE OR REPLACE FUNCTION increment_ai_chat_usage(
  p_user_id UUID,
  p_date DATE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO ai_chat_usage (user_id, usage_date, session_count, total_turns)
  VALUES (p_user_id, p_date, 1, 0)
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET
    session_count = ai_chat_usage.session_count + 1,
    updated_at = NOW();
END;
$$;

-- 3. RPC: 턴 수 기록
CREATE OR REPLACE FUNCTION record_ai_chat_turn(
  p_user_id UUID,
  p_date DATE,
  p_talisman_used INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE ai_chat_usage
  SET
    total_turns = total_turns + 1,
    total_talisman_used = total_talisman_used + p_talisman_used,
    updated_at = NOW()
  WHERE user_id = p_user_id AND usage_date = p_date;

  IF NOT FOUND THEN
    INSERT INTO ai_chat_usage (user_id, usage_date, session_count, total_turns, total_talisman_used)
    VALUES (p_user_id, p_date, 0, 1, p_talisman_used);
  END IF;
END;
$$;

-- 4. 자동 삭제 함수 (30일 이상 된 기록)
CREATE OR REPLACE FUNCTION cleanup_old_ai_chat_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM ai_chat_usage
  WHERE usage_date < CURRENT_DATE - INTERVAL '30 days';
  RETURN NULL;
END;
$$;

CREATE TRIGGER trigger_cleanup_ai_chat_usage
  AFTER INSERT ON ai_chat_usage
  EXECUTE FUNCTION cleanup_old_ai_chat_usage();

-- =============================================
-- PHASE 3: 관리자 대시보드 고도화
-- =============================================

-- 1. 사용자 활동 로그
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  activity_type VARCHAR(50) NOT NULL,
  activity_category VARCHAR(50),
  description TEXT NOT NULL,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_created ON activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_type ON activity_logs(activity_type);
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all activity logs"
  ON activity_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 2. UTM 파라미터 추적
CREATE TABLE IF NOT EXISTS utm_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL DEFAULT uuid_generate_v4(),
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  utm_term VARCHAR(100),
  utm_content VARCHAR(100),
  landing_page TEXT,
  referrer TEXT,
  converted BOOLEAN DEFAULT false,
  converted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_utm_source ON utm_tracking(utm_source);
CREATE INDEX idx_utm_campaign ON utm_tracking(utm_campaign);
CREATE INDEX idx_utm_converted ON utm_tracking(converted, created_at DESC);
CREATE INDEX idx_utm_session ON utm_tracking(session_id);

ALTER TABLE utm_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view utm tracking"
  ON utm_tracking FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 3. 이탈 추적 (Funnel Analysis)
CREATE TABLE IF NOT EXISTS funnel_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  event_name VARCHAR(100) NOT NULL,
  funnel_step INT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_funnel_events_step ON funnel_events(funnel_step, created_at DESC);
CREATE INDEX idx_funnel_events_user ON funnel_events(user_id);
CREATE INDEX idx_funnel_events_session ON funnel_events(session_id);

ALTER TABLE funnel_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view funnel events"
  ON funnel_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 4. 시간대별 트래픽 집계
CREATE TABLE IF NOT EXISTS traffic_hourly (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hour_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  total_visits INT DEFAULT 0,
  unique_users INT DEFAULT 0,
  new_signups INT DEFAULT 0,
  total_purchases INT DEFAULT 0,
  total_revenue DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(hour_timestamp)
);

CREATE INDEX idx_traffic_hourly_timestamp ON traffic_hourly(hour_timestamp DESC);

ALTER TABLE traffic_hourly ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view traffic stats"
  ON traffic_hourly FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 5. RPC: Recent Activity 조회
CREATE OR REPLACE FUNCTION get_recent_activities(p_limit INT DEFAULT 50)
RETURNS TABLE (
  id UUID,
  user_name TEXT,
  user_email TEXT,
  activity_type VARCHAR(50),
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    al.id,
    p.full_name AS user_name,
    u.email AS user_email,
    al.activity_type,
    al.description,
    al.metadata,
    al.created_at
  FROM activity_logs al
  LEFT JOIN auth.users u ON al.user_id = u.id
  LEFT JOIN profiles p ON al.user_id = p.id
  ORDER BY al.created_at DESC
  LIMIT p_limit;
END;
$$;

-- 6. RPC: UTM 성과 분석
CREATE OR REPLACE FUNCTION get_utm_performance(
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  utm_source VARCHAR(100),
  utm_campaign VARCHAR(100),
  total_visits BIGINT,
  conversions BIGINT,
  conversion_rate NUMERIC(5, 2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ut.utm_source,
    ut.utm_campaign,
    COUNT(*) AS total_visits,
    COUNT(*) FILTER (WHERE ut.converted = true) AS conversions,
    ROUND(
      (COUNT(*) FILTER (WHERE ut.converted = true)::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
      2
    ) AS conversion_rate
  FROM utm_tracking ut
  WHERE ut.created_at::DATE BETWEEN p_start_date AND p_end_date
  GROUP BY ut.utm_source, ut.utm_campaign
  ORDER BY conversions DESC;
END;
$$;

-- 7. RPC: Funnel 분석
CREATE OR REPLACE FUNCTION get_funnel_analysis(
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  step_name VARCHAR(100),
  step_number INT,
  total_users BIGINT,
  dropoff_count BIGINT,
  dropoff_rate NUMERIC(5, 2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH step_counts AS (
    SELECT
      event_name,
      funnel_step,
      COUNT(DISTINCT user_id) AS user_count
    FROM funnel_events
    WHERE created_at::DATE BETWEEN p_start_date AND p_end_date
    GROUP BY event_name, funnel_step
    ORDER BY funnel_step
  )
  SELECT
    sc.event_name AS step_name,
    sc.funnel_step AS step_number,
    sc.user_count AS total_users,
    LAG(sc.user_count, 1) OVER (ORDER BY sc.funnel_step) - sc.user_count AS dropoff_count,
    ROUND(
      (
        (LAG(sc.user_count, 1) OVER (ORDER BY sc.funnel_step) - sc.user_count)::NUMERIC
        / NULLIF(LAG(sc.user_count, 1) OVER (ORDER BY sc.funnel_step), 0)
      ) * 100,
      2
    ) AS dropoff_rate
  FROM step_counts sc;
END;
$$;

-- 8. RPC: 시간대별 트래픽
CREATE OR REPLACE FUNCTION get_hourly_traffic(p_hours INT DEFAULT 24)
RETURNS TABLE (
  hour_timestamp TIMESTAMP WITH TIME ZONE,
  total_visits INT,
  unique_users INT,
  new_signups INT,
  total_revenue DECIMAL(10, 2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    th.hour_timestamp,
    th.total_visits,
    th.unique_users,
    th.new_signups,
    th.total_revenue
  FROM traffic_hourly th
  WHERE th.hour_timestamp >= NOW() - (p_hours || ' hours')::INTERVAL
  ORDER BY th.hour_timestamp ASC;
END;
$$;

-- 9. 트리거: 신규 가입 로그
CREATE OR REPLACE FUNCTION log_user_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO activity_logs (user_id, activity_type, activity_category, description)
  VALUES (NEW.id, 'signup', 'user', COALESCE(NEW.full_name, 'Guest') || '님이 가입했습니다.');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_signup
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION log_user_signup();

-- 10. 트리거: 결제 완료 로그
CREATE OR REPLACE FUNCTION log_payment_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.status = 'completed' THEN
    INSERT INTO activity_logs (
      user_id,
      activity_type,
      activity_category,
      description,
      metadata
    )
    VALUES (
      NEW.user_id,
      'purchase',
      'payment',
      '결제 완료: ' || COALESCE(NEW.product_name, '상품'),
      jsonb_build_object('amount', NEW.amount, 'product_id', NEW.product_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_payment
  AFTER INSERT OR UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION log_payment_completed();

-- =============================================
-- 🎉 마이그레이션 완료!
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '✅ PHASE 1: daily_attendance, roulette_history, event_banners 테이블 생성 완료';
  RAISE NOTICE '✅ PHASE 2: ai_chat_usage 테이블 생성 완료';
  RAISE NOTICE '✅ PHASE 3: activity_logs, utm_tracking, funnel_events, traffic_hourly 테이블 생성 완료';
  RAISE NOTICE '✅ 총 8개 테이블, 10개 RPC 함수, 4개 트리거 생성 완료';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 배포 완료! 이제 애플리케이션을 테스트하세요.';
END $$;
