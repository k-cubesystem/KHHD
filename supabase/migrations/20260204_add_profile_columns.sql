-- 1. Add missing columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS birth_date date,
ADD COLUMN IF NOT EXISTS birth_time time,
ADD COLUMN IF NOT EXISTS calendar_type text DEFAULT 'solar', -- 'solar' | 'lunar'
ADD COLUMN IF NOT EXISTS gender text; -- 'male' | 'female'

-- 2. Update v_destiny_targets view to use real columns from profiles
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
  -- profiles에는 created_at이 없으므로 updated_at 사용
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
  fm.created_at AS created_at,
  -- family_members에는 updated_at이 없으므로 created_at 사용
  fm.created_at AS updated_at
FROM public.family_members fm;

-- 3. Grant permissions again
GRANT SELECT ON public.v_destiny_targets TO authenticated;
