-- =====================================================================
-- 복채(잔액) → 이용권 체계 전환 ② 전환분 (2026-09-18)
--
-- 🔴 적용 시점: 새 코드 배포 «직후». 옛 코드가 돌고 있을 때 이 파일을 먼저 적용하면
--    옛 결제 승인이 이용권 팩 가격에 복채를 지급한다(price_plans 활성 행이 바뀐다).
-- 🔴 옛 객체(wallets·wallet_transactions·복채 RPC)는 지우지 않는다 — 되돌리기 레버.
--    DROP 은 관찰 기간(최소 2주) 뒤 별도 파일로.
-- =====================================================================


-- ── 1. 상품 교체 — 복채 팩 내리고 이용권 팩 올리기 ────────────────────
UPDATE public.price_plans SET is_active = false, updated_at = now() WHERE product_kind = 'bokchae';
UPDATE public.price_plans SET is_active = true,  updated_at = now() WHERE product_kind = 'pass';


-- ── 2. 멤버십 — 등급 차등 다시 세우기 ─────────────────────────────────
-- 복채를 빼면 세 등급이 같은 상품이 된다(인연·보관 한도가 전 등급 동일했다).
-- 옛 지급·일일 상한 열은 0 으로 둔다 — 새 코드는 읽지 않고, 혹시 옛 경로가 돌아도 지급이 없다.
UPDATE public.membership_plans SET relationship_limit = 5,  storage_limit = 20,  talismans_per_period = 0, daily_talisman_limit = 0, updated_at = now() WHERE tier = 'SINGLE';
UPDATE public.membership_plans SET relationship_limit = 15, storage_limit = 50,  talismans_per_period = 0, daily_talisman_limit = 0, updated_at = now() WHERE tier = 'FAMILY';
UPDATE public.membership_plans SET relationship_limit = 50, storage_limit = 200, talismans_per_period = 0, daily_talisman_limit = 0, updated_at = now() WHERE tier = 'BUSINESS';


-- ── 3. 가입 트리거 — 지갑을 만들지 않는다 ─────────────────────────────
-- 가입 맛보기 이용권은 앱(auth callback)이 멱등 키로 발급한다.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  BEGIN
    INSERT INTO public.profiles (id, full_name, email, gender, birth_date, birth_time, calendar_type)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      NEW.email,
      NULLIF(NEW.raw_user_meta_data->>'gender', ''),
      NULLIF(NEW.raw_user_meta_data->>'birth_date', ''),
      NULLIF(NEW.raw_user_meta_data->>'birth_time', ''),
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'calendar_type', ''), 'solar')
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
      email = COALESCE(EXCLUDED.email, profiles.email);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[handle_new_user] profiles INSERT 실패 (user_id: %): %', NEW.id, SQLERRM;
  END;

  BEGIN
    INSERT INTO public.activity_logs (user_id, activity_type, activity_category, description)
    VALUES (NEW.id, 'signup', 'user',
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)) || '님이 가입했습니다.');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[handle_new_user] activity_logs INSERT 실패: %', SQLERRM;
  END;

  RETURN NEW;
END;
$function$;


