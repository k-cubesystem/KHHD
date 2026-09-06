-- ============================================================
-- 기운 무리(群) — circles · circle_members   (PRD-energy-circle-v1 P1, ARCH §4)
-- 2026-09-04
--
-- 가족 무리는 **가상**이다(family_members.member_category='family' 에서 파생) — 여기 행이 없다.
-- 직장·모임·직접 이름 무리만 행을 만든다. 한 사람(family_members)이 여러 무리에 들어간다.
--
-- 🔴 소유 검증은 두 겹: 무리(circles.user_id)와 사람(family_members.user_id) — 남의 인연 id 를
--    내 무리에 꽂는 IDOR 를 정책이 막고, 서버 액션이 한 번 더 확인한다.
-- 🔴 컬럼 화이트리스트: authenticated 는 정해진 컬럼만 쓴다(shrines 전례). id·시각은 기본값.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.circles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 20),
  kind        text NOT NULL CHECK (kind IN ('work', 'friends', 'custom')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_circles_user_created ON public.circles (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.circle_members (
  circle_id   uuid NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  member_id   uuid NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
  -- «팀장·디자인» 같은 자유 표기(선택). 점수·등급이 아니다.
  role        text CHECK (role IS NULL OR char_length(role) <= 20),
  -- 직장 무리는 서버 액션이 NOT NULL 을 강제한다(등록 동의).
  consent_at  timestamptz,
  added_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (circle_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_circle_members_member ON public.circle_members (member_id);

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE public.circles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS circles_select_own ON public.circles;
DROP POLICY IF EXISTS circles_insert_own ON public.circles;
DROP POLICY IF EXISTS circles_update_own ON public.circles;
DROP POLICY IF EXISTS circles_delete_own ON public.circles;

CREATE POLICY circles_select_own ON public.circles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY circles_insert_own ON public.circles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY circles_update_own ON public.circles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY circles_delete_own ON public.circles
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS circle_members_select_own ON public.circle_members;
DROP POLICY IF EXISTS circle_members_insert_own ON public.circle_members;
DROP POLICY IF EXISTS circle_members_update_own ON public.circle_members;
DROP POLICY IF EXISTS circle_members_delete_own ON public.circle_members;

CREATE POLICY circle_members_select_own ON public.circle_members
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.circles c WHERE c.id = circle_id AND c.user_id = auth.uid()));

CREATE POLICY circle_members_insert_own ON public.circle_members
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.circles c WHERE c.id = circle_id AND c.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.family_members f WHERE f.id = member_id AND f.user_id = auth.uid())
  );

CREATE POLICY circle_members_update_own ON public.circle_members
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.circles c WHERE c.id = circle_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.circles c WHERE c.id = circle_id AND c.user_id = auth.uid()));

CREATE POLICY circle_members_delete_own ON public.circle_members
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.circles c WHERE c.id = circle_id AND c.user_id = auth.uid()));

-- ── 컬럼 화이트리스트 ─────────────────────────────────────────
REVOKE ALL ON public.circles        FROM anon, authenticated;
REVOKE ALL ON public.circle_members FROM anon, authenticated;

GRANT SELECT, DELETE ON public.circles TO authenticated;
GRANT INSERT (user_id, name, kind) ON public.circles TO authenticated;
GRANT UPDATE (name, updated_at)    ON public.circles TO authenticated;

GRANT SELECT, DELETE ON public.circle_members TO authenticated;
GRANT INSERT (circle_id, member_id, role, consent_at) ON public.circle_members TO authenticated;
GRANT UPDATE (role, consent_at)                       ON public.circle_members TO authenticated;
