-- ============================================================
-- Fix: Admin Dashboard — Gemini RPC + Traffic Auto-populate
-- 2026-02-17
-- 적용 범위:
--   1. gemini_token_bucket / gemini_api_logs 테이블 및 RPC 보장
--   2. traffic_hourly 자동 적재 트리거 (activity_logs, payments)
--   3. 기존 데이터 backfill
-- ============================================================

-- ============================================================
-- PART 1. Gemini 토큰 버킷
-- ============================================================

CREATE TABLE IF NOT EXISTS gemini_token_bucket (
  id               INTEGER PRIMARY KEY DEFAULT 1,
  model            VARCHAR(100) NOT NULL DEFAULT 'gemini-2.0-flash',
  tokens           INTEGER      NOT NULL DEFAULT 15,
  max_tokens       INTEGER      NOT NULL DEFAULT 15,
  window_seconds   INTEGER      NOT NULL DEFAULT 60,
  refill_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO gemini_token_bucket (id, model, tokens, max_tokens, window_seconds, refill_at)
VALUES (1, 'gemini-2.0-flash', 15, 15, 60, now())
ON CONFLICT (id) DO NOTHING;

ALTER TABLE gemini_token_bucket ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'gemini_token_bucket' AND policyname = 'service_role_only'
  ) THEN
    CREATE POLICY "service_role_only" ON gemini_token_bucket
      USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ============================================================
-- PART 2. Gemini API 로그 테이블
-- ============================================================

CREATE TABLE IF NOT EXISTS gemini_api_logs (
  id                UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID         REFERENCES profiles(id) ON DELETE SET NULL,
  model             VARCHAR(100) NOT NULL,
  action_type       VARCHAR(50)  NOT NULL,
  input_tokens      INTEGER,
  output_tokens     INTEGER,
  total_tokens      INTEGER,
  estimated_cost_usd NUMERIC(10, 6),
  latency_ms        INTEGER,
  status            VARCHAR(20)  NOT NULL DEFAULT 'success',
  error_code        VARCHAR(50),
  cached            BOOLEAN      NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gemini_api_logs_created_at
  ON gemini_api_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gemini_api_logs_model_date
  ON gemini_api_logs(model, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gemini_api_logs_action_type
  ON gemini_api_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_gemini_api_logs_status
  ON gemini_api_logs(status);

ALTER TABLE gemini_api_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'gemini_api_logs' AND policyname = 'admin_all_gemini_logs'
  ) THEN
    CREATE POLICY "admin_all_gemini_logs" ON gemini_api_logs
      FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'gemini_api_logs' AND policyname = 'user_own_gemini_logs'
  ) THEN
    CREATE POLICY "user_own_gemini_logs" ON gemini_api_logs
      FOR SELECT USING (user_id = auth.uid());
  END IF;
END $$;

-- ============================================================
-- PART 3. Gemini RPC 함수 (CREATE OR REPLACE — 멱등)
-- ============================================================

-- 3-1. 토큰 획득
CREATE OR REPLACE FUNCTION acquire_gemini_token()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  bucket RECORD;
  now_ts TIMESTAMPTZ := now();
BEGIN
  SELECT * INTO bucket FROM gemini_token_bucket WHERE id = 1 FOR UPDATE;

  IF now_ts >= bucket.refill_at THEN
    UPDATE gemini_token_bucket
    SET tokens    = bucket.max_tokens - 1,
        refill_at = now_ts + (bucket.window_seconds || ' seconds')::interval,
        updated_at = now_ts
    WHERE id = 1;
    RETURN jsonb_build_object(
      'allowed', true, 'remaining', bucket.max_tokens - 1, 'model', bucket.model
    );
  END IF;

  IF bucket.tokens > 0 THEN
    UPDATE gemini_token_bucket
    SET tokens     = tokens - 1,
        updated_at = now_ts
    WHERE id = 1;
    RETURN jsonb_build_object(
      'allowed', true, 'remaining', bucket.tokens - 1, 'model', bucket.model
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', false,
    'remaining', 0,
    'model', bucket.model,
    'retry_after_seconds',
    GREATEST(1, EXTRACT(EPOCH FROM (bucket.refill_at - now_ts))::integer)
  );
