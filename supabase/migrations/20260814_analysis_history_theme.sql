-- 인기테마운세 개별 풀이 저장 허용 (마스터 기획 §7-2)
--
-- 배경: analysis_history.category CHECK 제약이 새 값을 허용하지 않으면 저장이 통째로 실패한다.
--       2026-07-23 'SAMHAP' 이 정확히 이 제약에 막힌 전력이 있다(20260723_analysis_history_samhap.sql).
--       테마 풀이는 저장이 곧 **7일 캐시**라, 막히면 사용자가 같은 풀이에 복채를 다시 낸다.
--
-- 🔴 적용 순서: 이 제약은 **넓히는(permissive) 변경**이라 코드 배포보다 먼저 적용해도 안전하고,
--    오히려 먼저 적용해야 한다. 「코드 배포 → 회귀 확인 → 제약 변경」 순서는 좁히는(restrictive)
--    정책 마이그레이션의 규율이다 — 여기에 그대로 적용하면 배포 직후 SAMHAP 사고가 재현된다.
--
-- 방식: 기존 제약을 드롭하고 'THEME' 을 추가한 동일 제약으로 재생성(다른 값은 불변).
ALTER TABLE public.analysis_history DROP CONSTRAINT IF EXISTS analysis_history_category_check;

ALTER TABLE public.analysis_history
  ADD CONSTRAINT analysis_history_category_check
  CHECK (
    category = ANY (
      ARRAY['SAJU', 'FACE', 'HAND', 'FENGSHUI', 'COMPATIBILITY', 'TODAY', 'WEALTH', 'NEW_YEAR', 'SAMHAP', 'THEME']
    )
  );
