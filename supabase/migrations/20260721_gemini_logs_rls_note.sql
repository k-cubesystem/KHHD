-- ============================================================
-- gemini_api_logs — RLS 정책 현황 명문화 (재구축 대비)
-- 2026-07-21 (세션26 · 비용 계측 수복 P0 동반 문서화)
--
-- 배경(P0): logUsage(lib/services/gemini-rate-limiter.ts)가 과거 유저 세션
--   클라이언트로 insert 하여, 아래 RLS(관리자 ALL + 유저 SELECT, INSERT 정책 없음)에
--   막혀 일반 유저 호출 로그가 전멸했다("new row violates row-level security").
--   수복: logUsage 는 createAdminClient(service_role)로 insert 한다.
--   service_role 은 RLS 를 우회하므로 유저 INSERT 정책은 의도적으로 두지 않는다
--   (유저가 임의 로그를 위조·주입하지 못하게 하는 보안 결정).
--
-- 이 마이그레이션은 스키마를 바꾸지 않는다 — 정책을 멱등 재확인하고 의도를 주석으로 남긴다.
-- ============================================================

ALTER TABLE gemini_api_logs ENABLE ROW LEVEL SECURITY;

-- 관리자: 전체 접근 (대시보드·집계 RPC 는 SECURITY DEFINER 라 별개)
DROP POLICY IF EXISTS "admin_all_gemini_logs" ON gemini_api_logs;
CREATE POLICY "admin_all_gemini_logs" ON gemini_api_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 유저: 본인 로그만 조회 (INSERT/UPDATE/DELETE 불가 — 쓰기는 service_role 전용)
DROP POLICY IF EXISTS "user_own_gemini_logs" ON gemini_api_logs;
CREATE POLICY "user_own_gemini_logs" ON gemini_api_logs
  FOR SELECT USING (user_id = auth.uid());

COMMENT ON TABLE gemini_api_logs IS
  'Gemini/Claude 호출 사용량·비용 로그. 쓰기는 service_role(createAdminClient) 전용 — '
  'RLS 에 유저 INSERT 정책 없음(위조 방지). 관리자 ALL + 유저 SELECT(본인). '
  '방출 action_type ↔ 라벨: lib/domain/gemini/actions.ts. 단가: lib/domain/gemini/pricing.ts.';
