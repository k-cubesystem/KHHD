-- =========================================================
-- Family Analysis Summary View & Function
-- 가족 구성원별 마지막 분석 정보 요약 (Join 최적화)
-- =========================================================

-- 1. 가족별 요약 정보를 보여주는 View 생성 (RLS 적용을 위해 View 대신 Function 권장하지만, 편리함을 위해 View 생성 후 보안 함수 래핑)
-- 아니면 바로 RPC 함수로 작성하여 파라미터 기반 필터링

CREATE OR REPLACE FUNCTION public.get_family_with_analysis_summary(user_id_param uuid)
RETURNS TABLE (
    id uuid,
    name text,
    relationship text,
    birth_date date,
    birth_time time,
    calendar_type text,
    gender text,
    face_image_url text,
    last_analysis_date timestamptz,
    last_analysis_summary text,
    last_analysis_score integer,
    last_analysis_category text,
    total_analysis_count bigint
) AS $$
BEGIN
    RETURN QUERY
    WITH LastAnalysis AS (
        SELECT DISTINCT ON (target_id)
            target_id,
            created_at as last_date,
            summary,
            score,
            category
        FROM public.analysis_history
        WHERE user_id = user_id_param
        ORDER BY target_id, created_at DESC
    ),
    AnalysisCount AS (
        SELECT
            target_id,
            COUNT(*) as total_count
        FROM public.analysis_history
        WHERE user_id = user_id_param
        GROUP BY target_id
    )
    SELECT
        fm.id,
        fm.name,
        fm.relationship,
        fm.birth_date,
        fm.birth_time,
        fm.calendar_type,
        fm.gender,
        fm.face_image_url,
        la.last_date as last_analysis_date,
        la.summary as last_analysis_summary,
        la.score as last_analysis_score,
        la.category as last_analysis_category,
        COALESCE(ac.total_count, 0) as total_analysis_count
    FROM public.family_members fm
    LEFT JOIN LastAnalysis la ON fm.id = la.target_id
    LEFT JOIN AnalysisCount ac ON fm.id = ac.target_id
    WHERE fm.user_id = user_id_param
    ORDER BY fm.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 권한 부여
GRANT EXECUTE ON FUNCTION public.get_family_with_analysis_summary TO authenticated;
