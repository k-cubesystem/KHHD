-- 둘·셋·넷 함께 보는 AI 분석 — circle_narratives.kind 에 'together' 허용 (2026-09-12)
ALTER TABLE public.circle_narratives DROP CONSTRAINT IF EXISTS circle_narratives_kind_check;
ALTER TABLE public.circle_narratives
  ADD CONSTRAINT circle_narratives_kind_check CHECK (kind IN ('prescription', 'circle', 'together'));
