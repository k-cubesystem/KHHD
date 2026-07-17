-- payments CHECK 제약 확장 — 테스트 충전 로그 허용
-- 어드민 결제내역 UI는 status='test_charge' 필터를 제공하지만 DB 제약(7/4 재구축 구세대)이
-- 'test_charge'/'test' 를 거부해 addTestCredits 의 로그 insert 가 항상 실패했다 (비치명이라 조용히 누락).

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_status_check
  CHECK (status = ANY (ARRAY['pending','completed','failed','refunded','wallet_failed','test_charge']));

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_bokchae_type_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_bokchae_type_check
  CHECK (bokchae_type = ANY (ARRAY['charge','subscription','test']));
