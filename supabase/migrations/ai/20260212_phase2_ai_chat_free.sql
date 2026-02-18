-- =============================================
-- PHASE 2: AI 채팅 무료화 - 사용 추적 테이블
-- Created: 2026-02-11
-- Author: DB_MASTER
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

-- 인덱스
CREATE INDEX idx_ai_chat_usage_user ON ai_chat_usage(user_id);
CREATE INDEX idx_ai_chat_usage_date ON ai_chat_usage(usage_date DESC);

-- RLS 정책
ALTER TABLE ai_chat_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage"
  ON ai_chat_usage FOR SELECT
  USING (auth.uid() = user_id);

-- 관리자는 모든 사용 기록 조회 가능
CREATE POLICY "Admins can view all usage"
  ON ai_chat_usage FOR SELECT
  USING (is_admin());

-- 2. RPC 함수: 사용 횟수 증가
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

-- 3. RPC 함수: 턴 수 기록
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

-- 트리거 생성 (매일 자정에 실행되도록 설정 필요)
CREATE TRIGGER trigger_cleanup_ai_chat_usage
  AFTER INSERT ON ai_chat_usage
  EXECUTE FUNCTION cleanup_old_ai_chat_usage();

-- 5. 마이그레이션 완료 확인
DO $$
BEGIN
  RAISE NOTICE 'PHASE 2 마이그레이션 완료: ai_chat_usage 테이블 생성됨';
  RAISE NOTICE '- increment_ai_chat_usage RPC 함수 생성됨';
  RAISE NOTICE '- record_ai_chat_turn RPC 함수 생성됨';
END $$;
