-- 사주명식/사주분석 P0 수복 (2026-07-13)
-- 증상: 만세력·분석 대상 조회가 전 사용자에게 "내 정보를 등록해주세요"로 실패.
-- 원인: 라이브 v_destiny_targets가 구세대 스키마(user_id/relationship/is_self/job/hobby/avatar_id)로
--       존재 — 코드가 기대하는 20260211 정의(owner_id/relation_type/target_type/...)와 불일치.
--       getDestinyTargets의 .eq('owner_id', ...)가 "column does not exist"로 전량 실패 → 빈 배열 폴백.
--       (2026-07-04 DB 재구축 시 뷰가 옛 정의로 복구된 것. S1a는 ALTER security_invoker만 수행.)
-- 조치: 누락 컬럼 보강 + 뷰를 코드 기대 스키마로 재생성(security_invoker 유지) + 권한 최소화.

-- 1) 뷰가 참조하는 누락 컬럼 보강 (라이브에 face_image_url은 있으나 이 둘이 없음)
ALTER TABLE public.family_members ADD COLUMN IF NOT EXISTS hand_image_url text;
ALTER TABLE public.family_members ADD COLUMN IF NOT EXISTS home_address text;

-- 2) 컬럼 구조가 달라 CREATE OR REPLACE 불가 → DROP 후 재생성 (단일 트랜잭션, 원자 적용)
DROP VIEW IF EXISTS public.v_destiny_targets;

CREATE VIEW public.v_destiny_targets
WITH (security_invoker = true) AS
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

-- 3) 권한 최소화: 뷰는 읽기 전용, 인증 사용자만 (base 테이블 RLS가 own-row 필터)
REVOKE ALL ON public.v_destiny_targets FROM PUBLIC;
REVOKE ALL ON public.v_destiny_targets FROM anon;
REVOKE ALL ON public.v_destiny_targets FROM authenticated;
GRANT SELECT ON public.v_destiny_targets TO authenticated;
GRANT SELECT ON public.v_destiny_targets TO service_role;

COMMENT ON VIEW public.v_destiny_targets IS
  '분석 대상(본인+가족) 통합 뷰 — 코드 계약: owner_id/relation_type/target_type. security_invoker로 base RLS 적용.';
