-- profiles.role 은 service_role(관리자 화면)만 바꾼다.
-- 이용권 우회(hasPassBypass)와 관리자 판정이 모두 이 칸 하나에 걸려 있다.
-- 칸 단위 REVOKE 는 표 단위 GRANT 가 있어 효력이 없다 → 트리거로 막는다.

CREATE OR REPLACE FUNCTION public.guard_profiles_role() RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF coalesce(auth.role(), current_user) = 'service_role' OR current_user IN ('postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.role := 'user';
  ELSIF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'role change not allowed' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS guard_profiles_role ON public.profiles;
CREATE TRIGGER guard_profiles_role
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profiles_role();
