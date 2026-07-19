-- get_family_with_missions 반환 타입 수복.
--
-- family_members.birth_date/birth_time 은 text 인데 함수는 date/time 으로 선언돼 있어
-- 호출할 때마다 42804 "structure of query does not match function result type" 로 실패했다.
-- (7/4 DB 재구축 때 구세대 시그니처가 복구된 흔적 — project_db_rebuild_gaps 패턴)
-- 가족 관리 페이지의 미션 현황이 통째로 비어 보이던 원인.

DROP FUNCTION IF EXISTS public.get_family_with_missions(uuid);

CREATE FUNCTION public.get_family_with_missions(user_id_param uuid)
RETURNS TABLE(
  id uuid, name text, relationship text,
  birth_date text, birth_time text,
  calendar_type text, gender text, face_image_url text,
  last_analysis_date timestamptz, last_analysis_summary text, last_analysis_score integer,
  mission_completed integer, mission_total integer, completed_categories text[]
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND user_id_param IS DISTINCT FROM auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN: cross-user access denied' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT fm.id, fm.name, fm.relationship, fm.birth_date, fm.birth_time, fm.calendar_type, fm.gender, fm.face_image_url,
    MAX(ah.created_at) as last_analysis_date,
    (SELECT summary FROM public.analysis_history WHERE target_id = fm.id ORDER BY created_at DESC LIMIT 1) as last_analysis_summary,
    (SELECT score FROM public.analysis_history WHERE target_id = fm.id ORDER BY created_at DESC LIMIT 1) as last_analysis_score,
    COUNT(DISTINCT ah.category)::integer as mission_completed, 8 as mission_total,
    ARRAY_AGG(DISTINCT ah.category) FILTER (WHERE ah.category IS NOT NULL) as completed_categories
  FROM public.family_members fm
  LEFT JOIN public.analysis_history ah ON fm.id = ah.target_id
  WHERE fm.user_id = user_id_param GROUP BY fm.id ORDER BY fm.created_at;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_family_with_missions(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_family_with_missions(uuid) TO authenticated, service_role;
