-- 기운 프로필 가족 스코프 확장 (P2-13)
-- 배경: user_energy_profile 은 PK가 user_id 라 **본인만** 저장 가능했고,
--       가족 신당의 기운은 매번 사주에서 즉석 계산했다(관상·손금 보정이 낄 자리가 없음).
--       또한 face_modifier/palm_modifier 컬럼은 설계만 되고 **적용하는 코드가 없었다**(죽은 컬럼).
-- 조치: family_member_id 를 추가하고 PK 를 (user_id, family_member_id) 로 교체해
--       본인·가족 모두 같은 구조로 보정을 저장·적용할 수 있게 한다. NULL = 본인.

ALTER TABLE public.user_energy_profile
  ADD COLUMN IF NOT EXISTS family_member_id uuid REFERENCES public.family_members(id) ON DELETE CASCADE;
COMMENT ON COLUMN public.user_energy_profile.family_member_id IS '기운 프로필 대상 가족 (NULL=본인).';

-- PK(user_id) → UNIQUE NULLS NOT DISTINCT(user_id, family_member_id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.user_energy_profile'::regclass AND contype = 'p'
  ) THEN
    ALTER TABLE public.user_energy_profile DROP CONSTRAINT user_energy_profile_pkey;
  END IF;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE public.user_energy_profile
  ADD COLUMN IF NOT EXISTS id uuid NOT NULL DEFAULT gen_random_uuid();

DO $$ BEGIN
  ALTER TABLE public.user_energy_profile ADD PRIMARY KEY (id);
EXCEPTION WHEN invalid_table_definition OR duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.user_energy_profile
    ADD CONSTRAINT user_energy_profile_user_family_key UNIQUE NULLS NOT DISTINCT (user_id, family_member_id);
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_energy_profile_family
  ON public.user_energy_profile(family_member_id) WHERE family_member_id IS NOT NULL;

COMMENT ON COLUMN public.user_energy_profile.face_modifier IS '관상 오행 보정 {wood:±n,...}. 생산자(프롬프트 오행형 출력)는 별도 결정 대기 — 값이 들어오면 즉시 반영된다.';
COMMENT ON COLUMN public.user_energy_profile.palm_modifier IS '손금 오행 보정 {wood:±n,...}. 생산자 대기(위와 동일).';
