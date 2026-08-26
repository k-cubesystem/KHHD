-- 「내게 필요한 기운」 선물 확정 + 기운 프로필 UPDATE 가드 (2026-08-26)
--
-- ① 선물을 행으로 확정할 수 있게 source 에 'saju' 를 허용한다.
--    선물 판정의 근거 두 표가 모두 사용자가 직접 쓸 수 있는 자리다
--    (analysis_history 는 본인 행 INSERT 가능, user_energy_profile 은 본인 행 UPDATE 가능).
--    그래서 매 호출 재계산이던 동안에는 용신을 바꿔가며 오행 5장(3만냥 팩)을 0원에
--    가져갈 수 있었다. 한 번 받은 선물을 행으로 굳히면 위조해도 «원래 받았을 1장»을 넘지 못한다.
--
-- ② user_energy_profile 의 UPDATE 정책에 WITH CHECK 가 없었다.
--    USING 만 있으면 «내 행을 고를» 수는 제한되지만 «고친 결과»는 검사하지 않는다 —
--    즉 user_id 를 남의 것으로 바꾸는 UPDATE 도 통과한다. 선물과 별개의 구멍이다.

ALTER TABLE public.wallpaper_unlocks DROP CONSTRAINT IF EXISTS wallpaper_unlocks_source_check;
ALTER TABLE public.wallpaper_unlocks
  ADD CONSTRAINT wallpaper_unlocks_source_check
  CHECK (source IN ('purchase', 'ad', 'saju'));

DROP POLICY IF EXISTS "energy_profile_update_own" ON public.user_energy_profile;
CREATE POLICY "energy_profile_update_own"
  ON public.user_energy_profile FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
