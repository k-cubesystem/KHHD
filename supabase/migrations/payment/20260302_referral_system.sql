-- ============================================================
-- 추천인 시스템 (Referral System)
-- 2026-03-02
-- - referral_codes: 유저별 고유 추천 코드
-- - referral_uses: 추천 사용 이력 (추천인+피추천인 보너스)
-- ============================================================

-- 1. referral_codes 테이블
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code        text NOT NULL UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT referral_codes_user_id_unique UNIQUE (user_id)
);

-- 2. referral_uses 테이블
CREATE TABLE IF NOT EXISTS public.referral_uses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referee_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code         text NOT NULL,
  bonus_amount integer NOT NULL DEFAULT 5, -- 만냥 단위 (5 = 5만냥)
  rewarded_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT referral_uses_referee_unique UNIQUE (referee_id) -- 피추천인은 한 번만 추천 가능
);

-- 3. 인덱스
CREATE INDEX IF NOT EXISTS idx_referral_codes_user_id ON public.referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON public.referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_uses_referrer_id ON public.referral_uses(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_uses_referee_id ON public.referral_uses(referee_id);

-- 4. RLS 정책
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_uses  ENABLE ROW LEVEL SECURITY;

-- referral_codes: 본인만 읽기, 서버(SECURITY DEFINER 함수)로 쓰기
CREATE POLICY "referral_codes_select_own"
  ON public.referral_codes FOR SELECT
  USING (auth.uid() = user_id);

-- referral_uses: 본인이 추천인인 기록 읽기
CREATE POLICY "referral_uses_select_referrer"
  ON public.referral_uses FOR SELECT
  USING (auth.uid() = referrer_id);

-- 5. 추천 코드 자동 생성 함수 (SECURITY DEFINER → RLS 우회)
CREATE OR REPLACE FUNCTION public.get_or_create_referral_code(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_attempt int := 0;
BEGIN
  -- 이미 있으면 반환
  SELECT code INTO v_code
  FROM public.referral_codes
  WHERE user_id = p_user_id;

  IF v_code IS NOT NULL THEN
    RETURN v_code;
  END IF;

  -- 고유 코드 생성 (8자리 대문자+숫자)
  LOOP
    v_code := upper(substring(md5(p_user_id::text || now()::text || v_attempt::text) FROM 1 FOR 8));
    BEGIN
      INSERT INTO public.referral_codes (user_id, code)
      VALUES (p_user_id, v_code);
      RETURN v_code;
    EXCEPTION WHEN unique_violation THEN
      v_attempt := v_attempt + 1;
      IF v_attempt > 10 THEN
        RAISE EXCEPTION 'Failed to generate unique referral code after 10 attempts';
      END IF;
    END;
  END LOOP;
END;
$$;

-- 6. 추천 보너스 지급 함수 (SECURITY DEFINER)
--    - referee_id가 처음 사용하는지 확인
--    - referral_uses에 기록
--    - 추천인 + 피추천인 각각 5만냥 지급
CREATE OR REPLACE FUNCTION public.process_referral_bonus(
  p_referee_id uuid,
  p_code       text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id  uuid;
  v_bonus        integer := 5; -- 5만냥
  v_referee_bal  integer;
  v_referrer_bal integer;
BEGIN
  -- 이미 추천 사용한 피추천인인지 확인
  IF EXISTS (SELECT 1 FROM public.referral_uses WHERE referee_id = p_referee_id) THEN
    RETURN jsonb_build_object('success', false, 'error', '이미 추천 혜택을 받으셨습니다.');
  END IF;

  -- 코드로 추천인 조회
  SELECT user_id INTO v_referrer_id
  FROM public.referral_codes
  WHERE code = upper(p_code);

  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', '유효하지 않은 추천 코드입니다.');
  END IF;

  -- 본인 추천 방지
  IF v_referrer_id = p_referee_id THEN
    RETURN jsonb_build_object('success', false, 'error', '본인 추천은 불가합니다.');
  END IF;

  -- referral_uses 기록
  INSERT INTO public.referral_uses (referrer_id, referee_id, code, bonus_amount)
  VALUES (v_referrer_id, p_referee_id, upper(p_code), v_bonus);

  -- 피추천인 지갑 보너스
  SELECT balance INTO v_referee_bal FROM public.wallets WHERE user_id = p_referee_id;
  IF v_referee_bal IS NULL THEN
    INSERT INTO public.wallets (user_id, balance) VALUES (p_referee_id, v_bonus);
  ELSE
    UPDATE public.wallets SET balance = balance + v_bonus WHERE user_id = p_referee_id;
  END IF;

  INSERT INTO public.wallet_transactions (user_id, amount, type, feature_key, description)
  VALUES (p_referee_id, v_bonus, 'BONUS', 'REFERRAL_BONUS',
    '추천인 가입 보너스 ' || v_bonus || '만냥');

  -- 추천인 지갑 보너스
  SELECT balance INTO v_referrer_bal FROM public.wallets WHERE user_id = v_referrer_id;
  IF v_referrer_bal IS NULL THEN
    INSERT INTO public.wallets (user_id, balance) VALUES (v_referrer_id, v_bonus);
  ELSE
    UPDATE public.wallets SET balance = balance + v_bonus WHERE user_id = v_referrer_id;
  END IF;

  INSERT INTO public.wallet_transactions (user_id, amount, type, feature_key, description)
  VALUES (v_referrer_id, v_bonus, 'BONUS', 'REFERRAL_REWARD',
    '친구 추천 보상 ' || v_bonus || '만냥');

  RETURN jsonb_build_object('success', true, 'referrerId', v_referrer_id, 'bonus', v_bonus);
END;
$$;

-- 완료
DO $$
BEGIN
  RAISE NOTICE '=== 20260302_referral_system 완료 ===';
  RAISE NOTICE '[TABLE] referral_codes, referral_uses 생성';
  RAISE NOTICE '[FUNC] get_or_create_referral_code, process_referral_bonus';
END $$;
