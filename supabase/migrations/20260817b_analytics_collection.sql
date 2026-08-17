-- 어드민 분석 시스템 v1 — 수집 층 (마케팅 플랜 Track A-1·A-6·A-8)
--
-- 진단(2026-08-17 라이브 실측): activity_logs·funnel_events·utm_tracking 세 표와 RPC 2개, 어드민 분석 함수 4개가
-- «읽는 쪽»은 전부 있는데 «쓰는 코드»가 0줄이라 activity_logs 는 7/13 이후 빈 표였다.
-- 이 마이그레이션은 쓰기 경로에 필요한 것만 더한다: 익명 방문자 식별·페이지뷰 표·수집 RPC·일별 롤업 뷰.
-- 기존 표는 건드리지 않는다(RPC 계약 유지: get_utm_performance / get_funnel_analysis).

-- ────────────────────────────────────────────────────────────────
-- 1. 페이지뷰 — 방문·세션·유입 매체·랜딩·기기. GA 의 «세션·페이지» 축.
--    행이 많아지는 표라 좁게 잡고, 90일 지나면 롤업 뷰만 남기고 파기한다(purge 함수).
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS page_views (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  visitor_id   TEXT NOT NULL,                 -- 익명 쿠키 hhd_vid (1년)
  session_id   TEXT NOT NULL,                 -- 30분 무활동이면 새 세션 (클라가 발급)
  user_id      UUID,                          -- 로그인 시 (auth.users FK 안 검 — 탈퇴해도 집계 보존)
  path         TEXT NOT NULL,
  referrer_host TEXT,                         -- 도메인만 (전체 URL 은 개인정보 새는 경로)
  utm_source   TEXT, utm_medium TEXT, utm_campaign TEXT, utm_content TEXT, utm_term TEXT,
  device       TEXT CHECK (device IN ('mobile','tablet','desktop','bot','unknown')),
  country      TEXT,                          -- Vercel 지오 헤더 (x-vercel-ip-country)
  is_new_visitor BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_page_views_time ON page_views (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_session ON page_views (session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_page_views_path_time ON page_views (path, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_visitor ON page_views (visitor_id, created_at DESC);

ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY page_views_admin_read ON page_views FOR SELECT USING (public.is_admin());
-- 쓰기는 RPC(SECURITY DEFINER)만.

-- ────────────────────────────────────────────────────────────────
-- 2. activity_logs 에 익명 식별 컬럼 — 로그인 전 행동도 같은 사람으로 묶으려면 visitor_id 가 필요하다.
-- ────────────────────────────────────────────────────────────────
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS visitor_id TEXT;
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS session_id TEXT;
CREATE INDEX IF NOT EXISTS idx_activity_logs_type_time ON activity_logs (activity_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_visitor ON activity_logs (visitor_id, created_at DESC) WHERE visitor_id IS NOT NULL;

-- utm_tracking 에도 visitor_id (session_id 컬럼은 uuid 라 텍스트 세션을 못 담는다 → 별도 컬럼)
ALTER TABLE utm_tracking ADD COLUMN IF NOT EXISTS visitor_id TEXT;
CREATE INDEX IF NOT EXISTS idx_utm_tracking_visitor ON utm_tracking (visitor_id) WHERE visitor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_utm_tracking_time ON utm_tracking (created_at DESC);

-- ────────────────────────────────────────────────────────────────
-- 3. 수집 RPC — 클라이언트(anon)가 부른다. SECURITY DEFINER 로 표에 직접 쓰지 않게 하고,
--    입력을 여기서 자르고 정규화한다(길이·화이트리스트). 반환은 void — 수집은 실패해도 화면을 안 막는다.
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.track_page_view(
  p_visitor_id TEXT, p_session_id TEXT, p_path TEXT,
  p_referrer_host TEXT DEFAULT NULL,
  p_utm JSONB DEFAULT NULL,
  p_device TEXT DEFAULT 'unknown', p_country TEXT DEFAULT NULL, p_is_new BOOLEAN DEFAULT false
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_visitor_id IS NULL OR length(p_visitor_id) NOT BETWEEN 8 AND 64 THEN RETURN; END IF;
  IF p_session_id IS NULL OR length(p_session_id) NOT BETWEEN 8 AND 64 THEN RETURN; END IF;
  INSERT INTO page_views (visitor_id, session_id, user_id, path, referrer_host,
                          utm_source, utm_medium, utm_campaign, utm_content, utm_term,
                          device, country, is_new_visitor)
  VALUES (
    p_visitor_id, p_session_id, auth.uid(), left(p_path, 200), left(p_referrer_host, 100),
    left(p_utm->>'utm_source', 80), left(p_utm->>'utm_medium', 80), left(p_utm->>'utm_campaign', 120),
    left(p_utm->>'utm_content', 120), left(p_utm->>'utm_term', 120),
    CASE WHEN p_device IN ('mobile','tablet','desktop','bot') THEN p_device ELSE 'unknown' END,
    left(p_country, 2), coalesce(p_is_new, false)
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.track_page_view(TEXT,TEXT,TEXT,TEXT,JSONB,TEXT,TEXT,BOOLEAN) TO anon, authenticated;

-- 첫 유입 1회 기록 (utm_tracking). visitor 당 1행 — 재방문은 안 넣는다(first-touch 귀속).
CREATE OR REPLACE FUNCTION public.track_first_touch(
  p_visitor_id TEXT, p_utm JSONB, p_landing_page TEXT, p_referrer TEXT DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_visitor_id IS NULL OR length(p_visitor_id) NOT BETWEEN 8 AND 64 THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM utm_tracking WHERE visitor_id = p_visitor_id) THEN RETURN; END IF;
  INSERT INTO utm_tracking (visitor_id, user_id, utm_source, utm_medium, utm_campaign, utm_term, utm_content, landing_page, referrer)
  VALUES (p_visitor_id, auth.uid(),
          left(p_utm->>'utm_source', 80), left(p_utm->>'utm_medium', 80), left(p_utm->>'utm_campaign', 120),
          left(p_utm->>'utm_term', 120), left(p_utm->>'utm_content', 120),
          left(p_landing_page, 200), left(p_referrer, 200));
END;
$$;
GRANT EXECUTE ON FUNCTION public.track_first_touch(TEXT,JSONB,TEXT,TEXT) TO anon, authenticated;

-- 행동 이벤트 (activity_logs). GA4 trackEvent 와 같은 이름 체계로 들어온다.
CREATE OR REPLACE FUNCTION public.track_activity(
  p_visitor_id TEXT, p_session_id TEXT, p_type TEXT, p_category TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL, p_metadata JSONB DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_type IS NULL OR length(p_type) NOT BETWEEN 1 AND 60 THEN RETURN; END IF;
  INSERT INTO activity_logs (user_id, visitor_id, session_id, activity_type, activity_category, description, metadata)
  VALUES (auth.uid(), left(p_visitor_id, 64), left(p_session_id, 64), left(p_type, 60), left(p_category, 60),
          left(p_description, 200), CASE WHEN pg_column_size(p_metadata) < 4096 THEN p_metadata ELSE NULL END);
END;
$$;
GRANT EXECUTE ON FUNCTION public.track_activity(TEXT,TEXT,TEXT,TEXT,TEXT,JSONB) TO anon, authenticated;

-- 퍼널 이벤트 (funnel_events) — get_funnel_analysis 가 읽는 표. step 은 코드의 FUNNEL 정의가 단일 출처.
CREATE OR REPLACE FUNCTION public.track_funnel(
  p_event_name TEXT, p_step INTEGER, p_metadata JSONB DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_event_name IS NULL OR p_step IS NULL OR p_step NOT BETWEEN 1 AND 20 THEN RETURN; END IF;
  INSERT INTO funnel_events (user_id, event_name, funnel_step, metadata)
  VALUES (auth.uid(), left(p_event_name, 60), p_step, CASE WHEN pg_column_size(p_metadata) < 2048 THEN p_metadata ELSE NULL END);
END;
$$;
GRANT EXECUTE ON FUNCTION public.track_funnel(TEXT,INTEGER,JSONB) TO anon, authenticated;

-- 가입 귀속 — 회원가입 완료 시 서버가 호출: visitor 의 first-touch 를 «전환됨»으로 표시하고 user_id 를 붙인다.
-- 이게 있어야 get_utm_performance 의 conversions 가 참이 된다.
CREATE OR REPLACE FUNCTION public.attribute_signup(p_visitor_id TEXT, p_user_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_visitor_id IS NULL OR p_user_id IS NULL THEN RETURN; END IF;
  UPDATE utm_tracking SET user_id = p_user_id, converted = true, converted_at = now()
   WHERE visitor_id = p_visitor_id AND converted IS DISTINCT FROM true;
  UPDATE page_views SET user_id = p_user_id WHERE visitor_id = p_visitor_id AND user_id IS NULL;
  UPDATE activity_logs SET user_id = p_user_id WHERE visitor_id = p_visitor_id AND user_id IS NULL;
END;
$$;
-- service_role 전용 (서버 액션·콜백에서만) — anon 이 남의 visitor 를 자기 user 에 붙이면 귀속 조작.
REVOKE ALL ON FUNCTION public.attribute_signup(TEXT, UUID) FROM PUBLIC, anon, authenticated;

-- ────────────────────────────────────────────────────────────────
-- 4. 어드민 조회 RPC — 대시보드가 부른다. 표 스캔을 DB 안에서 끝내 액션이 얇게 유지되게.
-- ────────────────────────────────────────────────────────────────
-- 일별 개요: 방문(세션)·순방문자·신규·페이지뷰·가입·매출
CREATE OR REPLACE FUNCTION public.analytics_daily_overview(p_start DATE, p_end DATE)
RETURNS TABLE(day DATE, sessions BIGINT, visitors BIGINT, new_visitors BIGINT, pageviews BIGINT, signups BIGINT, revenue NUMERIC)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  WITH d AS (SELECT generate_series(p_start, p_end, '1 day')::date AS day),
  pv AS (
    SELECT (created_at AT TIME ZONE 'Asia/Seoul')::date AS day,
           count(DISTINCT session_id) AS sessions, count(DISTINCT visitor_id) AS visitors,
           count(DISTINCT visitor_id) FILTER (WHERE is_new_visitor) AS new_visitors, count(*) AS pageviews
    FROM page_views WHERE created_at >= p_start AND created_at < p_end + 1 GROUP BY 1
  ),
  su AS (SELECT (created_at AT TIME ZONE 'Asia/Seoul')::date AS day, count(*) AS signups FROM profiles WHERE created_at >= p_start AND created_at < p_end + 1 GROUP BY 1),
  rv AS (SELECT (created_at AT TIME ZONE 'Asia/Seoul')::date AS day, sum(amount - coalesce(cancelled_amount,0)) AS revenue FROM payments WHERE status='completed' AND created_at >= p_start AND created_at < p_end + 1 GROUP BY 1)
  SELECT d.day, coalesce(pv.sessions,0), coalesce(pv.visitors,0), coalesce(pv.new_visitors,0), coalesce(pv.pageviews,0), coalesce(su.signups,0), coalesce(rv.revenue,0)
  FROM d LEFT JOIN pv USING (day) LEFT JOIN su USING (day) LEFT JOIN rv USING (day) ORDER BY d.day;
$$;
REVOKE ALL ON FUNCTION public.analytics_daily_overview(DATE, DATE) FROM PUBLIC, anon, authenticated;

-- 유입 매체 분해 (세션 기준): source/medium 별 세션·순방문·가입 전환
CREATE OR REPLACE FUNCTION public.analytics_acquisition(p_start DATE, p_end DATE)
RETURNS TABLE(source TEXT, medium TEXT, sessions BIGINT, visitors BIGINT, signups BIGINT)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  WITH s AS (
    SELECT DISTINCT ON (session_id) session_id, visitor_id,
      coalesce(nullif(utm_source,''), CASE WHEN referrer_host IS NULL OR referrer_host = '' THEN '(direct)' ELSE referrer_host END) AS source,
      coalesce(nullif(utm_medium,''), CASE WHEN referrer_host IS NULL OR referrer_host = '' THEN '(none)' ELSE 'referral' END) AS medium
    FROM page_views WHERE created_at >= p_start AND created_at < p_end + 1
    ORDER BY session_id, created_at
  ),
  conv AS (SELECT DISTINCT visitor_id FROM utm_tracking WHERE converted AND converted_at >= p_start AND converted_at < p_end + 1)
  SELECT s.source, s.medium, count(*) AS sessions, count(DISTINCT s.visitor_id) AS visitors,
         count(DISTINCT c.visitor_id) AS signups
  FROM s LEFT JOIN conv c ON c.visitor_id = s.visitor_id
  GROUP BY 1,2 ORDER BY sessions DESC LIMIT 50;
$$;
REVOKE ALL ON FUNCTION public.analytics_acquisition(DATE, DATE) FROM PUBLIC, anon, authenticated;

-- 페이지 랭킹
CREATE OR REPLACE FUNCTION public.analytics_top_pages(p_start DATE, p_end DATE, p_limit INTEGER DEFAULT 30)
RETURNS TABLE(path TEXT, pageviews BIGINT, sessions BIGINT, entrances BIGINT)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  WITH pv AS (SELECT * FROM page_views WHERE created_at >= p_start AND created_at < p_end + 1),
  first_in_session AS (SELECT DISTINCT ON (session_id) session_id, path FROM pv ORDER BY session_id, created_at)
  SELECT pv.path, count(*) AS pageviews, count(DISTINCT pv.session_id) AS sessions,
         (SELECT count(*) FROM first_in_session f WHERE f.path = pv.path) AS entrances
  FROM pv GROUP BY pv.path ORDER BY pageviews DESC LIMIT p_limit;
$$;
REVOKE ALL ON FUNCTION public.analytics_top_pages(DATE, DATE, INTEGER) FROM PUBLIC, anon, authenticated;

-- 이벤트 랭킹 (activity_logs)
CREATE OR REPLACE FUNCTION public.analytics_top_events(p_start DATE, p_end DATE, p_limit INTEGER DEFAULT 40)
RETURNS TABLE(activity_type TEXT, activity_category TEXT, events BIGINT, users BIGINT)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT activity_type, activity_category, count(*) AS events,
         count(DISTINCT coalesce(user_id::text, visitor_id)) AS users
  FROM activity_logs WHERE created_at >= p_start AND created_at < p_end + 1
  GROUP BY 1,2 ORDER BY events DESC LIMIT p_limit;
$$;
REVOKE ALL ON FUNCTION public.analytics_top_events(DATE, DATE, INTEGER) FROM PUBLIC, anon, authenticated;

-- 실시간 (최근 30분): 활성 방문자·현재 페이지
CREATE OR REPLACE FUNCTION public.analytics_realtime()
RETURNS TABLE(active_visitors BIGINT, active_sessions BIGINT, top_paths JSONB)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  WITH r AS (SELECT * FROM page_views WHERE created_at >= now() - interval '30 minutes')
  SELECT (SELECT count(DISTINCT visitor_id) FROM r), (SELECT count(DISTINCT session_id) FROM r),
         (SELECT coalesce(jsonb_agg(jsonb_build_object('path', path, 'n', n) ORDER BY n DESC), '[]'::jsonb)
            FROM (SELECT path, count(*) AS n FROM r GROUP BY path ORDER BY n DESC LIMIT 10) t);
$$;
REVOKE ALL ON FUNCTION public.analytics_realtime() FROM PUBLIC, anon, authenticated;

-- 기기·국가 분해
CREATE OR REPLACE FUNCTION public.analytics_tech(p_start DATE, p_end DATE)
RETURNS TABLE(dimension TEXT, value TEXT, sessions BIGINT)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  WITH s AS (SELECT DISTINCT ON (session_id) session_id, device, country FROM page_views WHERE created_at >= p_start AND created_at < p_end + 1 ORDER BY session_id, created_at),
  u AS (
    SELECT 'device'::text AS dimension, coalesce(device,'unknown')::text AS value, count(*) AS sessions FROM s GROUP BY 2
    UNION ALL
    SELECT 'country', coalesce(country,'??'), count(*) FROM s GROUP BY 2
  )
  SELECT dimension, value, sessions FROM u ORDER BY dimension, sessions DESC;
$$;
REVOKE ALL ON FUNCTION public.analytics_tech(DATE, DATE) FROM PUBLIC, anon, authenticated;

-- ────────────────────────────────────────────────────────────────
-- 5. 보존 — 페이지뷰 원본 90일. (일별 롤업은 조회 시 계산하므로 별도 표 없음 — 규모 커지면 materialized 로)
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.purge_page_views(p_days INTEGER DEFAULT 90)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v INTEGER;
BEGIN
  DELETE FROM page_views WHERE created_at < now() - make_interval(days => p_days);
  GET DIAGNOSTICS v = ROW_COUNT;
  RETURN v;
END;
$$;
REVOKE ALL ON FUNCTION public.purge_page_views(INTEGER) FROM PUBLIC, anon, authenticated;
