-- ============================================
-- RPC 함수 수정 (즉시 실행)
-- Supabase Dashboard → SQL Editor에 복사해서 실행
-- ============================================

-- 기존 함수 삭제
DROP FUNCTION IF EXISTS public.get_user_destiny_targets(uuid);

-- 새로운 함수 생성 (View와 정확히 일치)
CREATE OR REPLACE FUNCTION public.get_user_destiny_targets(user_id_param uuid)
RETURNS SETOF v_destiny_targets AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.v_destiny_targets
  WHERE owner_id = user_id_param
  ORDER BY
    CASE
      WHEN target_type = 'self' THEN 0
      ELSE 1
    END,
    created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 권한 부여
GRANT EXECUTE ON FUNCTION public.get_user_destiny_targets TO authenticated;

-- 테스트 (실행 후 결과 확인)
-- SELECT * FROM get_user_destiny_targets('your-user-id');
