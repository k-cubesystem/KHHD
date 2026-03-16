-- ============================================================
-- Rate Limit: Supabase DB 기반 서버리스 rate limiter
--
-- Vercel 서버리스 인스턴스 간 공유되는 sliding window counter.
-- in-memory Map 방식은 인스턴스마다 독립이라 무효하므로 DB로 전환.
-- ============================================================

-- 1. 테이블 생성
CREATE TABLE IF NOT EXISTS rate_limit_entries (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  key        TEXT NOT NULL,
  count      INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 유니크 제약: 동일 key에 대해 하나의 활성 윈도우만 유지
CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limit_entries_key
  ON rate_limit_entries (key);

-- 만료된 row 빠른 정리용
CREATE INDEX IF NOT EXISTS idx_rate_limit_entries_window_start
  ON rate_limit_entries (window_start);

-- 2. RLS 비활성 (service_role로만 접근)
ALTER TABLE rate_limit_entries ENABLE ROW LEVEL SECURITY;

-- service_role은 RLS bypass이므로 별도 정책 불필요.
-- authenticated/anon 접근 차단 (정책 없음 = 거부)

-- 3. 원자적 check-and-increment RPC
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key TEXT,
  p_window_seconds INTEGER,
  p_max_requests INTEGER
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_window_start TIMESTAMPTZ;
  v_now TIMESTAMPTZ := now();
  v_window_boundary TIMESTAMPTZ := v_now - (p_window_seconds || ' seconds')::INTERVAL;
  v_reset_at TIMESTAMPTZ;
  v_allowed BOOLEAN;
BEGIN
  -- 만료된 엔트리가 있으면 삭제하고 새로 시작
  DELETE FROM rate_limit_entries
  WHERE key = p_key
    AND window_start < v_window_boundary;

  -- UPSERT: 존재하면 count+1, 없으면 새로 생성
  INSERT INTO rate_limit_entries (key, count, window_start)
  VALUES (p_key, 1, v_now)
  ON CONFLICT (key) DO UPDATE
    SET count = rate_limit_entries.count + 1
  RETURNING count, window_start
  INTO v_count, v_window_start;

  v_reset_at := v_window_start + (p_window_seconds || ' seconds')::INTERVAL;
  v_allowed := v_count <= p_max_requests;

  RETURN json_build_object(
    'allowed', v_allowed,
    'current_count', v_count,
    'max_requests', p_max_requests,
    'reset_at', v_reset_at
  );
END;
$$;

-- 4. 만료 엔트리 정리 함수 (pg_cron 등으로 주기 호출 가능)
CREATE OR REPLACE FUNCTION cleanup_rate_limit_entries()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM rate_limit_entries
  WHERE window_start < now() - INTERVAL '10 minutes'
  RETURNING 1 INTO v_deleted;

  -- 실제 삭제 건수 반환
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- 5. 권한: service_role만 (authenticated/anon 접근 불가)
REVOKE ALL ON FUNCTION check_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION check_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;

REVOKE ALL ON FUNCTION cleanup_rate_limit_entries() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cleanup_rate_limit_entries() TO service_role;

-- 6. 테이블 권한
REVOKE ALL ON rate_limit_entries FROM PUBLIC;
GRANT ALL ON rate_limit_entries TO service_role;

-- ============================================================
-- COMMENT
-- ============================================================
COMMENT ON TABLE rate_limit_entries IS 'Serverless rate limiter: sliding window counter shared across all Vercel instances';
COMMENT ON FUNCTION check_rate_limit IS 'Atomic check-and-increment for rate limiting. Returns JSON with allowed, current_count, max_requests, reset_at';
COMMENT ON FUNCTION cleanup_rate_limit_entries IS 'Cleanup expired rate limit entries (10min+). Schedule via pg_cron or call manually';
