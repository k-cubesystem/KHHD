-- 결제·멤버십 취소 셀프서비스 (사유 객관식 + 메모 + 손실 처리 기록)
--
-- 목적
--  1) 사용자가 스스로 복채 충전을 취소하고 멤버십을 해지할 수 있게 하되, 그 판정 근거를 남긴다.
--  2) 이미 써버린 복채를 회수하지 못한 만큼(손실 처리)을 **금액으로** 기록해 어드민이 볼 수 있게 한다.
--  3) 취소 사유 분포를 나중에 집계할 수 있도록 사유 코드를 정형으로 저장한다(v1 은 저장까지만).
--
-- 규율
--  * 이 표에 쓰는 주체는 service_role(서버 액션) 뿐이다 — INSERT/UPDATE 정책을 일부러 만들지 않는다.
--    사용자는 자기 요청을 «읽기»만 할 수 있고, 어드민은 전부 읽을 수 있다.
--  * 지갑 잔액은 이 표가 건드리지 않는다. 회수는 기존 `clawback_payment_credits` RPC 단일 경로.
--  * 멱등: 요청 1건 = 토스 `Idempotency-Key` 1개. 재시도는 같은 행·같은 키를 다시 쓴다.

-- ── 1. 취소 요청 원장 ──
CREATE TABLE IF NOT EXISTS public.payment_cancel_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 대상
  kind text NOT NULL CHECK (kind IN ('CHARGE', 'MEMBERSHIP')),
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  subscription_payment_id uuid REFERENCES public.subscription_payments(id) ON DELETE SET NULL,

  -- 사유(객관식) + 메모(선택, 「기타」는 필수). 메모는 앱에서 정규화 후 저장한다.
  reason_code text NOT NULL CHECK (
    reason_code IN ('MISTAKE', 'NOT_AS_EXPECTED', 'DEFECT', 'PRICE', 'LOW_USAGE', 'OTHER')
  ),
  reason_memo text CHECK (reason_memo IS NULL OR char_length(reason_memo) <= 300),

  -- 판정 스냅샷(요청 시점) — 나중에 분쟁이 나면 이 값으로 재현한다.
  verdict text NOT NULL CHECK (
    verdict IN ('FULL_REFUNDABLE', 'PARTIALLY_SPENT', 'NOT_CANCELLABLE', 'PERIOD_END', 'IMMEDIATE_REFUND')
  ),
  accepted_loss boolean NOT NULL DEFAULT false,
  granted_credits integer NOT NULL DEFAULT 0,
  ledger_remaining integer NOT NULL DEFAULT 0,
  recoverable_credits integer NOT NULL DEFAULT 0,

  -- 손실 처리 — 회수하지 못해 회사가 떠안는 몫. 사용자에게 청구하지 않는다(CEO 결정).
  loss_credits integer NOT NULL DEFAULT 0,
  loss_amount integer NOT NULL DEFAULT 0,

  -- 금액
  gross_amount integer NOT NULL DEFAULT 0,
  fee_amount integer NOT NULL DEFAULT 0,
  refund_amount integer NOT NULL DEFAULT 0,
  within_withdrawal_period boolean,
  elapsed_days integer,

  -- 처리 상태
  status text NOT NULL DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED', 'SUCCEEDED', 'FAILED')),
  idempotency_key text NOT NULL,
  toss_error_code text,
  toss_error_message text,
  clawed_credits integer NOT NULL DEFAULT 0,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

COMMENT ON TABLE public.payment_cancel_requests IS
  '결제·멤버십 취소 셀프서비스 요청 원장. 사유·판정 스냅샷·손실 처리액 보관. 쓰기는 service_role 전용.';
COMMENT ON COLUMN public.payment_cancel_requests.loss_credits IS
  '이미 사용해 회수하지 못한 복채(만냥). 사용자에게 청구하지 않고 손실 처리한다.';
COMMENT ON COLUMN public.payment_cancel_requests.loss_amount IS
  'loss_credits 의 결제액 환산(원). 어드민 손실 집계 기준.';
COMMENT ON COLUMN public.payment_cancel_requests.idempotency_key IS
  '토스 Idempotency-Key(최대 300자). 재시도 시 같은 값을 다시 보낸다.';

CREATE UNIQUE INDEX IF NOT EXISTS payment_cancel_requests_idem_uidx
  ON public.payment_cancel_requests (idempotency_key);

CREATE INDEX IF NOT EXISTS payment_cancel_requests_user_idx
  ON public.payment_cancel_requests (user_id, created_at DESC);

-- 진행 중(REQUESTED)인 요청이 결제 1건당 하나만 살아 있게 한다 — 따닥 방어.
CREATE UNIQUE INDEX IF NOT EXISTS payment_cancel_requests_open_payment_uidx
  ON public.payment_cancel_requests (payment_id)
  WHERE payment_id IS NOT NULL AND status = 'REQUESTED';

-- 어드민 손실 조회용.
CREATE INDEX IF NOT EXISTS payment_cancel_requests_loss_idx
  ON public.payment_cancel_requests (created_at DESC)
  WHERE loss_credits > 0;

-- updated_at 자동 갱신.
-- ⚠️ 라이브 DB의 public 스키마에는 공용 `update_updated_at_column()` 이 없다(storage 스키마에만 있음).
--    코어 마이그레이션이 만든다고 가정하면 트리거 생성이 42883 으로 죽는다 → 전용 함수를 여기서 만든다.
CREATE OR REPLACE FUNCTION public.touch_payment_cancel_requests()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payment_cancel_requests_updated_at ON public.payment_cancel_requests;
CREATE TRIGGER payment_cancel_requests_updated_at
  BEFORE UPDATE ON public.payment_cancel_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_payment_cancel_requests();

-- ── 2. RLS — 본인 조회 + 어드민 조회. 쓰기 정책 없음(service_role 전용) ──
ALTER TABLE public.payment_cancel_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "취소 요청 본인 조회" ON public.payment_cancel_requests;
CREATE POLICY "취소 요청 본인 조회" ON public.payment_cancel_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "취소 요청 어드민 조회" ON public.payment_cancel_requests;
CREATE POLICY "취소 요청 어드민 조회" ON public.payment_cancel_requests
  FOR SELECT TO authenticated
  USING (public.is_admin());

REVOKE ALL ON public.payment_cancel_requests FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.payment_cancel_requests FROM authenticated;
GRANT SELECT ON public.payment_cancel_requests TO authenticated;

-- ── 3. 멤버십 부분 환불 감사 흔적 ──
-- 멤버십 중도 해지는 마지막 성공 결제를 **부분 취소**한다. 부분 취소는 토스에서 status 가
-- 'PARTIAL_CANCELED' 로 남으므로, 우리 쪽 기록에도 취소 «금액»을 따로 적어둬야 매출이 맞는다.
ALTER TABLE public.subscription_payments ADD COLUMN IF NOT EXISTS cancelled_amount integer NOT NULL DEFAULT 0;
ALTER TABLE public.subscription_payments ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

COMMENT ON COLUMN public.subscription_payments.cancelled_amount IS
  '누적 취소·환불 금액(원). 중도 해지 일할 환불 포함. 전액 취소여야만 status 가 CANCELLED 가 된다.';
