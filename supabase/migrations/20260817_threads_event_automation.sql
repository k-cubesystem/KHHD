-- Threads 무료 사주 이벤트 자동화 v1 (PLAN-threads-event-automation-v1.md §2.2)
--
-- 왜 새 테이블인가: event_banners 는 노출용이라 참여·추첨 개념이 없고, analysis_history 는
-- user_id 기반이라 비로그인 응모자를 담을 수 없다. 이벤트 결과는 event_winners 에 두고
-- 당첨자가 가입하면 converted_user_id 로 연결해 전환을 잰다.
--
-- 권한 모델(리포 관례): 서버 액션은 role 검사를 안 하고 RLS 의 is_admin() 이 최종 방어다.
-- 그래서 모든 신규 테이블에 admin 정책을 반드시 함께 쓴다.
-- 유일한 예외 = event_entries 의 anon INSERT(응모 폼). 이 리포에 anon write 전례가 없으므로
-- SELECT/UPDATE/DELETE 는 열지 않고, INSERT 도 WITH CHECK 로 «열린 라운드에만·상태 기본값만» 제한한다.

-- ────────────────────────────────────────────────────────────────
-- 1. 라운드 (이벤트 회차)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_rounds (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT NOT NULL UNIQUE,                       -- /event/{slug}
  title         TEXT NOT NULL,                              -- «이번 주 궁합 5명»
  topic         TEXT NOT NULL,                              -- saju | compatibility | wealth | career | love | family
  description   TEXT,
  opens_at      TIMESTAMPTZ NOT NULL,
  closes_at     TIMESTAMPTZ NOT NULL,
  winner_count  INTEGER NOT NULL DEFAULT 5 CHECK (winner_count BETWEEN 1 AND 100),
  status        TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft','open','closed','drawn','published','cancelled')),
  draw_seed     TEXT,                                       -- 추첨 재현용(공개)
  drawn_at      TIMESTAMPTZ,
  threads_post_id TEXT,                                     -- 오픈 글 media_id
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT event_rounds_window CHECK (closes_at > opens_at)
);
CREATE INDEX IF NOT EXISTS idx_event_rounds_status ON event_rounds (status, closes_at);

