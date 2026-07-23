-- 삼합(三合) 종합 리포트 저장 허용 (B-4)
-- 배경: analysis_history.category CHECK 제약이 'SAMHAP' 을 허용하지 않아 삼합 리포트 저장이 막혔다.
-- 방식: 기존 제약을 드롭하고 'SAMHAP' 을 추가한 동일 제약으로 재생성(다른 값은 불변).
ALTER TABLE public.analysis_history DROP CONSTRAINT IF EXISTS analysis_history_category_check;

ALTER TABLE public.analysis_history
  ADD CONSTRAINT analysis_history_category_check
  CHECK (
    category = ANY (
      ARRAY['SAJU', 'FACE', 'HAND', 'FENGSHUI', 'COMPATIBILITY', 'TODAY', 'WEALTH', 'NEW_YEAR', 'SAMHAP']
    )
  );
