-- =====================================================================
-- 복채(잔액) → 이용권 체계 전환 ① 추가분 (2026-09-18)
-- 설계: TEAM_G_DESIGN/prd/PRD-voucher-system-v1.md · architecture/ARCH-voucher-system-v1.md
--
-- 🔴 이 파일은 «옛 코드가 그대로 돌아도 안전한 것»만 담는다 — 표·함수·열 추가, 비활성 상품 행.
--    적용 순서: ① 이 파일(코드 배포 전) → ② 코드 배포 → ③ 20260918b_voucher_cutover.sql(배포 직후)
--    옛 객체(wallets·wallet_transactions·복채 RPC)는 지우지 않는다 — 되돌리기 레버로 남긴다.
--
-- 🔴 이 리포에는 마이그레이션 자동 적용 파이프라인이 없다 — 사람이 Supabase MCP 로 적용한다.
-- =====================================================================


-- ── 1. 이용권 발급 원장 ─────────────────────────────────────────────
-- 발급 1건 = 행 1개. 누적 잔액 칸을 두지 않는다.
-- 남은 장수 = quantity − consumed − revoked. 만료(expires_at)가 지나면 쓸 수 없다.
-- expires_at IS NULL 은 «기한 없음» — 복채에서 옮겨 온 이관분 전용(소급 만료 금지).

CREATE TABLE IF NOT EXISTS public.entitlement_grants (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope           text NOT NULL DEFAULT 'reading' CHECK (scope IN ('reading')),
  source          text NOT NULL CHECK (source IN ('purchase', 'onboarding', 'referral', 'migration', 'admin', 'reward')),
  quantity        integer NOT NULL CHECK (quantity > 0),
  consumed        integer NOT NULL DEFAULT 0 CHECK (consumed >= 0),
  revoked         integer NOT NULL DEFAULT 0 CHECK (revoked >= 0),
  expires_at      timestamptz,
  payment_id      uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  idempotency_key text,
  note            text,
  issued_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT entitlement_grants_units_chk CHECK (consumed + revoked <= quantity)
);

COMMENT ON TABLE public.entitlement_grants IS
  '이용권 발급 원장. 발급 1건 = 행 1개(누적 잔액 칸 없음). 쓰기는 service_role RPC(ent_*) 전용.';
COMMENT ON COLUMN public.entitlement_grants.expires_at IS
  'NULL = 기한 없음. 복채 이관분(source=migration)만 NULL 을 쓴다 — 「만료 없이 사용」으로 판 것에 소급 만료 금지.';

CREATE UNIQUE INDEX IF NOT EXISTS entitlement_grants_idem_uidx
  ON public.entitlement_grants (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS entitlement_grants_payment_uidx
  ON public.entitlement_grants (payment_id) WHERE payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS entitlement_grants_live_idx
  ON public.entitlement_grants (user_id, expires_at) WHERE consumed + revoked < quantity;


-- ── 2. 멤버십 월 사용량 ────────────────────────────────────────────
-- 이월 없음 = 창(period_start)이 바뀌면 새 행. 창은 구독 시작일에 앵커한 한 달(서버가 계산해 넘긴다).

CREATE TABLE IF NOT EXISTS public.subscription_usage (
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start timestamptz NOT NULL,
  scope        text NOT NULL DEFAULT 'reading' CHECK (scope IN ('reading')),
  used         integer NOT NULL DEFAULT 0 CHECK (used >= 0),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, period_start, scope)
);

COMMENT ON TABLE public.subscription_usage IS
  '멤버십 월 이용권 사용량. 창(period_start)마다 행이 갈린다 — 이월 없음. 쓰기는 ent_consume/ent_refund 전용.';


-- ── 3. 이용권 원장 (발급·사용·되돌림·회수 전부) ─────────────────────
-- 환불 산식·감사·결제 심사 «사용처» 화면의 근거.

