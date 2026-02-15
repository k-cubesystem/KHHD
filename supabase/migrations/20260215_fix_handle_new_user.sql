-- ============================================================
-- handle_new_user 트리거 함수 개선
-- 1. 가입 시 입력한 birth_date, gender, birth_time, calendar_type을 profiles에 저장
-- 2. 가입 보너스를 '회원가입 축하 복채'로 변경
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Profile 생성 (가입 시 입력한 사주 정보 포함)
  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    gender,
    birth_date,
    birth_time,
    calendar_type
  )
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    new.raw_user_meta_data->>'gender',
    (NULLIF(new.raw_user_meta_data->>'birth_date', ''))::date,
    (NULLIF(new.raw_user_meta_data->>'birth_time', ''))::time,
    COALESCE(NULLIF(new.raw_user_meta_data->>'calendar_type', ''), 'solar')
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    gender = COALESCE(EXCLUDED.gender, profiles.gender),
    birth_date = COALESCE(EXCLUDED.birth_date, profiles.birth_date),
    birth_time = COALESCE(EXCLUDED.birth_time, profiles.birth_time),
    calendar_type = COALESCE(EXCLUDED.calendar_type, profiles.calendar_type);

  -- Wallet 생성 (없을 때만)
  INSERT INTO public.wallets (user_id, balance)
  VALUES (new.id, 1)
  ON CONFLICT (user_id) DO NOTHING;

  -- 가입 보너스 트랜잭션 기록
  INSERT INTO public.wallet_transactions (user_id, amount, type, description)
  VALUES (new.id, 1, 'BONUS', '회원가입 축하 복채');

  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- 트리거 오류로 인해 회원가입 자체가 실패하지 않도록 예외 처리
    RAISE WARNING 'handle_new_user error for user %: %', new.id, SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거가 없으면 재생성
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
