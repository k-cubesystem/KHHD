-- R-P0-3 음력 윤달 지원: 윤달 출생자의 월주(月柱) 오계산 제거.
-- profiles·family_members 에 is_leap_month 컬럼 추가(멱등).
-- lunar-javascript 규약: 음력 윤달은 음(-)월로 전달(month<0=闰月) → 평달과 다른 절기에 걸려 월주가 달라진다.
-- 기본 false — 기존 행/호출부는 평달로 계산(무수정 호환).

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_leap_month boolean NOT NULL DEFAULT false;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS is_leap_month boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN profiles.is_leap_month IS '음력 윤달 여부(calendar_type=lunar 일 때만 유효). 사주 월주 계산에 사용.';
COMMENT ON COLUMN family_members.is_leap_month IS '음력 윤달 여부(calendar_type=lunar 일 때만 유효). 사주 월주 계산에 사용.';

-- v_destiny_targets 뷰에 is_leap_month 노출(getDestinyTarget 이 이 뷰를 조회) — 끝에 컬럼 추가.
CREATE OR REPLACE VIEW v_destiny_targets AS
 SELECT p.id,
    p.id AS owner_id,
    p.full_name AS name,
    '본인'::text AS relation_type,
    p.birth_date,
    p.birth_time,
    p.calendar_type,
    p.gender,
    p.avatar_url,
    NULL::text AS face_image_url,
    NULL::text AS hand_image_url,
    p.home_address,
    'self'::text AS target_type,
    p.updated_at AS created_at,
    p.updated_at,
    p.is_leap_month
   FROM profiles p
UNION ALL
 SELECT fm.id,
    fm.user_id AS owner_id,
    fm.name,
    fm.relationship AS relation_type,
    fm.birth_date,
    fm.birth_time,
    fm.calendar_type,
    fm.gender,
    NULL::text AS avatar_url,
    fm.face_image_url,
    fm.hand_image_url,
    fm.home_address,
    'family'::text AS target_type,
    fm.created_at,
    fm.created_at AS updated_at,
    fm.is_leap_month
   FROM family_members fm;
