-- ============================================
-- 결제 수단 변경 — 인증이 끝나기 «전»의 새 customerKey 를 두는 자리
-- ============================================
--
-- 🔴 왜 칸이 하나 더 필요한가
--   예전에는 토스 인증창을 «열기 전»에 subscriptions.customer_key 를 새 값으로 덮어썼다.
--   회원이 인증을 중간에 그만두거나 실패하면 빌링키는 옛 customerKey 에 묶인 채 customer_key 만
--   새 값이 되어, 다음 갱신 청구가 토스에서 키 불일치로 거절되고 재시도 3회 뒤 PAYMENT_FAILED 가 됐다.
--   대기 중인 키를 따로 두면 인증이 «성공한 뒤»에만 billing_key 와 함께 한 번에 바뀐다.
--
-- 🔴 이 마이그레이션은 배포보다 «먼저» 적용한다. 칸이 없으면 새 코드의 접수 UPDATE 가 죽는다.
--   (칸을 더하는 것뿐이라 구 코드는 이 칸을 보지 않는다 — 먼저 적용해도 안전하다.)

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS pending_customer_key text;

COMMENT ON COLUMN public.subscriptions.pending_customer_key IS
  '결제 수단 변경 인증을 기다리는 customerKey. 인증 성공 시 customer_key·billing_key 와 함께 한 번에 비워진다.';

-- 복귀 화면이 이 칸으로 구독을 찾는다(대기 중인 행만 — 평소엔 전부 NULL 이라 색인이 거의 비어 있다).
CREATE INDEX IF NOT EXISTS idx_subscriptions_pending_customer_key
  ON public.subscriptions (pending_customer_key)
  WHERE pending_customer_key IS NOT NULL;