CREATE TABLE IF NOT EXISTS public.entitlement_ledger (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind            text NOT NULL CHECK (kind IN ('grant', 'consume', 'refund', 'revoke')),
  pocket          text NOT NULL CHECK (pocket IN ('membership', 'pass')),
  grant_id        uuid REFERENCES public.entitlement_grants(id) ON DELETE SET NULL,
  window_start    timestamptz,
  units           integer NOT NULL CHECK (units >= 0),
  feature_key     text,
  idempotency_key text,
  refund_of       uuid REFERENCES public.entitlement_ledger(id) ON DELETE SET NULL,
  refunded_at     timestamptz,
  note            text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT entitlement_ledger_consume_units_chk CHECK (kind <> 'consume' OR units > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS entitlement_ledger_idem_uidx
  ON public.entitlement_ledger (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS entitlement_ledger_user_idx
  ON public.entitlement_ledger (user_id, created_at DESC);


-- ── 4. RLS — 읽기만 본인에게. 쓰기 정책을 두지 않는다 ─────────────────
-- 🔴 칸 단위 GRANT 를 쓰지 않는다 — PostgREST upsert 가 기본 키까지 SET 에 넣어 42501 을
--    내는 함정(2026-09-14 그룹 사람 넣기 0건 사고)을 구조적으로 피한다. 쓰기는 전부 RPC.

ALTER TABLE public.entitlement_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entitlement_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS entitlement_grants_select_own ON public.entitlement_grants;
CREATE POLICY entitlement_grants_select_own ON public.entitlement_grants
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS subscription_usage_select_own ON public.subscription_usage;
CREATE POLICY subscription_usage_select_own ON public.subscription_usage
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS entitlement_ledger_select_own ON public.entitlement_ledger;
CREATE POLICY entitlement_ledger_select_own ON public.entitlement_ledger
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.entitlement_grants FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.subscription_usage FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.entitlement_ledger FROM anon, authenticated;


-- ── 5. 상품 — 이용권 팩 (price_plans 재사용, 비활성으로 넣는다) ──────────
-- 🔴 옛 코드는 price_plans 의 «활성 행 전부»를 복채 팩으로 그린다. 이용권 행을 여기서 켜면
--    옛 결제 승인이 이용권 가격에 복채를 지급한다 → 활성화는 전환 파일(배포 직후)에서.
-- 🔴 화면 문구의 정본은 features(DB)다 — 코드 상수는 조회 실패 폴백일 뿐이다.

ALTER TABLE public.price_plans ADD COLUMN IF NOT EXISTS product_kind text NOT NULL DEFAULT 'bokchae';
ALTER TABLE public.price_plans ADD COLUMN IF NOT EXISTS valid_days integer;

ALTER TABLE public.price_plans DROP CONSTRAINT IF EXISTS price_plans_product_kind_check;
ALTER TABLE public.price_plans ADD CONSTRAINT price_plans_product_kind_check
  CHECK (product_kind IN ('bokchae', 'pass'));

COMMENT ON COLUMN public.price_plans.product_kind IS
  'bokchae = 폐지된 복채 충전 팩(보존용) · pass = 이용권 팩. 새 코드는 pass 만 읽는다.';
COMMENT ON COLUMN public.price_plans.valid_days IS
  '이용권 유효기간(일). 결제일로부터. 토스 충전업종 기준(1년 이내)보다 짧게 둔다.';

INSERT INTO public.price_plans
  (name, description, credits, price, bonus_credits, badge_text, features, is_active, sort_order, product_kind, valid_days)
VALUES
  ('이용권 1장', '풀이 1회를 볼 수 있는 이용권', 1, 4800, 0, NULL,
   ARRAY['풀이 1회 (심층 풀이는 2장)', '유효기간 — 결제일로부터 90일', '미사용분은 환불할 수 있어요'],
   false, 101, 'pass', 90),
  ('이용권 5장', '풀이 5회를 볼 수 있는 이용권', 5, 19800, 0, NULL,
   ARRAY['풀이 5회 (심층 풀이는 2장)', '유효기간 — 결제일로부터 90일', '미사용분은 환불할 수 있어요'],
   false, 102, 'pass', 90),
  ('이용권 10장', '풀이 10회를 볼 수 있는 이용권', 10, 39800, 0, NULL,
   ARRAY['풀이 10회 (심층 풀이는 2장)', '유효기간 — 결제일로부터 90일', '미사용분은 환불할 수 있어요'],
   false, 103, 'pass', 90)
ON CONFLICT (name) DO NOTHING;


-- ── 6. 결제 기록 — 이용권 결제를 구분할 값 ──────────────────────────
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_bokchae_type_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_bokchae_type_check
  CHECK (bokchae_type IN ('charge', 'subscription', 'test', 'pass'));

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_status_check
  CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'wallet_failed', 'test_charge', 'grant_failed'));

COMMENT ON COLUMN public.payments.bokchae_type IS
  'charge = 폐지된 복채 충전 · pass = 이용권 구매 · subscription · test. (열 이름은 역사적 이유로 유지)';


-- ── 7. 멤버십 — 월 이용권 장수 ─────────────────────────────────────
-- 옛 코드는 이 열을 읽지 않는다 → 지금 넣어도 안전하다.
-- 값 근거: 옛 월 복채(10·30·100만냥) ÷ 사주 2만냥 = 5·15·50 — 이용자가 체감하는 양을 그대로 보전.
ALTER TABLE public.membership_plans ADD COLUMN IF NOT EXISTS monthly_passes integer NOT NULL DEFAULT 0;
COMMENT ON COLUMN public.membership_plans.monthly_passes IS
  '결제 주기(월)마다 쓸 수 있는 이용권 장수. 이월 없음 — 주기가 바뀌면 다시 이 값부터.';

UPDATE public.membership_plans SET monthly_passes = 5  WHERE tier = 'SINGLE';
UPDATE public.membership_plans SET monthly_passes = 15 WHERE tier = 'FAMILY';
UPDATE public.membership_plans SET monthly_passes = 50 WHERE tier = 'BUSINESS';


-- ── 8. 신당 — 멤버십 등급별 개방선 ──────────────────────────────────
-- 옛 복채 가격이 이미 신위 계급과 나란하다(수호신 0 · 명신 1 · 장군신 2 · 천신 3~4).
-- NULL = 누구나(무료 수호신·기본 테마).
ALTER TABLE public.shrine_deities ADD COLUMN IF NOT EXISTS required_tier text;
ALTER TABLE public.shrine_theme_packs ADD COLUMN IF NOT EXISTS required_tier text;

ALTER TABLE public.shrine_deities DROP CONSTRAINT IF EXISTS shrine_deities_required_tier_check;
ALTER TABLE public.shrine_deities ADD CONSTRAINT shrine_deities_required_tier_check
  CHECK (required_tier IS NULL OR required_tier IN ('SINGLE', 'FAMILY', 'BUSINESS'));
ALTER TABLE public.shrine_theme_packs DROP CONSTRAINT IF EXISTS shrine_theme_packs_required_tier_check;
ALTER TABLE public.shrine_theme_packs ADD CONSTRAINT shrine_theme_packs_required_tier_check
  CHECK (required_tier IS NULL OR required_tier IN ('SINGLE', 'FAMILY', 'BUSINESS'));

UPDATE public.shrine_deities SET required_tier = CASE
  WHEN price_bokchae <= 0 THEN NULL
  WHEN price_bokchae = 1 THEN 'SINGLE'
  WHEN price_bokchae = 2 THEN 'FAMILY'
  ELSE 'BUSINESS' END;

UPDATE public.shrine_theme_packs SET required_tier = CASE
  WHEN price_bokchae <= 0 THEN NULL
  WHEN price_bokchae = 1 THEN 'SINGLE'
  WHEN price_bokchae = 2 THEN 'FAMILY'
  ELSE 'BUSINESS' END;

COMMENT ON COLUMN public.shrine_deities.required_tier IS
  '이 신위를 모실 수 있는 최저 멤버십 등급. NULL = 누구나. price_bokchae 는 «정가 표시»로만 남긴다.';


-- ── 9. RPC — 전부 service_role 전용, 같은 사용자는 advisory lock 으로 직렬화 ──

-- 9-1. 발급 (멱등)
CREATE OR REPLACE FUNCTION public.ent_grant(
  p_user_id uuid,
  p_source text,
  p_quantity integer,
  p_expires_at timestamptz,
  p_payment_id uuid DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_user_id IS NULL OR p_quantity IS NULL OR p_quantity <= 0 OR p_quantity > 1000 THEN
    RETURN jsonb_build_object('granted', false, 'reason', 'INVALID_INPUT');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('entitlement:' || p_user_id::text));

  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_id FROM public.entitlement_grants WHERE idempotency_key = p_idempotency_key;
    IF FOUND THEN
      RETURN jsonb_build_object('granted', false, 'reason', 'ALREADY_GRANTED', 'grant_id', v_id);
    END IF;
  END IF;

  INSERT INTO public.entitlement_grants (user_id, source, quantity, expires_at, payment_id, idempotency_key, note)
  VALUES (p_user_id, p_source, p_quantity, p_expires_at, p_payment_id, p_idempotency_key, p_note)
  RETURNING id INTO v_id;

  INSERT INTO public.entitlement_ledger (user_id, kind, pocket, grant_id, units, note)
  VALUES (p_user_id, 'grant', 'pass', v_id, p_quantity, p_note);

  RETURN jsonb_build_object('granted', true, 'reason', 'OK', 'grant_id', v_id);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('granted', false, 'reason', 'ALREADY_GRANTED');
  WHEN check_violation THEN
    RETURN jsonb_build_object('granted', false, 'reason', 'INVALID_INPUT');
END;
$$;

-- 9-2. 사용 — 유일한 소비 관문
-- 주머니 둘(멤버십 이번 창 · 보유 이용권)을 «만료가 가까운 것부터» 쓴다.
-- 멤버십 주머니의 만료 = 이번 창의 끝(p_window_end). 같으면 멤버십 먼저(어차피 사라지니까).
-- 모자라면 아무것도 건드리지 않고 INSUFFICIENT 를 돌려준다(부분 사용 없음).
CREATE OR REPLACE FUNCTION public.ent_consume(
  p_user_id uuid,
  p_feature_key text,
  p_units integer,
  p_window_start timestamptz,
  p_window_end timestamptz,
  p_quota integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_used integer := 0;
  v_member_avail integer := 0;
  v_pass_avail integer := 0;
  v_need integer;
  v_take integer;
  v_ids uuid[] := '{}';
  v_id uuid;
  v_from_member integer := 0;
  v_from_pass integer := 0;
  r record;
BEGIN
  IF p_user_id IS NULL OR p_feature_key IS NULL OR p_units IS NULL OR p_units <= 0 OR p_units > 10 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'INVALID_INPUT');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('entitlement:' || p_user_id::text));

  IF COALESCE(p_quota, 0) > 0 AND p_window_start IS NOT NULL AND p_window_end IS NOT NULL
     AND p_window_end > now() AND p_window_start <= now() THEN
    SELECT used INTO v_used FROM public.subscription_usage
     WHERE user_id = p_user_id AND period_start = p_window_start AND scope = 'reading';
    v_member_avail := GREATEST(p_quota - COALESCE(v_used, 0), 0);
  END IF;

  SELECT COALESCE(SUM(quantity - consumed - revoked), 0) INTO v_pass_avail
    FROM public.entitlement_grants
   WHERE user_id = p_user_id AND scope = 'reading'
     AND consumed + revoked < quantity
     AND (expires_at IS NULL OR expires_at > now());

  IF v_member_avail + v_pass_avail < p_units THEN
    RETURN jsonb_build_object(
      'ok', false, 'reason', 'INSUFFICIENT',
      'member_available', v_member_avail, 'pass_available', v_pass_avail
    );
  END IF;

  v_need := p_units;

  FOR r IN
    SELECT q.grant_id, q.avail, q.pocket
      FROM (
        SELECT g.id AS grant_id, (g.quantity - g.consumed - g.revoked) AS avail, g.expires_at AS ends_at,
               'pass'::text AS pocket, g.issued_at AS tie
          FROM public.entitlement_grants g
         WHERE g.user_id = p_user_id AND g.scope = 'reading'
           AND g.consumed + g.revoked < g.quantity
           AND (g.expires_at IS NULL OR g.expires_at > now())
        UNION ALL
        SELECT NULL::uuid, v_member_avail, p_window_end, 'membership'::text, '-infinity'::timestamptz
         WHERE v_member_avail > 0
      ) q
     ORDER BY q.ends_at ASC NULLS LAST, (q.pocket = 'membership') DESC, q.tie ASC
  LOOP
    EXIT WHEN v_need <= 0;
    v_take := LEAST(v_need, r.avail);
    CONTINUE WHEN v_take <= 0;

    IF r.pocket = 'membership' THEN
      INSERT INTO public.subscription_usage (user_id, period_start, scope, used)
      VALUES (p_user_id, p_window_start, 'reading', v_take)
      ON CONFLICT (user_id, period_start, scope)
      DO UPDATE SET used = public.subscription_usage.used + EXCLUDED.used, updated_at = now();

      INSERT INTO public.entitlement_ledger (user_id, kind, pocket, window_start, units, feature_key)
      VALUES (p_user_id, 'consume', 'membership', p_window_start, v_take, p_feature_key)
      RETURNING id INTO v_id;
      v_from_member := v_from_member + v_take;
    ELSE
      UPDATE public.entitlement_grants SET consumed = consumed + v_take WHERE id = r.grant_id;

      INSERT INTO public.entitlement_ledger (user_id, kind, pocket, grant_id, units, feature_key)
      VALUES (p_user_id, 'consume', 'pass', r.grant_id, v_take, p_feature_key)
      RETURNING id INTO v_id;
      v_from_pass := v_from_pass + v_take;
    END IF;

    v_ids := v_ids || v_id;
    v_need := v_need - v_take;
  END LOOP;

  IF v_need > 0 THEN
    -- 앞의 합계 검사를 통과했으므로 여기 오면 안 된다. 예외로 전체를 되돌린다.
    RAISE EXCEPTION 'ENTITLEMENT_ALLOCATION_FAILED';
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'ledger_ids', to_jsonb(v_ids),
    'from_membership', v_from_member,
    'from_pass', v_from_pass
  );
