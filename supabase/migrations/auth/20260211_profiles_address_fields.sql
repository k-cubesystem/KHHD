-- Add address fields to profiles for 천지인 (Cheonjiin) fengshui analysis
-- 지(地) - 풍수: 집 주소, 직장 주소
-- 인(人) - 관상·손금: 임시 업로드 방식으로 변경 (DB 저장 안 함)

-- Add address columns
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS home_address text,
ADD COLUMN IF NOT EXISTS work_address text;

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.home_address IS '지(地) - 풍수: 집 주소';
COMMENT ON COLUMN public.profiles.work_address IS '지(地) - 풍수: 직장 주소';
COMMENT ON COLUMN public.profiles.avatar_url IS '프로필 아바타 (소셜 이미지 또는 도깨비 아바타)';

-- Update v_destiny_targets view to include address fields
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
  NULL::text AS face_image_url,    -- 임시 업로드 방식, DB에 저장 안 함
  NULL::text AS hand_image_url,    -- 임시 업로드 방식, DB에 저장 안 함
  p.home_address,
  'self' AS target_type,
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
  fm.created_at AS updated_at
FROM public.family_members fm;

-- Grant permissions
GRANT SELECT ON public.v_destiny_targets TO authenticated;
