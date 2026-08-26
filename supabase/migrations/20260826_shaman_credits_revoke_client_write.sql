-- 질문권 표의 클라이언트 직접 쓰기 정책 제거 — repo↔라이브 드리프트 봉합 (2026-08-26)
--
-- 라이브는 이미 안전하다(RLS 활성 + SELECT 정책 하나뿐, 실측 확인). 그런데
-- 정책을 만든 마이그레이션(ai/20260218_shaman_question_credits.sql)에는
-- authenticated 의 INSERT·UPDATE 정책이 그대로 남아 있고, 그것을 걷어낸
-- 마이그레이션이 어디에도 없다. 즉 **DB 를 재구축하면 되살아난다.**
--
-- 되살아나면: 로그인 사용자가 PostgREST 로 자기 행에
-- `purchased_credits = 99999` 를 PATCH 할 수 있고 consume RPC 가 그대로 차감한다.
-- 무료 일일분 폐지(2026-08-25) 이후 속풀이 수익 구조 전체가 이 표 위에 있다.
--
-- 🔴 이 저장소가 반복해 온 패턴이다 — 라이브만 고치고 SQL 을 안 남긴다.
--    (같은 계열: cap_exempt BONUS·복채 문구·wallets 자가발행 벡터)
--
-- 쓰기 경로는 전부 service_role RPC(add/consume/refund_shaman_credit,
-- grant_onboarding_credit 등)를 거치므로 이 제거로 깨지는 코드 경로는 없다.

DROP POLICY IF EXISTS "Users can insert own shaman credits" ON public.shaman_question_credits;
DROP POLICY IF EXISTS "Users can update own shaman credits" ON public.shaman_question_credits;

-- 읽기만 남긴다(본인 행). 쓰기는 service_role 전용.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'shaman_question_credits'
      AND cmd = 'SELECT'
  ) THEN
    CREATE POLICY "shaman_credits_select_own"
      ON public.shaman_question_credits FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;
