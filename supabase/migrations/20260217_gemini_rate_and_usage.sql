-- ============================================================
-- Gemini API Rate Limiter + Usage Tracking
-- 2026-02-17
-- ============================================================

-- ============================================================
-- 1. gemini_token_bucket: 분산 토큰 버킷 (단일 행, FOR UPDATE 잠금)
-- ============================================================
CREATE TABLE IF NOT EXISTS gemini_token_bucket (
  id INTEGER PRIMARY KEY DEFAULT 1,
  model VARCHAR(100) NOT NULL DEFAULT 'gemini-2.0-flash',
  tokens INTEGER NOT NULL DEFAULT 15,
  max_tokens INTEGER NOT NULL DEFAULT 15,
  window_seconds INTEGER NOT NULL DEFAULT 60,
  refill_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- 초기 행 삽입 (없으면)
INSERT INTO gemini_token_bucket (id, model, tokens, max_tokens, window_seconds, refill_at)
VALUES (1, 'gemini-2.0-flash', 15, 15, 60, now())
ON CONFLICT (id) DO NOTHING;

-- RLS: service_role만 직접 접근 (RPC 함수를 통해서만 사용)
ALTER TABLE gemini_token_bucket ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON gemini_token_bucket
  USING (auth.role() = 'service_role');

-- ============================================================
-- 2. RPC: acquire_gemini_token
--    원자적 토큰 획득. 토큰 있으면 소비 후 allowed:true 반환
--    토큰 없으면 allowed:false + retry_after_seconds 반환
-- ============================================================
CREATE OR REPLACE FUNCTION acquire_gemini_token()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  bucket RECORD;
  now_ts TIMESTAMPTZ := now();
BEGIN
  -- FOR UPDATE로 단일 행 잠금 (크로스 인스턴스 원자성 보장)
  SELECT * INTO bucket FROM gemini_token_bucket WHERE id = 1 FOR UPDATE;

  -- 윈도우가 지났으면 리필
  IF now_ts >= bucket.refill_at THEN
    UPDATE gemini_token_bucket
    SET tokens = bucket.max_tokens - 1,
        refill_at = now_ts + (bucket.window_seconds || ' seconds')::interval,
        updated_at = now_ts
    WHERE id = 1;
    RETURN jsonb_build_object(
      'allowed', true,
      'remaining', bucket.max_tokens - 1,
      'model', bucket.model
    );
  END IF;

  -- 토큰 있음 → 소비
  IF bucket.tokens > 0 THEN
    UPDATE gemini_token_bucket
    SET tokens = tokens - 1,
        updated_at = now_ts
    WHERE id = 1;
    RETURN jsonb_build_object(
      'allowed', true,
      'remaining', bucket.tokens - 1,
      'model', bucket.model
    );
  END IF;

  -- 토큰 없음 → 거부
  RETURN jsonb_build_object(
    'allowed', false,
    'remaining', 0,
    'model', bucket.model,
    'retry_after_seconds', GREATEST(
      1,
      EXTRACT(EPOCH FROM (bucket.refill_at - now_ts))::integer
    )
  );
END;
$$;

-- ============================================================
-- 3. RPC: update_gemini_rpm (admin에서 호출)
-- ============================================================
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
  SET
    max_tokens = new_rpm,
    tokens = new_rpm,  -- 즉시 리필
    model = COALESCE(new_model, model),
    refill_at = now(),
    updated_at = now()
  WHERE id = 1;

  RETURN (SELECT row_to_json(t)::jsonb FROM gemini_token_bucket t WHERE id = 1);
END;
$$;

-- ============================================================
-- 4. gemini_api_logs: API 호출 사용량 기록
-- ============================================================
CREATE TABLE IF NOT EXISTS gemini_api_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  model VARCHAR(100) NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  estimated_cost_usd NUMERIC(10, 6),
  latency_ms INTEGER,
  status VARCHAR(20) NOT NULL DEFAULT 'success',
  error_code VARCHAR(50),
  cached BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gemini_api_logs_created_at
  ON gemini_api_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gemini_api_logs_model_date
  ON gemini_api_logs(model, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gemini_api_logs_action_type
  ON gemini_api_logs(action_type);

CREATE INDEX IF NOT EXISTS idx_gemini_api_logs_user_id
  ON gemini_api_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_gemini_api_logs_status
  ON gemini_api_logs(status);

-- RLS
ALTER TABLE gemini_api_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_gemini_logs" ON gemini_api_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "user_own_gemini_logs" ON gemini_api_logs
  FOR SELECT USING (user_id = auth.uid());

-- ============================================================
-- 5. RPC 집계 함수들 (admin 대시보드용)
-- ============================================================

-- 일별 모델별 사용량
CREATE OR REPLACE FUNCTION get_gemini_daily_stats(days_back INTEGER DEFAULT 30)
RETURNS TABLE(
  stat_date DATE,
  model TEXT,
  call_count BIGINT,
  success_count BIGINT,
  error_count BIGINT,
  cached_count BIGINT,
  total_tokens BIGINT,
  total_cost_usd NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    DATE(created_at AT TIME ZONE 'Asia/Seoul') AS stat_date,
    model,
    COUNT(*) AS call_count,
    COUNT(*) FILTER (WHERE status = 'success') AS success_count,
    COUNT(*) FILTER (WHERE status != 'success') AS error_count,
    COUNT(*) FILTER (WHERE cached = true) AS cached_count,
    COALESCE(SUM(total_tokens), 0) AS total_tokens,
    COALESCE(SUM(estimated_cost_usd), 0) AS total_cost_usd
  FROM gemini_api_logs
  WHERE created_at >= now() - (days_back || ' days')::interval
  GROUP BY DATE(created_at AT TIME ZONE 'Asia/Seoul'), model
  ORDER BY stat_date DESC, model;
$$;

-- 기능별 사용량
CREATE OR REPLACE FUNCTION get_gemini_action_stats(days_back INTEGER DEFAULT 30)
RETURNS TABLE(
  action_type TEXT,
  call_count BIGINT,
  success_count BIGINT,
  avg_tokens NUMERIC,
  total_tokens BIGINT,
  total_cost_usd NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    action_type,
    COUNT(*) AS call_count,
    COUNT(*) FILTER (WHERE status = 'success') AS success_count,
    COALESCE(AVG(total_tokens) FILTER (WHERE status = 'success'), 0) AS avg_tokens,
    COALESCE(SUM(total_tokens), 0) AS total_tokens,
    COALESCE(SUM(estimated_cost_usd), 0) AS total_cost_usd
  FROM gemini_api_logs
  WHERE created_at >= now() - (days_back || ' days')::interval
  GROUP BY action_type
  ORDER BY call_count DESC;
$$;

-- 오늘 요약
CREATE OR REPLACE FUNCTION get_gemini_today_summary()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT jsonb_build_object(
    'total_calls', COUNT(*),
    'success_calls', COUNT(*) FILTER (WHERE status = 'success'),
    'error_calls', COUNT(*) FILTER (WHERE status != 'success'),
    'rate_limited_calls', COUNT(*) FILTER (WHERE status = 'rate_limited'),
    'cached_calls', COUNT(*) FILTER (WHERE cached = true),
    'total_tokens', COALESCE(SUM(total_tokens), 0),
    'total_input_tokens', COALESCE(SUM(input_tokens), 0),
    'total_output_tokens', COALESCE(SUM(output_tokens), 0),
    'total_cost_usd', COALESCE(SUM(estimated_cost_usd), 0),
    'avg_latency_ms', COALESCE(AVG(latency_ms) FILTER (WHERE status = 'success'), 0)
  )
  FROM gemini_api_logs
  WHERE created_at >= (now() AT TIME ZONE 'Asia/Seoul')::date;
$$;

-- 최근 로그 (admin 테이블용)
CREATE OR REPLACE FUNCTION get_gemini_recent_logs(log_limit INTEGER DEFAULT 50)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  model TEXT,
  action_type TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  estimated_cost_usd NUMERIC,
  latency_ms INTEGER,
  status TEXT,
  error_code TEXT,
  cached BOOLEAN,
  created_at TIMESTAMPTZ
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
-- 6. system_settings에 환율 키 추가 (없으면)
-- ============================================================
INSERT INTO system_settings (key, value, description)
VALUES ('usd_krw_rate', '1380', '달러-원화 환율 (수동 업데이트)')
ON CONFLICT (key) DO NOTHING;
