-- ============================================
-- saju_records 테이블에 INSERT 정책 추가
-- ============================================

-- 기존 정책 확인 및 INSERT 정책 추가
DROP POLICY IF EXISTS "Users can insert own saju records" ON public.saju_records;
CREATE POLICY "Users can insert own saju records" ON public.saju_records
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.family_members
      WHERE family_members.id = member_id
      AND family_members.user_id = auth.uid()
    )
  );
