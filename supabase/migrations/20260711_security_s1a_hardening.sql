-- Track S1a — 보안 하드닝 (지금 라이브 적용 안전분)
-- 근거: TEAM_H_SECURITY/SECURITY-DESIGN-v2.md, get_advisors(security) 실측 112건
-- 범위: 현재 프로덕션 코드를 깨지 않는 변경만.
--   - anon/PUBLIC EXECUTE 회수(비로그인 재화발행·PII열람 P0 차단) — authenticated/service_role 유지
--   - kg_* RLS, 뷰 security_invoker, 함수 search_path 고정
--   - 개인정보 함수 auth.uid() 교차접근 가드
-- authenticated EXECUTE 회수 + 재화 테이블 쓰기정책은 S1b(코드 배포 후) 별도.

-- ============================================================
-- 1. RLS 미적용 테이블 (ERROR 3건) — 전역 지식그래프(읽기전용 참조데이터)
--    앱은 authenticated 클라이언트로 SELECT만 수행(쓰기 없음). 쓰기는 service_role(RLS 우회).
-- ============================================================
ALTER TABLE public.kg_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kg_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kg_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kg_nodes_read ON public.kg_nodes;
DROP POLICY IF EXISTS kg_edges_read ON public.kg_edges;
DROP POLICY IF EXISTS kg_rules_read ON public.kg_rules;
CREATE POLICY kg_nodes_read ON public.kg_nodes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY kg_edges_read ON public.kg_edges FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY kg_rules_read ON public.kg_rules FOR SELECT TO anon, authenticated USING (true);

-- ============================================================
-- 2. SECURITY DEFINER 뷰 (ERROR 2건) → security_invoker
--    base 테이블(profiles/family_members/bok_points) 모두 own-row RLS 존재 확인됨.
-- ============================================================
ALTER VIEW public.user_profiles SET (security_invoker = true);
ALTER VIEW public.v_destiny_targets SET (security_invoker = true);