END;
$$;

-- 9-3. 되돌림 — 풀이 실패 시. 🔴 만료 시각을 건드리지 않는다(실패가 이득이 되면 안 된다).
CREATE OR REPLACE FUNCTION public.ent_refund(p_user_id uuid, p_ledger_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_total integer := 0;
BEGIN
  IF p_user_id IS NULL OR p_ledger_ids IS NULL OR cardinality(p_ledger_ids) = 0 THEN
    RETURN 0;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('entitlement:' || p_user_id::text));

  FOR r IN
    SELECT * FROM public.entitlement_ledger
     WHERE id = ANY (p_ledger_ids) AND user_id = p_user_id
       AND kind = 'consume' AND refunded_at IS NULL
     FOR UPDATE
  LOOP
    IF r.pocket = 'membership' THEN
      UPDATE public.subscription_usage
         SET used = GREATEST(used - r.units, 0), updated_at = now()
       WHERE user_id = p_user_id AND period_start = r.window_start AND scope = 'reading';
    ELSE
      UPDATE public.entitlement_grants
         SET consumed = GREATEST(consumed - r.units, 0)
       WHERE id = r.grant_id;
    END IF;

    UPDATE public.entitlement_ledger SET refunded_at = now() WHERE id = r.id;

    INSERT INTO public.entitlement_ledger (user_id, kind, pocket, grant_id, window_start, units, feature_key, refund_of)
    VALUES (p_user_id, 'refund', r.pocket, r.grant_id, r.window_start, r.units, r.feature_key, r.id);

    v_total := v_total + r.units;
  END LOOP;

  RETURN v_total;
