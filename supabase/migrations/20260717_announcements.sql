-- 공지사항 — 전 페이지 신 가이드 말풍선으로 노출 (어드민 작성)
-- RLS: 읽기=로그인 유저(활성 공지만), 쓰기=admin (is_admin(), S1 하드닝 함수 재사용)

CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 80),
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 500),
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcements_active
  ON public.announcements(starts_at DESC) WHERE is_active = true;

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS announcements_read_active ON public.announcements;
CREATE POLICY announcements_read_active ON public.announcements
  FOR SELECT TO authenticated
  USING (
    (is_active = true AND starts_at <= now() AND (ends_at IS NULL OR ends_at > now()))
    OR is_admin()
  );

DROP POLICY IF EXISTS announcements_admin_write ON public.announcements;
CREATE POLICY announcements_admin_write ON public.announcements
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
