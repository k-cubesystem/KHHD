-- get_family_with_missions 에 avatar_id·job·hobby 추가.
--
-- 가족 페이지(getFamilyWithMissions → RPC 우선 경로)가 RPC 반환 컬럼에 avatar_id 가 없어
-- member.avatar_id 가 undefined → 카드가 기본 User 아이콘으로 폴백하던 버그.
-- (신당은 family_members 를 직접 select 하므로 아바타가 정상 표시됐다 — 데이터 경로 차이)
-- job·hobby 도 동일하게 RPC 에서 누락돼 있어(폴백 쿼리·TS 타입엔 존재) 함께 보강.
--
-- birth_date/birth_time 은 text (20260719_fix_family_missions_types 참조). avatar_id/job/hobby 는 text.

DROP FUNCTION IF EXISTS public.get_family_with_missions(uuid);

CREATE FUNCTION public.get_family_with_missions(user_id_param uuid)
RETURNS TABLE(
  id uuid, name text, relationship text,
  birth_date text, birth_time text,
  calendar_type text, gender text,
  avatar_id text, job text, hobby text,
  face_image_url text,
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
  SELECT fm.id, fm.name, fm.relationship, fm.birth_date, fm.birth_time, fm.calendar_type, fm.gender,
    fm.avatar_id, fm.job, fm.hobby, fm.face_image_url,
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
