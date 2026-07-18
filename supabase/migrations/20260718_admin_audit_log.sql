-- 관리자 감사 로그 (A6) — 역할변경·잔액조정·플랜편집·회원삭제 등 관리자 조작 기록
-- 근거: TEAM_G_DESIGN/prd/PLAN-improvement-roadmap-v1.md §A A6
-- RLS: admin 읽기 전용, 쓰기는 service_role 전용(서버 액션이 admin 검증 후 기록).

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,      -- 조작한 관리자
  actor_email text,                                                    -- 스냅샷(계정 삭제 후에도 추적)
  action      text NOT NULL,                                           -- balance_adjust | role_change | subscription_change | user_delete
  target_user uuid,                                                    -- 대상 회원 (있으면)
  detail      jsonb NOT NULL DEFAULT '{}'::jsonb,                      -- {before, after, reason, ...}
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON public.admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_target ON public.admin_audit_log(target_user) WHERE target_user IS NOT NULL;

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_audit_read ON public.admin_audit_log;
CREATE POLICY admin_audit_read ON public.admin_audit_log
  FOR SELECT TO authenticated USING (public.is_admin());
-- 쓰기 정책 없음 → service_role 전용