-- ────────────────────────────────────────────────────────────────
-- 2. 응모 (비로그인 허용 — 개인정보는 여기서만 받는다. 스레드 댓글로 받지 않는다)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_entries (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id         UUID NOT NULL REFERENCES event_rounds(id) ON DELETE CASCADE,
  threads_username TEXT NOT NULL,                           -- @ 없이 소문자 정규화
  contact          TEXT,                                    -- 선택(이메일/휴대폰) — 결과 개별 안내용
  birth_date       DATE NOT NULL,
  birth_time       TIME,                                    -- 모르면 NULL(자시 기본)
  gender           TEXT NOT NULL CHECK (gender IN ('male','female','other')),
  question         TEXT NOT NULL CHECK (char_length(question) BETWEEN 10 AND 500),
  consent_public   BOOLEAN NOT NULL DEFAULT false,          -- 결과 공개 동의(마스킹)
  consent_privacy_at TIMESTAMPTZ NOT NULL DEFAULT now(),    -- 개인정보 수집 동의 시각
  ip_hash          TEXT,
  ua_hash          TEXT,
  utm              JSONB,
  user_id          UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- 로그인 상태면 채움
  status           TEXT NOT NULL DEFAULT 'received'
                   CHECK (status IN ('received','duplicate','rejected','selected','purged')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- 라운드당 스레드 아이디 1회
  CONSTRAINT event_entries_dedupe UNIQUE (round_id, threads_username)
);
CREATE INDEX IF NOT EXISTS idx_event_entries_round ON event_entries (round_id, status);

-- ────────────────────────────────────────────────────────────────
-- 3. 선정 (당첨자만 «진행»되는 단계 — 초안 생성 → 승인 → 발송)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_winners (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id          UUID NOT NULL REFERENCES event_rounds(id) ON DELETE CASCADE,
  entry_id          UUID NOT NULL UNIQUE REFERENCES event_entries(id) ON DELETE CASCADE,
  rank              INTEGER NOT NULL,
  draft_reading     TEXT,                                   -- AI 초안(간이 풀이)
  draft_json        JSONB,                                  -- 명식·요약 구조화
  draft_status      TEXT NOT NULL DEFAULT 'pending'
                    CHECK (draft_status IN ('pending','generating','ready','approved','rejected','failed')),
  approved_by       UUID REFERENCES auth.users(id),
  approved_at       TIMESTAMPTZ,
  card_token        TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(12), 'hex'),  -- /api/og/event/{token}
  published_post_id TEXT,                                   -- 결과 발표 스레드 media_id
  published_at      TIMESTAMPTZ,
  converted_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- 가입 전환 추적
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_event_winners_round ON event_winners (round_id, draft_status);

-- ────────────────────────────────────────────────────────────────
-- 4. Threads — 내가 발행한 글
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS threads_posts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id      TEXT UNIQUE,                                -- 발행 후 채움
  container_id  TEXT,
  kind          TEXT NOT NULL CHECK (kind IN ('campaign','content','announce','result','reply')),
  round_id      UUID REFERENCES event_rounds(id) ON DELETE SET NULL,
  body          TEXT NOT NULL CHECK (char_length(body) <= 500),  -- Threads 텍스트 상한
  media_type    TEXT NOT NULL DEFAULT 'TEXT' CHECK (media_type IN ('TEXT','IMAGE','VIDEO','CAROUSEL')),
  media_url     TEXT,                                       -- 공개 URL(Threads 는 URL 로만 받는다)
  reply_to_id   TEXT,                                       -- 답글이면 대상 media_id
  scheduled_at  TIMESTAMPTZ,
  published_at  TIMESTAMPTZ,
  status        TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft','scheduled','publishing','published','failed','deleted')),
  error         TEXT,
  permalink     TEXT,
  insights      JSONB,                                      -- {views,likes,replies,reposts,quotes,shares}
  insights_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_threads_posts_sched ON threads_posts (status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_threads_posts_pub ON threads_posts (published_at DESC) WHERE media_id IS NOT NULL;

-- ────────────────────────────────────────────────────────────────
-- 5. Threads — 수집한 댓글 (내 글에 달린 것만 — API 범위가 그렇다)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS threads_replies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reply_id        TEXT NOT NULL UNIQUE,                     -- Threads reply media_id
  post_id         UUID NOT NULL REFERENCES threads_posts(id) ON DELETE CASCADE,
  username        TEXT,                                     -- 비공개 계정은 NULL 로 온다
  text            TEXT,
  replied_at      TIMESTAMPTZ,
  classification  TEXT NOT NULL DEFAULT 'unclassified'
                  CHECK (classification IN ('unclassified','apply','question','chat','spam','other')),
  classified_by   TEXT CHECK (classified_by IN ('rule','ai','human')),
  hide_status     TEXT,
  our_reply_id    TEXT,                                     -- 우리가 단 답글 media_id
  handled_at      TIMESTAMPTZ,
  raw             JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_threads_replies_post ON threads_replies (post_id, classification);
CREATE INDEX IF NOT EXISTS idx_threads_replies_unhandled ON threads_replies (classification) WHERE handled_at IS NULL;

-- ────────────────────────────────────────────────────────────────
-- 6. Threads — 답글 승인 큐 (반자동 경계 — 사람이 «발송»을 누른다)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS threads_reply_queue (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reply_to       UUID NOT NULL REFERENCES threads_replies(id) ON DELETE CASCADE,
  draft_text     TEXT NOT NULL CHECK (char_length(draft_text) <= 500),
  variant_key    TEXT,                                      -- 문안 로테이션 키(반복 콘텐츠 회피 추적)
  status         TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','approved','sent','rejected','failed')),
  approved_by    UUID REFERENCES auth.users(id),
  approved_at    TIMESTAMPTZ,
  sent_reply_id  TEXT,
  sent_at        TIMESTAMPTZ,
  error          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_threads_reply_queue_status ON threads_reply_queue (status, created_at);

-- ────────────────────────────────────────────────────────────────
-- 7. Threads — 장기 토큰 (1행 운용. 60일 만료·24h 후 갱신 가능)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS threads_tokens (
  id               INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  threads_user_id  TEXT NOT NULL,
  username         TEXT,
  access_token     TEXT NOT NULL,                           -- service_role 만 읽는다(RLS 로 봉쇄)
  expires_at       TIMESTAMPTZ NOT NULL,
  refreshed_at     TIMESTAMPTZ,
  scopes           TEXT[],
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────────────
-- 8. Threads — API 호출 로그 (레이트리밋 카운트·장애 진단)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS threads_api_logs (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  op          TEXT NOT NULL,                                -- publish | reply | replies | insights | refresh
  ok          BOOLEAN NOT NULL,
  http_status INTEGER,
  detail      JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_threads_api_logs_time ON threads_api_logs (created_at DESC);

-- ────────────────────────────────────────────────────────────────
-- 9. 킬스위치 (system_settings 관례)
-- ────────────────────────────────────────────────────────────────
INSERT INTO system_settings (key, value, description)
VALUES ('threads_automation_enabled', 'false', 'Threads 자동 발행·댓글 수집·추첨 크론 마스터 스위치')
ON CONFLICT (key) DO NOTHING;

-- ────────────────────────────────────────────────────────────────
-- 10. RLS
-- ────────────────────────────────────────────────────────────────
ALTER TABLE event_rounds        ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_entries       ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_winners       ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads_posts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads_replies     ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads_reply_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads_tokens      ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads_api_logs    ENABLE ROW LEVEL SECURITY;

-- 관리자 전권 (서버 액션은 role 검사를 안 하므로 이것이 최종 방어)
CREATE POLICY event_rounds_admin        ON event_rounds        FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY event_entries_admin       ON event_entries       FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY event_winners_admin       ON event_winners       FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY threads_posts_admin       ON threads_posts       FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY threads_replies_admin     ON threads_replies     FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY threads_reply_queue_admin ON threads_reply_queue FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY threads_api_logs_admin    ON threads_api_logs    FOR SELECT USING (public.is_admin());
-- threads_tokens: 어떤 역할에게도 정책을 열지 않는다 → service_role(RLS 우회)만 접근. 관리자도 화면에서 토큰 원문을 못 본다.

-- 공개 읽기: 열린 라운드의 «안내 정보»만 (응모 폼이 라운드 제목·주제·마감을 보여줘야 한다)
CREATE POLICY event_rounds_public_read ON event_rounds
  FOR SELECT USING (status IN ('open','closed','drawn','published'));

-- 응모: anon/authenticated INSERT 만. 열린 라운드·마감 전·기본 상태로만 넣을 수 있다.
CREATE POLICY event_entries_public_insert ON event_entries
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    status = 'received'
    AND EXISTS (
      SELECT 1 FROM event_rounds r
      WHERE r.id = round_id AND r.status = 'open' AND now() BETWEEN r.opens_at AND r.closes_at
    )
  );

-- 공개 결과 카드: 승인·발행된 당첨자 중 «공개 동의»한 것만, 그것도 카드 라우트가 service_role 로 읽으므로 정책은 열지 않는다.

-- ────────────────────────────────────────────────────────────────
-- 11. updated_at 트리거 (public 에 update_updated_at_column() 이 없다 — 메모리 확인, 자체 정의)
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at_generic()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_event_rounds_updated ON event_rounds;
CREATE TRIGGER trg_event_rounds_updated BEFORE UPDATE ON event_rounds FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_generic();
DROP TRIGGER IF EXISTS trg_event_winners_updated ON event_winners;
CREATE TRIGGER trg_event_winners_updated BEFORE UPDATE ON event_winners FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_generic();
DROP TRIGGER IF EXISTS trg_threads_posts_updated ON threads_posts;
CREATE TRIGGER trg_threads_posts_updated BEFORE UPDATE ON threads_posts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_generic();

-- ────────────────────────────────────────────────────────────────
-- 12. 개인정보 파기 — 라운드 종료 90일 후 생년월일시·연락처·해시 제거(행은 통계용으로 남김)
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.purge_event_entries_pii(p_days INTEGER DEFAULT 90)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count INTEGER;
BEGIN
  WITH t AS (
    UPDATE event_entries e
    SET birth_date = DATE '1900-01-01', birth_time = NULL, contact = NULL,
        ip_hash = NULL, ua_hash = NULL, status = 'purged'
    FROM event_rounds r
    WHERE e.round_id = r.id
      AND r.closes_at < now() - make_interval(days => p_days)
      AND e.status <> 'purged'
    RETURNING 1
  ) SELECT count(*) INTO v_count FROM t;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.purge_event_entries_pii(INTEGER) FROM PUBLIC, anon, authenticated;
