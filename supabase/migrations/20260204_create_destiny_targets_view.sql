-- ============================================
-- Phase 2: Destiny Targets View (Fixed)
-- 통합 운명 객체 - 본인 + 가족/친구 통합 조회
-- ============================================

-- 1. Ensure columns exist on profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS birth_date date,
ADD COLUMN IF NOT EXISTS birth_time time,
ADD COLUMN IF NOT EXISTS calendar_type text DEFAULT 'solar',
ADD COLUMN IF NOT EXISTS gender text;

-- 2. Create/Replace View with Column Handling
CREATE OR REPLACE VIEW public.v_destiny_targets AS
-- 본인 데이터 (profiles)
SELECT
  p.id AS id,
  p.id AS owner_id,
  p.full_name AS name,
  '본인' AS relation_type,
  p.birth_date,
  p.birth_time,
  p.calendar_type,
  p.gender,
  p.avatar_url,
  NULL::text AS face_image_url,
  NULL::text AS hand_image_url,
  NULL::text AS home_address,
  'self' AS target_type,
  -- profiles has updated_at but might assume created_at missing, use updated_at
  p.updated_at AS created_at,
  p.updated_at AS updated_at
FROM public.profiles p

UNION ALL

-- 가족/친구 데이터 (family_members)
SELECT
  fm.id AS id,
  fm.user_id AS owner_id,
  fm.name AS name,
  fm.relationship AS relation_type,
  fm.birth_date,
  fm.birth_time,
  fm.calendar_type,
  fm.gender,
  NULL::text AS avatar_url,
  fm.face_image_url,
  fm.hand_image_url,
  fm.home_address,
  'family' AS target_type,
  -- family_members has created_at, use it for updated_at too if missing
  fm.created_at AS created_at,
  fm.created_at AS updated_at
FROM public.family_members fm;

-- 3. Helper Function
CREATE OR REPLACE FUNCTION public.get_user_destiny_targets(user_id_param uuid)
RETURNS TABLE (
  id uuid,
  owner_id uuid,
  name text,
  relation_type text,
  birth_date date,
  birth_time time,
  calendar_type text,
  gender text,
  avatar_url text,
  face_image_url text,
  hand_image_url text,
  home_address text,
  target_type text,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    vdt.id,
    vdt.owner_id,
    vdt.name,
    vdt.relation_type,
    vdt.birth_date,
    vdt.birth_time,
    vdt.calendar_type,
    vdt.gender,
    vdt.avatar_url,
    vdt.face_image_url,
    vdt.hand_image_url,
    vdt.home_address,
    vdt.target_type,
    vdt.created_at,
    vdt.updated_at
  FROM public.v_destiny_targets vdt
  WHERE vdt.owner_id = user_id_param
  ORDER BY
    CASE
      WHEN vdt.target_type = 'self' THEN 0
      ELSE 1
    END,
    vdt.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Permissions
GRANT SELECT ON public.v_destiny_targets TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_destiny_targets TO authenticated;
