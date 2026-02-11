-- Add Cheonjiin analysis fields to profiles table
-- 천지인 분석을 위한 추가 필드 (천-사주, 지-풍수, 인-관상·손금)

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS home_address text,          -- 지(地) - 풍수: 주소
ADD COLUMN IF NOT EXISTS face_image_url text,        -- 인(人) - 관상: 얼굴 이미지
ADD COLUMN IF NOT EXISTS hand_image_url text;        -- 인(人) - 손금: 손 이미지

-- Update v_destiny_targets view to include new columns from profiles
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
  p.face_image_url,      -- Now from profiles
  p.hand_image_url,      -- Now from profiles
  p.home_address,        -- Now from profiles
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

-- Comment
COMMENT ON COLUMN public.profiles.home_address IS '지(地) - 풍수: 거주지 주소';
COMMENT ON COLUMN public.profiles.face_image_url IS '인(人) - 관상: 얼굴 이미지 URL';
COMMENT ON COLUMN public.profiles.hand_image_url IS '인(人) - 손금: 손 이미지 URL';
