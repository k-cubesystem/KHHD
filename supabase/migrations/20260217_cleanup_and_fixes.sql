-- ============================================================
-- Supabase 전체 분석 후 발견된 문제 수정
-- 2026-02-17
-- 수정 항목:
--   1. analysis_history.share_token 컬럼 추가 (공유 기능 수정)
--   2. ai_prompts.talisman_cost 컬럼 보장
--   3. trigger_log_signup 중복 트리거 제거 (handle_new_user와 중복)
--   4. share_token 인덱스 및 기존 데이터 정리
-- ============================================================

-- ============================================================
-- 1. analysis_history.share_token 컬럼 추가
--    (20260217_share_analysis_rpc.sql이 참조하지만 컬럼이 없음)
-- ============================================================
ALTER TABLE public.analysis_history
  ADD COLUMN IF NOT EXISTS share_token TEXT;

-- 유니크 인덱스 (share_token은 고유해야 함)
CREATE UNIQUE INDEX IF NOT EXISTS idx_analysis_history_share_token
  ON public.analysis_history(share_token)
  WHERE share_token IS NOT NULL;

-- 공개 공유된 분석 기록은 토큰으로 조회 가능 (RLS 우회 — SECURITY DEFINER RPC 사용)
COMMENT ON COLUMN public.analysis_history.share_token IS
  '공유 URL용 토큰. NULL이면 비공개. get_shared_analysis_record() RPC로만 접근.';

-- ============================================================
-- 2. ai_prompts.talisman_cost 컬럼 보장
--    (_archive/20260127_prompt_talisman_cost.sql이 archive에만 있어
--     실제 DB 적용 여부 불명확 → IF NOT EXISTS로 안전하게 보장)
-- ============================================================
ALTER TABLE public.ai_prompts
  ADD COLUMN IF NOT EXISTS talisman_cost INTEGER DEFAULT 1;

COMMENT ON COLUMN public.ai_prompts.talisman_cost IS
  '이 기능 사용에 필요한 복채 수. 기본값 1 (1만원).';

-- ============================================================
-- 3. trigger_log_signup 중복 제거
--    문제: profiles INSERT 시 두 곳에서 activity_logs에 signup 기록
--      (A) on_auth_user_created → handle_new_user → activity_logs INSERT
--      (B) trigger_log_signup → log_user_signup → activity_logs INSERT
--    결과: 가입 1회에 signup 이벤트 2건 → 트래픽 차트 신규가입 수 2배
--    수정: handle_new_user에 이미 포함됐으므로 (B) 제거
-- ============================================================
DROP TRIGGER IF EXISTS trigger_log_signup ON public.profiles;

-- 함수는 유지 (다른 곳에서 참조할 수 있으므로)
-- DROP FUNCTION IF EXISTS public.log_user_signup();

-- ============================================================
-- 4. activity_logs INSERT 정책 — service_role 허용 확인
--    (트리거에서 SECURITY DEFINER 없이 INSERT하면 RLS 막힐 수 있음)
-- ============================================================
DO $$
BEGIN
  -- service_role INSERT 정책이 없으면 추가
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'activity_logs'
      AND policyname = 'service_role_insert_activity_logs'
  ) THEN
    CREATE POLICY "service_role_insert_activity_logs"
      ON public.activity_logs
      FOR INSERT
      WITH CHECK (true);  -- 트리거 함수(SECURITY DEFINER)에서 호출 허용
  END IF;
END $$;

-- ============================================================
-- 5. analysis_history 관리자 접근 정책 확인
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'analysis_history'
      AND policyname = 'Admins can view all analysis history'
  ) THEN
    CREATE POLICY "Admins can view all analysis history"
      ON public.analysis_history
      FOR SELECT
      USING (EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
      ));
  END IF;
END $$;

-- ============================================================
-- 완료 메시지
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE '=== 20260217_cleanup_and_fixes 완료 ===';
  RAISE NOTICE '[FIX 1] analysis_history.share_token 컬럼 추가';
  RAISE NOTICE '[FIX 2] ai_prompts.talisman_cost 컬럼 보장';
  RAISE NOTICE '[FIX 3] trigger_log_signup 중복 트리거 제거';
  RAISE NOTICE '[FIX 4] activity_logs INSERT 정책 확인';
  RAISE NOTICE '[FIX 5] analysis_history 관리자 정책 확인';
END $$;
