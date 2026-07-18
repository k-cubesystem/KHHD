-- 가족 신당 공개 옵션 (P3-16)
-- 배경: 가족별 신당 도입 시 **가족 이름 노출 방지**를 위해 RLS 가 가족 신당을 공개 조회에서
--       무조건 제외했다(shrines_public_read: visibility='public' AND family_member_id IS NULL).
--       그래서 소유자가 공개로 바꿔도 아무 효과가 없었다.
-- 조치: 소유자가 명시적으로 공개 전환한 가족 신당은 공개 조회를 허용한다.
--       기본값은 비공개 유지(신규 가족 신당은 visibility='private' 로 생성) — opt-in.
-- ⚠️ 공개 시 신당 이름("○○의 신당")으로 가족 이름이 드러난다. UI에서 이 점을 반드시 고지할 것.

DROP POLICY IF EXISTS "shrines_public_read" ON public.shrines;
CREATE POLICY "shrines_public_read" ON public.shrines
  FOR SELECT USING (visibility = 'public' OR auth.uid() = user_id);
