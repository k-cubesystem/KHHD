-- ════════════════════════════════════════════════════════════════
-- Threads 주간 보고서 (S5) — 2026-08-19
--
-- 크론(월 09:00 KST)이 지난 한 주(월~일 KST)를 집계해 한 행으로 굳힌다.
-- 🔴 왜 «저장»하나: 인사이트 API 는 현재 값만 준다 — 주가 지나면 그 주의 조회수를
--    되찾을 방법이 없다. 굳혀두지 않으면 주 대비 비교(WoW)가 영원히 불가능해진다.
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS threads_reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start DATE NOT NULL,                       -- 월요일 (KST)
  period_end   DATE NOT NULL,                       -- 일요일 (KST, 포함)
  metrics      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT threads_reports_period_uniq UNIQUE (period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_threads_reports_period ON threads_reports (period_start DESC);

ALTER TABLE threads_reports ENABLE ROW LEVEL SECURITY;

-- 관리자 전권 (서버 액션은 role 검사를 안 하므로 이것이 최종 방어)
CREATE POLICY threads_reports_admin ON threads_reports
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