END;
$$;

-- 3-2. RPM 설정 변경 (어드민)
CREATE OR REPLACE FUNCTION update_gemini_rpm(new_rpm INTEGER, new_model TEXT DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF new_rpm < 1 OR new_rpm > 10000 THEN
    RAISE EXCEPTION 'RPM must be between 1 and 10000';
  END IF;

  UPDATE gemini_token_bucket
  SET max_tokens = new_rpm,
      tokens     = new_rpm,
      model      = COALESCE(new_model, model),
      refill_at  = now(),
      updated_at = now()
  WHERE id = 1;

  RETURN (SELECT row_to_json(t)::jsonb FROM gemini_token_bucket t WHERE id = 1);
END;
$$;

-- 3-3. 일별 모델별 사용량
CREATE OR REPLACE FUNCTION get_gemini_daily_stats(days_back INTEGER DEFAULT 30)
RETURNS TABLE(
  stat_date      DATE,
  model          TEXT,
  call_count     BIGINT,
  success_count  BIGINT,
  error_count    BIGINT,
  cached_count   BIGINT,
  total_tokens   BIGINT,
  total_cost_usd NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    DATE(created_at AT TIME ZONE 'Asia/Seoul') AS stat_date,
    model,
    COUNT(*)                                              AS call_count,
    COUNT(*) FILTER (WHERE status = 'success')            AS success_count,
    COUNT(*) FILTER (WHERE status != 'success')           AS error_count,
    COUNT(*) FILTER (WHERE cached = true)                 AS cached_count,
    COALESCE(SUM(total_tokens), 0)                        AS total_tokens,
    COALESCE(SUM(estimated_cost_usd), 0)                  AS total_cost_usd
  FROM gemini_api_logs
  WHERE created_at >= now() - (days_back || ' days')::interval
  GROUP BY DATE(created_at AT TIME ZONE 'Asia/Seoul'), model
  ORDER BY stat_date DESC, model;
$$;

-- 3-4. 기능별 사용량
CREATE OR REPLACE FUNCTION get_gemini_action_stats(days_back INTEGER DEFAULT 30)
RETURNS TABLE(
  action_type    TEXT,
  call_count     BIGINT,
  success_count  BIGINT,
  avg_tokens     NUMERIC,
  total_tokens   BIGINT,
  total_cost_usd NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    action_type,
    COUNT(*)                                                              AS call_count,
    COUNT(*) FILTER (WHERE status = 'success')                            AS success_count,
    COALESCE(AVG(total_tokens) FILTER (WHERE status = 'success'), 0)      AS avg_tokens,
    COALESCE(SUM(total_tokens), 0)                                        AS total_tokens,
    COALESCE(SUM(estimated_cost_usd), 0)                                  AS total_cost_usd
  FROM gemini_api_logs
  WHERE created_at >= now() - (days_back || ' days')::interval
  GROUP BY action_type
  ORDER BY call_count DESC;
$$;

-- 3-5. 오늘 요약 (서울 기준 자정)
CREATE OR REPLACE FUNCTION get_gemini_today_summary()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT jsonb_build_object(
    'total_calls',         COUNT(*),
    'success_calls',       COUNT(*) FILTER (WHERE status = 'success'),
    'error_calls',         COUNT(*) FILTER (WHERE status != 'success'),
    'rate_limited_calls',  COUNT(*) FILTER (WHERE status = 'rate_limited'),
    'cached_calls',        COUNT(*) FILTER (WHERE cached = true),
    'total_tokens',        COALESCE(SUM(total_tokens), 0),
    'total_input_tokens',  COALESCE(SUM(input_tokens), 0),
    'total_output_tokens', COALESCE(SUM(output_tokens), 0),
    'total_cost_usd',      COALESCE(SUM(estimated_cost_usd), 0),
    'avg_latency_ms',      COALESCE(AVG(latency_ms) FILTER (WHERE status = 'success'), 0)
  )
  FROM gemini_api_logs
  WHERE created_at >= (now() AT TIME ZONE 'Asia/Seoul')::date;
$$;

-- 3-6. 최근 로그 (어드민 테이블)
CREATE OR REPLACE FUNCTION get_gemini_recent_logs(log_limit INTEGER DEFAULT 50)
RETURNS TABLE(
  id                  UUID,
  user_id             UUID,
  model               TEXT,
  action_type         TEXT,
  input_tokens        INTEGER,
  output_tokens       INTEGER,
  total_tokens        INTEGER,
  estimated_cost_usd  NUMERIC,
  latency_ms          INTEGER,
  status              TEXT,
  error_code          TEXT,
  cached              BOOLEAN,
  created_at          TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    id, user_id, model, action_type,
    input_tokens, output_tokens, total_tokens,
    estimated_cost_usd, latency_ms,
    status, error_code, cached, created_at
  FROM gemini_api_logs
  ORDER BY created_at DESC
  LIMIT log_limit;
$$;

-- ============================================================
-- PART 4. traffic_hourly 자동 적재 (핵심 수정)
-- ============================================================
-- 기존 traffic_hourly는 테이블만 있고 데이터 삽입 로직이 없음.
-- activity_logs, payments INSERT 시 upsert로 자동 집계.

-- 4-1. 시간 단위 버킷 upsert 함수
CREATE OR REPLACE FUNCTION upsert_traffic_hourly(
  p_hour        TIMESTAMPTZ,
  p_visits      INT DEFAULT 0,
  p_signups     INT DEFAULT 0,
  p_purchases   INT DEFAULT 0,
  p_revenue     DECIMAL DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO traffic_hourly (
    hour_timestamp,
    total_visits,
    new_signups,
    total_purchases,
    total_revenue
  )
  VALUES (
    date_trunc('hour', p_hour),
    p_visits,
    p_signups,
    p_purchases,
    p_revenue
  )
  ON CONFLICT (hour_timestamp) DO UPDATE SET
    total_visits    = traffic_hourly.total_visits    + EXCLUDED.total_visits,
    new_signups     = traffic_hourly.new_signups     + EXCLUDED.new_signups,
    total_purchases = traffic_hourly.total_purchases + EXCLUDED.total_purchases,
    total_revenue   = traffic_hourly.total_revenue   + EXCLUDED.total_revenue;
END;
$$;

-- 4-2. activity_logs → traffic_hourly 트리거 함수
CREATE OR REPLACE FUNCTION trigger_activity_to_traffic()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_signups   INT := 0;
  v_purchases INT := 0;
BEGIN
  IF NEW.activity_type = 'signup' THEN
    v_signups := 1;
  END IF;
  IF NEW.activity_type = 'purchase' THEN
    v_purchases := 1;
  END IF;

  PERFORM upsert_traffic_hourly(
    p_hour      := NEW.created_at,
    p_visits    := 1,
    p_signups   := v_signups,
    p_purchases := v_purchases
  );
  RETURN NEW;
END;
$$;

-- 트리거 연결 (이미 있으면 교체)
DROP TRIGGER IF EXISTS trigger_activity_logs_to_traffic ON activity_logs;
CREATE TRIGGER trigger_activity_logs_to_traffic
  AFTER INSERT ON activity_logs
  FOR EACH ROW
  EXECUTE FUNCTION trigger_activity_to_traffic();

-- 4-3. payments → traffic_hourly 수익 트리거
CREATE OR REPLACE FUNCTION trigger_payment_to_traffic()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 신규 완료 결제만 집계
  IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR OLD.status != 'completed') THEN
    PERFORM upsert_traffic_hourly(
      p_hour      := NEW.created_at,
      p_purchases := 1,
      p_revenue   := COALESCE(NEW.amount, 0)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_payments_to_traffic ON payments;
CREATE TRIGGER trigger_payments_to_traffic
  AFTER INSERT OR UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_payment_to_traffic();

-- ============================================================
-- PART 5. 기존 데이터 Backfill (activity_logs → traffic_hourly)
-- ============================================================
-- 이미 쌓인 activity_logs 데이터를 traffic_hourly에 한 번 반영
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT
      date_trunc('hour', created_at)            AS hour_ts,
      COUNT(*)                                  AS visits,
      COUNT(*) FILTER (WHERE activity_type = 'signup')   AS signups,
      COUNT(*) FILTER (WHERE activity_type = 'purchase') AS purchases
    FROM activity_logs
    GROUP BY date_trunc('hour', created_at)
  LOOP
    PERFORM upsert_traffic_hourly(
      p_hour      := r.hour_ts,
      p_visits    := r.visits::INT,
      p_signups   := r.signups::INT,
      p_purchases := r.purchases::INT
    );
  END LOOP;

  -- payments 수익 backfill
  FOR r IN
    SELECT
      date_trunc('hour', created_at) AS hour_ts,
      COUNT(*)                       AS purchases,
      COALESCE(SUM(amount), 0)       AS revenue
    FROM payments
    WHERE status = 'completed'
    GROUP BY date_trunc('hour', created_at)
  LOOP
    PERFORM upsert_traffic_hourly(
      p_hour      := r.hour_ts,
      p_purchases := r.purchases::INT,
      p_revenue   := r.revenue
    );
  END LOOP;

  RAISE NOTICE 'Backfill 완료: traffic_hourly 기존 데이터 반영됨';
END $$;

-- ============================================================
-- PART 6. get_hourly_traffic RPC 재정의
--   — traffic_hourly 데이터가 없으면 activity_logs에서 실시간 집계
-- ============================================================
CREATE OR REPLACE FUNCTION get_hourly_traffic(p_hours INT DEFAULT 24)
RETURNS TABLE (
  hour_timestamp  TIMESTAMPTZ,
  total_visits    INT,
  unique_users    INT,
  new_signups     INT,
  total_revenue   DECIMAL(10, 2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- traffic_hourly에 최근 데이터가 있으면 그것을 사용
  IF EXISTS (
    SELECT 1 FROM traffic_hourly
    WHERE hour_timestamp >= NOW() - (p_hours || ' hours')::INTERVAL
  ) THEN
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
  ELSE
    -- Fallback: activity_logs에서 실시간 집계
    RETURN QUERY
    SELECT
      date_trunc('hour', al.created_at)                                    AS hour_timestamp,
      COUNT(*)::INT                                                         AS total_visits,
      COUNT(DISTINCT al.user_id)::INT                                       AS unique_users,
      COUNT(*) FILTER (WHERE al.activity_type = 'signup')::INT             AS new_signups,
      COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'completed'), 0)     AS total_revenue
    FROM activity_logs al
    LEFT JOIN payments p
      ON p.user_id = al.user_id
      AND date_trunc('hour', p.created_at) = date_trunc('hour', al.created_at)
    WHERE al.created_at >= NOW() - (p_hours || ' hours')::INTERVAL
    GROUP BY date_trunc('hour', al.created_at)
    ORDER BY hour_timestamp ASC;
  END IF;
END;
$$;

-- ============================================================
-- PART 7. system_settings 환율 키 (없으면 추가)
-- ============================================================
INSERT INTO system_settings (key, value, description)
VALUES ('usd_krw_rate', '1380', '달러-원화 환율 (수동 업데이트)')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 완료 확인
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE '=== 20260217_fix_admin_dashboard 마이그레이션 완료 ===';
  RAISE NOTICE '[GEMINI] gemini_token_bucket, gemini_api_logs 테이블 보장';
  RAISE NOTICE '[GEMINI] acquire_gemini_token, update_gemini_rpm RPC 생성';
  RAISE NOTICE '[GEMINI] get_gemini_daily_stats, get_gemini_action_stats RPC 생성';
  RAISE NOTICE '[GEMINI] get_gemini_today_summary, get_gemini_recent_logs RPC 생성';
  RAISE NOTICE '[TRAFFIC] upsert_traffic_hourly 함수 생성';
  RAISE NOTICE '[TRAFFIC] trigger_activity_logs_to_traffic 트리거 연결';
  RAISE NOTICE '[TRAFFIC] trigger_payments_to_traffic 트리거 연결';
  RAISE NOTICE '[TRAFFIC] 기존 데이터 backfill 완료';
  RAISE NOTICE '[TRAFFIC] get_hourly_traffic RPC fallback 로직 추가';
END $$;
