-- ============================================================
-- Fix: 신규 유저 profiles 미생성 문제 해결
-- 2026-02-17
-- 문제: handle_new_user 트리거가 wallet_transactions 오류로
--       silent fail → profiles 레코드 미생성
-- 해결:
--   1. handle_new_user 트리거 분리 & 강화 (profiles만 필수, wallet 선택)
--   2. auth.users에 있지만 profiles 없는 유저 backfill
--   3. activity_logs에 signup 이벤트 기록 함수 추가
-- ============================================================

-- ============================================================
-- 1. handle_new_user 트리거 개선
--    profiles INSERT만 필수, wallet은 별도로 처리
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- [필수] profiles 생성 — 실패 시 경고만 하고 계속
  BEGIN
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
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      NEW.email,
      NULLIF(NEW.raw_user_meta_data->>'gender', ''),
      (NULLIF(NEW.raw_user_meta_data->>'birth_date', ''))::date,
      (NULLIF(NEW.raw_user_meta_data->>'birth_time', ''))::time,
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'calendar_type', ''), 'solar')
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name      = COALESCE(EXCLUDED.full_name, profiles.full_name),
      email          = COALESCE(EXCLUDED.email, profiles.email),
      gender         = COALESCE(EXCLUDED.gender, profiles.gender),
      birth_date     = COALESCE(EXCLUDED.birth_date, profiles.birth_date),
      birth_time     = COALESCE(EXCLUDED.birth_time, profiles.birth_time),
      calendar_type  = COALESCE(EXCLUDED.calendar_type, profiles.calendar_type);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[handle_new_user] profiles INSERT 실패 (user_id: %): %', NEW.id, SQLERRM;
  END;

  -- [선택] wallets 생성
  BEGIN
    INSERT INTO public.wallets (user_id, balance)
    VALUES (NEW.id, 1)
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[handle_new_user] wallets INSERT 실패: %', SQLERRM;
  END;

  -- [선택] 가입 보너스 트랜잭션 기록
  BEGIN
    INSERT INTO public.wallet_transactions (user_id, amount, type, description)
    VALUES (NEW.id, 1, 'BONUS', '회원가입 축하 복채');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[handle_new_user] wallet_transactions INSERT 실패: %', SQLERRM;
  END;

  -- [선택] activity_logs 가입 이벤트 기록
  BEGIN
    INSERT INTO public.activity_logs (user_id, activity_type, activity_category, description)
    VALUES (NEW.id, 'signup', 'user',
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)) || '님이 가입했습니다.');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[handle_new_user] activity_logs INSERT 실패: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- 트리거 재연결
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. auth.users에 있지만 profiles 없는 유저 backfill
-- ============================================================
DO $$
DECLARE
  orphan RECORD;
  cnt    INTEGER := 0;
BEGIN
  FOR orphan IN
    SELECT
      u.id,
      u.email,
      u.raw_user_meta_data,
      u.created_at
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE p.id IS NULL
      AND u.deleted_at IS NULL
  LOOP
    BEGIN
      INSERT INTO public.profiles (
        id,
        full_name,
        email,
        gender,
        birth_date,
        birth_time,
        calendar_type,
        created_at
      )
      VALUES (
        orphan.id,
        COALESCE(orphan.raw_user_meta_data->>'full_name', split_part(orphan.email, '@', 1)),
        orphan.email,
        NULLIF(orphan.raw_user_meta_data->>'gender', ''),
        (NULLIF(orphan.raw_user_meta_data->>'birth_date', ''))::date,
        (NULLIF(orphan.raw_user_meta_data->>'birth_time', ''))::time,
        COALESCE(NULLIF(orphan.raw_user_meta_data->>'calendar_type', ''), 'solar'),
        orphan.created_at
      );

      -- wallet도 없으면 생성
      INSERT INTO public.wallets (user_id, balance)
      VALUES (orphan.id, 0)
      ON CONFLICT (user_id) DO NOTHING;

      cnt := cnt + 1;
      RAISE NOTICE '복구 완료: % (%)', orphan.email, orphan.id;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '복구 실패: % — %', orphan.email, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE '=== orphan user backfill 완료: %명 복구 ===', cnt;
END $$;

-- ============================================================
-- 3. activity_logs에 기존 가입 유저 signup 이벤트 backfill
--    (트래픽 차트에 가입 데이터 반영)
-- ============================================================
DO $$
DECLARE
  r RECORD;
  cnt INTEGER := 0;
BEGIN
  FOR r IN
    SELECT p.id, p.full_name, p.created_at
    FROM public.profiles p
    LEFT JOIN public.activity_logs al
      ON al.user_id = p.id AND al.activity_type = 'signup'
    WHERE al.id IS NULL
  LOOP
    BEGIN
      INSERT INTO public.activity_logs (user_id, activity_type, activity_category, description, created_at)
      VALUES (
        r.id,
        'signup',
        'user',
        COALESCE(r.full_name, '사용자') || '님이 가입했습니다.',
        r.created_at
      );
      cnt := cnt + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'activity_logs backfill 실패: %', SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE '=== activity_logs signup backfill 완료: %건 ===', cnt;
END $$;

-- ============================================================
-- 4. 진단용 뷰: auth.users ↔ profiles 불일치 확인
-- ============================================================
CREATE OR REPLACE VIEW admin_user_sync_status AS
SELECT
  u.id,
  u.email,
  u.created_at AS auth_created_at,
  u.email_confirmed_at,
  CASE WHEN p.id IS NOT NULL THEN '정상' ELSE '⚠ profiles 없음' END AS profile_status,
  CASE WHEN w.user_id IS NOT NULL THEN '정상' ELSE '⚠ wallet 없음' END AS wallet_status
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.wallets w ON w.user_id = u.id
WHERE u.deleted_at IS NULL
ORDER BY u.created_at DESC;

-- 어드민만 이 뷰를 볼 수 있도록
GRANT SELECT ON admin_user_sync_status TO authenticated;

-- ============================================================
-- 완료 확인
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE '=== 20260217_fix_user_signup_and_profiles 완료 ===';
  RAISE NOTICE '[TRIGGER] handle_new_user 강화 — 각 단계 독립 예외처리';
  RAISE NOTICE '[BACKFILL] auth.users 기준 orphan profiles 복구';
  RAISE NOTICE '[BACKFILL] activity_logs signup 이벤트 backfill';
  RAISE NOTICE '[VIEW] admin_user_sync_status 진단 뷰 생성';
END $$;
