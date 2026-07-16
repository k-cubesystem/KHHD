-- 가족별 신당 (P1) — 신당을 점사 대상(본인/가족)별로 확장
-- 근거: TEAM_G_DESIGN/prd/PLAN-family-shrine-chat-v1.md §1
-- 전제: PostgreSQL 17 (UNIQUE NULLS NOT DISTINCT). 기존 행은 family_member_id=NULL(본인 신당)로 자연 호환.

-- ============================================================
-- 1. shrines.family_member_id — NULL=본인 신당. 가족 삭제 시 신당 CASCADE.
-- ============================================================
ALTER TABLE public.shrines
  ADD COLUMN IF NOT EXISTS family_member_id uuid REFERENCES public.family_members(id) ON DELETE CASCADE;
COMMENT ON COLUMN public.shrines.family_member_id IS '점사 대상 가족 (NULL=본인 신당). UNIQUE(user_id, family_member_id) NULLS NOT DISTINCT.';

-- UNIQUE(user_id) → UNIQUE(user_id, family_member_id) 교체 (NULLS NOT DISTINCT: 본인 신당도 1개 보장)
ALTER TABLE public.shrines DROP CONSTRAINT IF EXISTS shrines_user_id_key;
DO $$ BEGIN
  ALTER TABLE public.shrines
    ADD CONSTRAINT shrines_user_family_key UNIQUE NULLS NOT DISTINCT (user_id, family_member_id);
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL;
END $$;

-- FK CASCADE 삭제 성능용 인덱스
CREATE INDEX IF NOT EXISTS idx_shrines_family_member
  ON public.shrines(family_member_id) WHERE family_member_id IS NOT NULL;

-- 교차 소유 차단: 신당의 family_member 는 반드시 같은 user 소유여야 한다 (RLS는 user_id만 검사하므로 트리거로 보강)
CREATE OR REPLACE FUNCTION public.check_shrine_family_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.family_member_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.id = NEW.family_member_id AND fm.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'FAMILY_MEMBER_NOT_OWNED' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_shrine_family_owner ON public.shrines;
CREATE TRIGGER trg_shrine_family_owner
  BEFORE INSERT OR UPDATE OF family_member_id ON public.shrines
  FOR EACH ROW EXECUTE FUNCTION public.check_shrine_family_owner();

-- 가족 신당은 공개 조회 대상에서 제외 (가족 이름 노출 방지) — 소유자만 조회
DROP POLICY IF EXISTS "shrines_public_read" ON public.shrines;
CREATE POLICY "shrines_public_read" ON public.shrines
  FOR SELECT USING ((visibility = 'public' AND family_member_id IS NULL) OR auth.uid() = user_id);

-- ============================================================
-- 2. user_deity_bonds.family_member_id — 인연(緣)을 신당(점사 대상)별로 스코프
-- ============================================================
ALTER TABLE public.user_deity_bonds
  ADD COLUMN IF NOT EXISTS family_member_id uuid REFERENCES public.family_members(id) ON DELETE CASCADE;
COMMENT ON COLUMN public.user_deity_bonds.family_member_id IS '인연 스코프 대상 가족 (NULL=본인 신당의 인연).';

ALTER TABLE public.user_deity_bonds DROP CONSTRAINT IF EXISTS user_deity_bonds_user_id_deity_id_key;
DO $$ BEGIN
  ALTER TABLE public.user_deity_bonds
    ADD CONSTRAINT user_deity_bonds_user_deity_fm_key UNIQUE NULLS NOT DISTINCT (user_id, deity_id, family_member_id);
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_deity_bonds_family_member
  ON public.user_deity_bonds(family_member_id) WHERE family_member_id IS NOT NULL;

-- ============================================================
-- 3. award_deity_bond RPC — 가족 스코프 파라미터 추가
--    (기존 3-인자 시그니처는 DROP — 4번째 인자 DEFAULT NULL이 있으면 3-인자 호출이 모호해짐)
-- ============================================================
DROP FUNCTION IF EXISTS public.award_deity_bond(uuid, uuid, integer);

CREATE OR REPLACE FUNCTION public.award_deity_bond(
  p_user_id uuid,
  p_deity_id uuid,
  p_points integer,
  p_family_member_id uuid DEFAULT NULL
)
 RETURNS TABLE(bond_level integer, bond_points integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE v_points integer;
BEGIN
  IF p_points <= 0 THEN
    RAISE EXCEPTION 'INVALID_POINTS: must be positive, got %', p_points;
  END IF;

  INSERT INTO public.user_deity_bonds (user_id, deity_id, family_member_id, bond_points, bond_level, updated_at)
  VALUES (p_user_id, p_deity_id, p_family_member_id, p_points, 1, now())
  ON CONFLICT (user_id, deity_id, family_member_id) DO UPDATE
    SET bond_points = user_deity_bonds.bond_points + p_points, updated_at = now()
  RETURNING user_deity_bonds.bond_points INTO v_points;

  UPDATE public.user_deity_bonds
  SET bond_level = CASE
    WHEN v_points >= 700 THEN 4
    WHEN v_points >= 300 THEN 3
    WHEN v_points >= 100 THEN 2
    ELSE 1 END
  WHERE user_id = p_user_id AND deity_id = p_deity_id
    AND family_member_id IS NOT DISTINCT FROM p_family_member_id
  RETURNING user_deity_bonds.bond_level, user_deity_bonds.bond_points
  INTO award_deity_bond.bond_level, award_deity_bond.bond_points;

  RETURN NEXT;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.award_deity_bond(uuid, uuid, integer, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_deity_bond(uuid, uuid, integer, uuid) TO service_role;