-- ============================================================
-- 3. 개인정보/할당량 함수 — auth.uid() 교차접근 가드 (본인/서버전용만)
--    service_role 호출 시 auth.uid()=NULL → 가드 skip(기존 서버 경로 유지).
--    authenticated 가 타인 UUID로 호출 → 거부.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_family_with_analysis_summary(user_id_param uuid)
 RETURNS TABLE(id uuid, name text, relationship text, birth_date text, birth_time text, calendar_type text, gender text, face_image_url text, last_analysis_date timestamp with time zone, last_analysis_summary text, last_analysis_score integer, last_analysis_category text, total_analysis_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
    IF auth.uid() IS NOT NULL AND user_id_param IS DISTINCT FROM auth.uid() AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'FORBIDDEN: cross-user access denied' USING ERRCODE = '42501';
    END IF;
    RETURN QUERY
    WITH LastAnalysis AS (
        SELECT DISTINCT ON (target_id)
            target_id, created_at as last_date, summary, score, category
        FROM public.analysis_history
        WHERE analysis_history.user_id = user_id_param
        ORDER BY target_id, created_at DESC
    ),
    AnalysisCount AS (
        SELECT target_id, COUNT(*) as total_count
        FROM public.analysis_history
        WHERE analysis_history.user_id = user_id_param
        GROUP BY target_id
    )
    SELECT
        fm.id, fm.name, fm.relationship, fm.birth_date, fm.birth_time,
        fm.calendar_type, fm.gender, fm.face_image_url,
        la.last_date, la.summary, la.score, la.category,
        COALESCE(ac.total_count, 0)
    FROM public.family_members fm
    LEFT JOIN LastAnalysis la ON fm.id = la.target_id
    LEFT JOIN AnalysisCount ac ON fm.id = ac.target_id
    WHERE fm.user_id = user_id_param
    ORDER BY fm.created_at;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_family_with_missions(user_id_param uuid)
 RETURNS TABLE(id uuid, name text, relationship text, birth_date date, birth_time time without time zone, calendar_type text, gender text, face_image_url text, last_analysis_date timestamp with time zone, last_analysis_summary text, last_analysis_score integer, mission_completed integer, mission_total integer, completed_categories text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND user_id_param IS DISTINCT FROM auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN: cross-user access denied' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT
    fm.id,
    fm.name,
    fm.relationship,
    fm.birth_date,
    fm.birth_time,
    fm.calendar_type,
    fm.gender,
    fm.face_image_url,
    MAX(ah.created_at) as last_analysis_date,
    (SELECT summary FROM public.analysis_history WHERE target_id = fm.id ORDER BY created_at DESC LIMIT 1) as last_analysis_summary,
    (SELECT score FROM public.analysis_history WHERE target_id = fm.id ORDER BY created_at DESC LIMIT 1) as last_analysis_score,
    COUNT(DISTINCT ah.category)::integer as mission_completed,
    8 as mission_total,
    ARRAY_AGG(DISTINCT ah.category) FILTER (WHERE ah.category IS NOT NULL) as completed_categories
  FROM public.family_members fm
  LEFT JOIN public.analysis_history ah ON fm.id = ah.target_id
  WHERE fm.user_id = user_id_param
  GROUP BY fm.id
  ORDER BY fm.created_at;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_today_fortune(p_user_id uuid)
 RETURNS TABLE(id uuid, content text, lucky_color text, lucky_number integer, lucky_direction text, caution text, fortune_date date)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
    IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'FORBIDDEN: cross-user access denied' USING ERRCODE = '42501';
    END IF;
    RETURN QUERY
    SELECT
        dfr.id,
        dfr.content,
        dfr.lucky_color,
        dfr.lucky_number,
        dfr.lucky_direction,
        dfr.caution,
        dfr.fortune_date
    FROM public.daily_fortune_records dfr
    WHERE dfr.user_id = p_user_id
        AND dfr.fortune_date = CURRENT_DATE
    LIMIT 1;
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_ai_chat_usage(p_user_id uuid, p_date date)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN: cross-user access denied' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.ai_chat_usage (user_id, usage_date, session_count, total_turns)
  VALUES (p_user_id, p_date, 1, 0)
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET session_count = ai_chat_usage.session_count + 1, updated_at = NOW();
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_ai_chat_turn(p_user_id uuid, p_date date, p_talisman_used integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN: cross-user access denied' USING ERRCODE = '42501';
  END IF;
  UPDATE public.ai_chat_usage
  SET total_turns = total_turns + 1,
      total_talisman_used = total_talisman_used + p_talisman_used,
      updated_at = NOW()
  WHERE user_id = p_user_id AND usage_date = p_date;
  IF NOT FOUND THEN
    INSERT INTO public.ai_chat_usage (user_id, usage_date, session_count, total_turns, total_talisman_used)
    VALUES (p_user_id, p_date, 0, 1, p_talisman_used);
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_daily_attendance(p_user_id uuid, p_date date, p_consecutive_days integer, p_reward integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN: cross-user access denied' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.daily_attendance (user_id, checked_at, consecutive_days, reward_talisman)
  VALUES (p_user_id, p_date, p_consecutive_days, p_reward);
END;
$function$;

-- ============================================================
-- 4. search_path 고정 (WARN 34건) — SECURITY DEFINER + 모든 트리거 함수 중 미고정분
--    anon/authenticated 는 public 에 CREATE 권한 없음(확인) → search_path=public 하이재킹 불가.
-- ============================================================
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND (p.prosecdef OR p.prorettype = 'pg_catalog.trigger'::regtype)
      AND (p.proconfig IS NULL OR NOT EXISTS (
        SELECT 1 FROM unnest(p.proconfig) c WHERE c LIKE 'search_path=%'))
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public', r.sig);
  END LOOP;
END $$;

-- ============================================================
-- 5. anon/PUBLIC EXECUTE 회수 (P0: 비로그인 재화발행·PII열람 차단)
--    제외(의도적 공개): get_shared_analysis_record(토큰 공유), increment_shrine_visitor(방문자 카운트),
--                       is_admin(다수 RLS 정책이 anon 평가 경로에서 호출 → 유지, 반환값 무해).
--    authenticated/service_role EXECUTE 는 유지(S1b 에서 MINT 함수 authenticated 회수).
-- ============================================================
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND p.proname NOT IN ('get_shared_analysis_record', 'increment_shrine_visitor', 'is_admin')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', r.sig);
  END LOOP;
END $$;
