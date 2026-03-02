-- 해화지기 채팅 세션 및 메시지 영속화
-- chat_sessions: 한 대화 세션 (새 대화 시작 = 새 세션)
-- chat_messages: 각 세션의 메시지들

CREATE TABLE IF NOT EXISTS chat_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  family_member_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
  title       TEXT,                         -- 세션 첫 메시지 요약 (첫 user 메시지 앞 20자)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at    TIMESTAMPTZ                   -- 명시적 종료 시각 (새 대화 시작 클릭 시)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS chat_sessions_user_id_idx ON chat_sessions(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS chat_messages_session_id_idx ON chat_messages(session_id, created_at ASC);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_chat_session_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE chat_sessions SET updated_at = now() WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chat_messages_update_session ON chat_messages;
CREATE TRIGGER chat_messages_update_session
  AFTER INSERT ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION update_chat_session_timestamp();

-- RLS
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- chat_sessions RLS
CREATE POLICY "users can read own sessions"
  ON chat_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users can insert own sessions"
  ON chat_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users can update own sessions"
  ON chat_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "users can delete own sessions"
  ON chat_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- chat_messages RLS (세션 소유자만)
CREATE POLICY "users can read own messages"
  ON chat_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM chat_sessions s
    WHERE s.id = chat_messages.session_id AND s.user_id = auth.uid()
  ));

CREATE POLICY "users can insert own messages"
  ON chat_messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM chat_sessions s
    WHERE s.id = chat_messages.session_id AND s.user_id = auth.uid()
  ));
