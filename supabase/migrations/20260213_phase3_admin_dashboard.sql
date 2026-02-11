-- =============================================
-- PHASE 3: 관리자 대시보드 고도화 - 추적 및 분석 테이블
-- Created: 2026-02-11
-- Author: DB_MASTER
-- =============================================

-- 1. 사용자 활동 로그 (Recent Activity용)
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  activity_type VARCHAR(50) NOT NULL, -- 'signup', 'login', 'purchase', 'analysis', 'upgrade'
  activity_category VARCHAR(50), -- 'user', 'payment', 'content'
  description TEXT NOT NULL,
  metadata JSONB, -- 추가 정보 (금액, 상품명 등)
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_type ON activity_logs(activity_type);
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);

-- RLS 정책 (관리자만 조회 가능)
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

-- 2. UTM 파라미터 추적 테이블
CREATE TABLE IF NOT EXISTS utm_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL DEFAULT uuid_generate_v4(),
  utm_source VARCHAR(100), -- google, facebook, naver
  utm_medium VARCHAR(100), -- cpc, social, email
  utm_campaign VARCHAR(100), -- summer_sale_2026
  utm_term VARCHAR(100), -- 키워드
  utm_content VARCHAR(100), -- 광고 변형
  landing_page TEXT,
  referrer TEXT,
  converted BOOLEAN DEFAULT false, -- 유료 전환 여부
  converted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_utm_source ON utm_tracking(utm_source);
CREATE INDEX idx_utm_campaign ON utm_tracking(utm_campaign);
CREATE INDEX idx_utm_converted ON utm_tracking(converted, created_at DESC);
CREATE INDEX idx_utm_session ON utm_tracking(session_id);

-- RLS 정책
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

-- 3. 이탈 추적 테이블 (Funnel Analysis)
CREATE TABLE IF NOT EXISTS funnel_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  event_name VARCHAR(100) NOT NULL, -- 'landing', 'signup', 'first_analysis', 'purchase'
  funnel_step INT NOT NULL, -- 1, 2, 3, 4...
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_funnel_events_step ON funnel_events(funnel_step, created_at DESC);
CREATE INDEX idx_funnel_events_user ON funnel_events(user_id);
CREATE INDEX idx_funnel_events_session ON funnel_events(session_id);

-- RLS 정책
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

-- 4. 시간대별 트래픽 집계 테이블 (매시간 업데이트)
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

-- 인덱스
CREATE INDEX idx_traffic_hourly_timestamp ON traffic_hourly(hour_timestamp DESC);

-- RLS 정책
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

-- 5. RPC 함수: Recent Activity 조회 (최근 50건)
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

-- 6. RPC 함수: UTM 성과 분석
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

-- 7. RPC 함수: Funnel 분석 (단계별 이탈률)
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

-- 8. RPC 함수: 시간대별 트래픽 (최근 24시간)
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

-- 9. 트리거: 활동 로그 자동 기록 (profiles 테이블)
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

-- 트리거 연결 (profiles INSERT 시)
CREATE TRIGGER trigger_log_signup
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION log_user_signup();

-- 10. 트리거: 결제 완료 시 활동 로그 (payments 테이블)
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

-- 트리거 연결 (payments INSERT/UPDATE 시)
CREATE TRIGGER trigger_log_payment
  AFTER INSERT OR UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION log_payment_completed();

-- 11. 마이그레이션 완료 확인
DO $$
BEGIN
  RAISE NOTICE 'PHASE 3 마이그레이션 완료: activity_logs, utm_tracking, funnel_events, traffic_hourly 테이블 생성됨';
  RAISE NOTICE '- get_recent_activities RPC 함수 생성됨';
  RAISE NOTICE '- get_utm_performance RPC 함수 생성됨';
  RAISE NOTICE '- get_funnel_analysis RPC 함수 생성됨';
  RAISE NOTICE '- get_hourly_traffic RPC 함수 생성됨';
  RAISE NOTICE '- 자동 로깅 트리거 2개 생성됨';
END $$;
