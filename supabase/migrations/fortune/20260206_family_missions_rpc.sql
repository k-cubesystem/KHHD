-- Create RPC function to get family members with mission progress
-- This function joins family_members with analysis_history to calculate mission completion

CREATE OR REPLACE FUNCTION public.get_family_with_missions(user_id_param uuid)
RETURNS TABLE (
  id uuid,
  name text,
  relationship text,
  birth_date date,
  birth_time time,
  calendar_type text,
  gender text,
  face_image_url text,
  last_analysis_date timestamp with time zone,
  last_analysis_summary text,
  last_analysis_score integer,
  mission_completed integer,
  mission_total integer,
  completed_categories text[]
) AS $$
BEGIN
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
    (SELECT summary FROM analysis_history WHERE target_id = fm.id ORDER BY created_at DESC LIMIT 1) as last_analysis_summary,
    (SELECT score FROM analysis_history WHERE target_id = fm.id ORDER BY created_at DESC LIMIT 1) as last_analysis_score,
    COUNT(DISTINCT ah.category)::integer as mission_completed,
    8 as mission_total,
    ARRAY_AGG(DISTINCT ah.category) FILTER (WHERE ah.category IS NOT NULL) as completed_categories
  FROM family_members fm
  LEFT JOIN analysis_history ah ON fm.id = ah.target_id
  WHERE fm.user_id = user_id_param
  GROUP BY fm.id
  ORDER BY fm.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
