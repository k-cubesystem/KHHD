-- 인연(緣) 적립 원자 RPC (Track D). service_role 전용(서버 액션이 admin으로 호출).
-- bond_points 증가 + 단계 재계산(임계값 0/100/300/700 = lib/domain/shrine/deities.ts BOND_THRESHOLDS 와 동기).
-- 반환: 갱신된 bond_level, bond_points.

CREATE OR REPLACE FUNCTION public.award_deity_bond(p_user_id uuid, p_deity_id uuid, p_points integer)
 RETURNS TABLE(bond_level integer, bond_points integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE v_points integer;
BEGIN
  IF p_points <= 0 THEN
    RAISE EXCEPTION 'INVALID_POINTS: must be positive, got %', p_points;
  END IF;

  INSERT INTO public.user_deity_bonds (user_id, deity_id, bond_points, bond_level, updated_at)
  VALUES (p_user_id, p_deity_id, p_points, 1, now())
  ON CONFLICT (user_id, deity_id) DO UPDATE
    SET bond_points = user_deity_bonds.bond_points + p_points, updated_at = now()
  RETURNING user_deity_bonds.bond_points INTO v_points;

  UPDATE public.user_deity_bonds
  SET bond_level = CASE
    WHEN v_points >= 700 THEN 4
    WHEN v_points >= 300 THEN 3
    WHEN v_points >= 100 THEN 2
    ELSE 1 END
  WHERE user_id = p_user_id AND deity_id = p_deity_id
  RETURNING user_deity_bonds.bond_level, user_deity_bonds.bond_points
  INTO award_deity_bond.bond_level, award_deity_bond.bond_points;

  RETURN NEXT;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.award_deity_bond(uuid, uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_deity_bond(uuid, uuid, integer) TO service_role;