-- ── 4. 친구 추천 — 양측에 이용권 1장(30일) ────────────────────────────
-- 반환 모양(success/error/referrerId/bonus)은 유지한다 — bonus 는 이제 «장 수»다.
CREATE OR REPLACE FUNCTION public.process_referral_bonus(p_referee_id uuid, p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_referrer_id uuid;
  v_passes      integer := 1;
  v_expires     timestamptz := now() + interval '30 days';
BEGIN
  IF auth.uid() IS NOT NULL AND p_referee_id IS DISTINCT FROM auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN: can only claim own referral bonus';
  END IF;

  IF EXISTS (SELECT 1 FROM public.referral_uses WHERE referee_id = p_referee_id) THEN
    RETURN jsonb_build_object('success', false, 'error', '이미 추천 혜택을 받으셨습니다.');
  END IF;

  SELECT user_id INTO v_referrer_id FROM public.referral_codes WHERE code = upper(p_code);
  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', '유효하지 않은 추천 코드입니다.');
  END IF;
  IF v_referrer_id = p_referee_id THEN
    RETURN jsonb_build_object('success', false, 'error', '본인 추천은 불가합니다.');
  END IF;

  -- 🔴 referral_uses 에는 code 열이 없다 — 열 목록에 넣으면 매번 실패해 추천 선물이 한 번도 나가지 않는다.
  INSERT INTO public.referral_uses (referrer_id, referee_id, bonus_amount)
  VALUES (v_referrer_id, p_referee_id, v_passes);

  PERFORM public.ent_grant(p_referee_id, 'referral', v_passes, v_expires, NULL,
                           'REFERRAL_REFEREE:' || p_referee_id::text, '친구 추천으로 가입');
  PERFORM public.ent_grant(v_referrer_id, 'referral', v_passes, v_expires, NULL,
                           'REFERRAL_REFERRER:' || p_referee_id::text, '친구 추천 선물');

  RETURN jsonb_build_object('success', true, 'referrerId', v_referrer_id, 'bonus', v_passes);
END;
$function$;

-- 발급 함수다 — 가입 콜백(service_role)만 부른다. CREATE OR REPLACE 는 옛 ACL(authenticated EXECUTE)을 그대로 둔다.
REVOKE ALL ON FUNCTION public.process_referral_bonus(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_referral_bonus(uuid, text) TO service_role;


-- ── 5. 초하루 의례 — 복채 보상 제거(기원 누적만) ──────────────────────
-- 반환 모양은 유지한다(awarded=0, balance=0) — 호출부 타입을 한 번에 깨지 않게.
CREATE OR REPLACE FUNCTION public.complete_ritual(
  p_user_id uuid, p_ritual_month text, p_is_leap boolean, p_seq integer, p_wish_category text,
  p_members_viewed uuid[], p_bok_amount integer, p_kst_today date
)
RETURNS TABLE(already_completed boolean, awarded integer, balance integer, devotion_gained boolean, devotion_total integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id UUID;
  v_gained BOOLEAN := false;
  v_total INTEGER := 0;
BEGIN
  IF p_wish_category IS NULL
     OR p_wish_category NOT IN ('health','exam','love','wealth','family','business','other') THEN
    RAISE EXCEPTION 'WISH_REQUIRED';
  END IF;

  INSERT INTO ritual_records
    (user_id, ritual_month, is_leap_month, lunar_month_seq, completed_at, wish_category, members_viewed)
  VALUES
    (p_user_id, p_ritual_month, p_is_leap, p_seq, now(), p_wish_category, COALESCE(p_members_viewed, '{}'))
  ON CONFLICT (user_id, ritual_month, is_leap_month) DO UPDATE SET
    completed_at   = now(),
    wish_category  = EXCLUDED.wish_category,
    members_viewed = EXCLUDED.members_viewed
  WHERE ritual_records.completed_at IS NULL
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RETURN QUERY SELECT true, 0, 0, false,
      COALESCE((SELECT d.total_days FROM shrine_devotion d WHERE d.user_id = p_user_id), 0);
    RETURN;
  END IF;

  SELECT r.gained, r.total_days INTO v_gained, v_total
  FROM public.record_shrine_devotion(p_user_id, COALESCE(p_kst_today, (now() AT TIME ZONE 'Asia/Seoul')::date)) AS r;

  RETURN QUERY SELECT false, 0, 0, COALESCE(v_gained, false), COALESCE(v_total, 0);
END;
$function$;


-- ── 6. 쓰기 권한 정리 — 원장·출석 기록은 서버 전용 ───────────────────
DROP POLICY IF EXISTS wallet_tx_insert_own ON public.wallet_transactions;
DROP POLICY IF EXISTS attendance_logs_insert_own ON public.attendance_logs;
DROP POLICY IF EXISTS "Users can insert own attendance" ON public.attendance_logs;

-- 결제 기록은 서버(service_role)만 쓴다. 정책을 다시 여는 실수가 생겨도 표 권한에서 막히게 권한까지 뺀다.
DROP POLICY IF EXISTS payments_insert_own ON public.payments;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.payments FROM anon, authenticated;
CREATE UNIQUE INDEX IF NOT EXISTS payments_payment_key_uidx
  ON public.payments (payment_key) WHERE payment_key IS NOT NULL;

-- 출석은 이제 재화를 주지 않는다 — 기본값이 1 이면 다른 경로로 쌓인 행에 준 적 없는 보상이 기록된다.
ALTER TABLE public.attendance_logs ALTER COLUMN bokchae_awarded SET DEFAULT 0;

-- 갱신 크론이 겹쳐 돌 때 SUCCESS 기록 중복을 DB 에서도 막는다(코드는 선조회로 막는다).
CREATE UNIQUE INDEX IF NOT EXISTS subscription_payments_success_order_uidx
  ON public.subscription_payments (order_id) WHERE status = 'SUCCESS';


-- ── 6-2. 멤버십·신물 문구 — 금지어와 구현 없는 약속 걷기 ──────────────
-- 🔴 화면 문구의 정본은 DB 다. «무제한»은 사실이 아니고, bonus_rate 는 폐지된 첫 충전·팩 보너스의 흔적이다.
UPDATE public.membership_plans SET description = '나를 위한 매달 풀이 — 이용권 5장', updated_at = now() WHERE tier = 'SINGLE';
UPDATE public.membership_plans SET description = '우리 가족을 함께 보는 등급 — 이용권 15장 · 가족 기운 지도', updated_at = now() WHERE tier = 'FAMILY';
UPDATE public.membership_plans SET description = '여럿을 함께 보는 등급 — 이용권 50장 · 둘·셋·넷 함께 보기', updated_at = now() WHERE tier = 'BUSINESS';
UPDATE public.membership_plans
   SET features = features - 'bonus_rate' - 'api_access' - 'priority_support' - 'custom_reports' - 'pdf_archive' - 'kakao_daily',
       updated_at = now();

-- 복 부적 — 출석 재화 보상이 없어졌으므로 비금전 효과(출석 기록 표식)로.
UPDATE public.shrine_item_catalog
   SET unlock_effect = '{"type":"attendance_mark","max_stack":1}'::jsonb
 WHERE unlock_effect->>'type' = 'attendance_bonus';

COMMENT ON COLUMN public.energy_gifts.price_bokchae IS '선물은 무료 — 옛 기록 보존용(새 행은 0).';


-- ── 7. 잔액 이관 — 전액 보전(2만냥 = 1장, 올림, 기한 없음) ──────────────
-- 대상: 일반 회원(role 이 admin·tester 가 아닌 계정) 중 잔액이 있는 계정.
-- 제외: QA 테스트 계정(초기 지급 기록에 «QA 테스트 계정»이 적힌 계정) — 심사 촬영용이며 멤버십으로 쓴다.
-- 멱등: 'MIGRATION:<user_id>' — 두 번 돌려도 한 번만 발급된다.
-- 🔴 배포~이 파일 적용 사이에 가입한 사람은 새 코드의 가입 선물(이용권)과 옛 트리거의 가입 복채를 둘 다 받는다.
--    새 가입 선물이 처음 나간 시각 이후의 가입·추천 복채는 이관 대상에서 뺀다(같은 선물을 두 번 바꿔 주지 않는다).
DO $$
DECLARE
  r record;
  v_passes integer;
  v_cut timestamptz;
  v_excess integer;
BEGIN
  SELECT min(issued_at) INTO v_cut
    FROM public.entitlement_grants WHERE source IN ('onboarding', 'referral');

  FOR r IN
    SELECT w.user_id, w.balance
      FROM public.wallets w
      LEFT JOIN public.profiles p ON p.id = w.user_id
     WHERE w.balance > 0
       AND COALESCE(p.role, 'user') NOT IN ('admin', 'tester')
       AND NOT EXISTS (
         SELECT 1 FROM public.wallet_transactions t
          WHERE t.user_id = w.user_id AND t.description LIKE 'QA 테스트 계정%'
       )
       AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = w.user_id)
  LOOP
    v_excess := 0;
    IF v_cut IS NOT NULL THEN
      SELECT COALESCE(SUM(t.amount), 0) INTO v_excess
        FROM public.wallet_transactions t
       WHERE t.user_id = r.user_id AND t.created_at >= v_cut AND t.amount > 0
         AND (t.description = '회원가입 축하 복채' OR t.feature_key IN ('REFERRAL_BONUS', 'REFERRAL_REWARD'));
    END IF;

    v_passes := CEIL(GREATEST(r.balance - v_excess, 0) / 2.0)::int;
    IF v_passes > 0 THEN
      PERFORM public.ent_grant(r.user_id, 'migration', v_passes, NULL, NULL,
                               'MIGRATION:' || r.user_id::text, '이전 보유분 전환');
    END IF;
  END LOOP;
END $$;


-- ── 8. 약관 개정 공지 — 회원 알림함·가이드 말풍선 ────────────────────
-- 약관 제3조 제3항: 적용일자 7일 전부터 공지. 날짜의 정본은 lib/domain/legal/terms-revision.ts (공지 2026-09-19 · 시행 2026-09-26).
-- 비로그인 초기 화면(랜딩)의 공지 띠는 코드(components/legal/terms-revision-notice.tsx)가 맡는다. 두 번 돌려도 한 번만 들어간다.
INSERT INTO public.announcements (title, body, is_active, starts_at)
SELECT '이용약관 개정 안내 (2026년 9월 26일 시행)',
       '서비스 이용 단위가 이용권(풀이 1회 = 1장)으로 바뀝니다. 보유하시던 분은 이용권으로 전환해 전액 보전했습니다. '
       || '개별 이용권의 유효기간(결제일로부터 90일)·양도 금지, 멤버십 이용권의 이월 없음, 환불 기준이 약관에 명시됩니다. '
       || '자세한 내용과 종전 약관은 이용약관 화면에서 함께 보실 수 있습니다.',
       true, now()
 WHERE NOT EXISTS (
   SELECT 1 FROM public.announcements WHERE title = '이용약관 개정 안내 (2026년 9월 26일 시행)'
 );

INSERT INTO public.notifications (user_id, title, message, type, is_read)
SELECT p.id,
       '이용약관 개정 안내 (2026년 9월 26일 시행)',
       '서비스 이용 단위가 이용권(풀이 1회 = 1장)으로 바뀝니다. 보유하시던 분은 이용권으로 전환해 전액 보전했습니다. 자세한 내용은 이용약관에서 확인해 주세요.',
       'admin_announcement', false
  FROM public.profiles p
 WHERE EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.id)
   AND NOT EXISTS (
     SELECT 1 FROM public.notifications n
      WHERE n.user_id = p.id AND n.title = '이용약관 개정 안내 (2026년 9월 26일 시행)'
   );