END;
$$;

-- 9-4. 결제 취소 회수 — clawback_payment_credits 의 규약을 그대로 승계.
--  * 원장(ledger) = payments.credits_purchased(발급 총량) ↔ credits_remaining(미처리 발급분).
--    «누적 취소 비율로 잡은 목표 − 이미 처리분» 의 증분만 적용 → 재전송·부분취소 다중 발생에 수렴.
--  * 멱등 2중: (1) 취소 거래 단위 고유 키 유니크 인덱스, (2) 원장 증분(delta<=0 이면 무동작).
--  * 이미 쓴 장은 회수하지 않는다 — 부족분(shortfall)을 돌려주고 호출자가 경보한다.
CREATE OR REPLACE FUNCTION public.ent_revoke_for_payment(
  p_payment_id uuid,
  p_target_revoked integer,
  p_idempotency_key text,
  p_cancelled_amount integer,
  p_fully_cancelled boolean,
  p_description text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_granted integer;
  v_remaining integer;
  v_already integer;
  v_delta integer;
  v_grant_id uuid;
  v_unused integer := 0;
  v_revoked integer := 0;
  v_shortfall integer;
BEGIN
  IF p_idempotency_key IS NULL OR p_idempotency_key NOT LIKE 'PAYMENT_CANCEL:%' THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'INVALID_KEY', 'revoked', 0, 'shortfall', 0);
  END IF;

  SELECT user_id, credits_purchased, credits_remaining
    INTO v_user_id, v_granted, v_remaining
    FROM public.payments
   WHERE id = p_payment_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'NO_PAYMENT', 'revoked', 0, 'shortfall', 0);
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('entitlement:' || v_user_id::text));

  IF EXISTS (SELECT 1 FROM public.entitlement_ledger WHERE idempotency_key = p_idempotency_key) THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'ALREADY_PROCESSED', 'revoked', 0, 'shortfall', 0);
  END IF;

  v_already := GREATEST(0, COALESCE(v_granted, 0) - COALESCE(v_remaining, 0));
  v_delta := LEAST(
    GREATEST(COALESCE(p_target_revoked, 0) - v_already, 0),
    GREATEST(COALESCE(v_remaining, 0), 0)
  );

  UPDATE public.payments
     SET credits_remaining = credits_remaining - v_delta,
         cancelled_amount = GREATEST(cancelled_amount, GREATEST(COALESCE(p_cancelled_amount, 0), 0)),
         cancelled_at = COALESCE(cancelled_at, now()),
         status = CASE WHEN p_fully_cancelled THEN 'refunded' ELSE status END,
         updated_at = now()
   WHERE id = p_payment_id;

  IF v_delta <= 0 THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'NOTHING_TO_REVOKE', 'revoked', 0, 'shortfall', 0);
  END IF;

  SELECT id, GREATEST(quantity - consumed - revoked, 0)
    INTO v_grant_id, v_unused
    FROM public.entitlement_grants
   WHERE payment_id = p_payment_id
     FOR UPDATE;

  v_revoked := LEAST(v_delta, COALESCE(v_unused, 0));
  v_shortfall := v_delta - v_revoked;

  IF v_revoked > 0 THEN
    UPDATE public.entitlement_grants SET revoked = revoked + v_revoked WHERE id = v_grant_id;
  END IF;

  INSERT INTO public.entitlement_ledger (user_id, kind, pocket, grant_id, units, idempotency_key, note)
  VALUES (
    v_user_id, 'revoke', 'pass', v_grant_id, v_revoked, p_idempotency_key,
    COALESCE(p_description, format('결제 취소 이용권 회수 %s장', v_revoked))
  );

  RETURN jsonb_build_object(
    'applied', true,
    'reason', 'OK',
    'revoked', v_revoked,
    'shortfall', v_shortfall,
    'delta', v_delta,
    'user_id', v_user_id
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'ALREADY_PROCESSED', 'revoked', 0, 'shortfall', 0);
END;
$$;

