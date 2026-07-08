-- ============================================================
-- 신당 인벤토리 원자적 지급 RPC (구매/보상) — 2026-07-12
-- 적용: plzvanxcxjkaazcfrtls (MCP apply_migration 완료)
-- ============================================================
CREATE OR REPLACE FUNCTION public.grant_shrine_item(p_user_id UUID, p_item_id UUID, p_qty INT DEFAULT 1)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_qty INT;
BEGIN
  INSERT INTO user_shrine_inventory (user_id, catalog_item_id, qty)
  VALUES (p_user_id, p_item_id, p_qty)
  ON CONFLICT (user_id, catalog_item_id) DO UPDATE
    SET qty = user_shrine_inventory.qty + p_qty, updated_at = now()
  RETURNING qty INTO v_qty;
  RETURN v_qty;
END;
$$;
GRANT EXECUTE ON FUNCTION public.grant_shrine_item(UUID, UUID, INT) TO authenticated, service_role;