-- 9-5. 관리자 조정 — 양수는 발급, 음수는 보유 이용권 회수.
-- 회수 순서: 관리자가 준 것 → 기한이 가까운 것 → 기한 없는 이전 보유분(마지막). 이용자에게 덜 불리한 순서.
-- 이미 만료된 발급분은 회수 대상이 아니다(쓸 수 없는 장을 깎아 «회수했다»고 기록하지 않는다).
CREATE OR REPLACE FUNCTION public.ent_admin_adjust(
  p_user_id uuid,
  p_delta integer,
  p_expires_at timestamptz,
  p_note text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_need integer;
  v_take integer;
  v_done integer := 0;
  r record;
BEGIN
  IF p_user_id IS NULL OR p_delta IS NULL OR p_delta = 0 OR abs(p_delta) > 1000 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'INVALID_INPUT');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('entitlement:' || p_user_id::text));

  IF p_delta > 0 THEN
    INSERT INTO public.entitlement_grants (user_id, source, quantity, expires_at, note)
    VALUES (p_user_id, 'admin', p_delta, p_expires_at, p_note)
    RETURNING id INTO v_id;
    INSERT INTO public.entitlement_ledger (user_id, kind, pocket, grant_id, units, note)
    VALUES (p_user_id, 'grant', 'pass', v_id, p_delta, p_note);
    RETURN jsonb_build_object('ok', true, 'granted', p_delta, 'revoked', 0, 'shortfall', 0, 'grant_id', v_id);
  END IF;

  v_need := -p_delta;
  FOR r IN
    SELECT id, (quantity - consumed - revoked) AS avail
      FROM public.entitlement_grants
     WHERE user_id = p_user_id AND scope = 'reading' AND consumed + revoked < quantity
       AND (expires_at IS NULL OR expires_at > now())
     ORDER BY (source = 'admin') DESC, expires_at ASC NULLS LAST, issued_at ASC
     FOR UPDATE
  LOOP
    EXIT WHEN v_need <= 0;
    v_take := LEAST(v_need, r.avail);
    UPDATE public.entitlement_grants SET revoked = revoked + v_take WHERE id = r.id;
    INSERT INTO public.entitlement_ledger (user_id, kind, pocket, grant_id, units, note)
    VALUES (p_user_id, 'revoke', 'pass', r.id, v_take, p_note);
    v_need := v_need - v_take;
    v_done := v_done + v_take;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'granted', 0, 'revoked', v_done, 'shortfall', v_need);
END;
$$;


-- ── 10. 권한 ────────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.ent_grant(uuid, text, integer, timestamptz, uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ent_consume(uuid, text, integer, timestamptz, timestamptz, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ent_refund(uuid, uuid[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ent_revoke_for_payment(uuid, integer, text, integer, boolean, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ent_admin_adjust(uuid, integer, timestamptz, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.ent_grant(uuid, text, integer, timestamptz, uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.ent_consume(uuid, text, integer, timestamptz, timestamptz, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.ent_refund(uuid, uuid[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.ent_revoke_for_payment(uuid, integer, text, integer, boolean, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.ent_admin_adjust(uuid, integer, timestamptz, text) TO service_role;

COMMENT ON FUNCTION public.ent_consume IS
  '이용권 사용의 유일한 관문. 멤버십 이번 창과 보유 이용권을 만료가 가까운 순으로 쓴다. 모자라면 무동작 + INSUFFICIENT. service_role 전용.';
