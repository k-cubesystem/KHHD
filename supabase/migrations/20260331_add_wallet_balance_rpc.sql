-- ============================================================
-- Atomic wallet balance addition RPC function
--
-- Mirrors deduct_wallet_balance but for credits (payments, bonuses).
-- Prevents race condition in concurrent add requests.
-- Uses UPDATE SET balance = balance + p_amount for atomic increment.
--
-- Returns:
--   >= 0 : new balance (success)
--   -1   : wallet not found (auto-creates wallet)
-- ============================================================
CREATE OR REPLACE FUNCTION add_wallet_balance(p_user_id UUID, p_amount INT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance INT;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT: amount must be positive, got %', p_amount;
  END IF;

  -- Atomic increment
  UPDATE wallets
  SET balance = balance + p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;

  IF NOT FOUND THEN
    -- Auto-create wallet with initial balance
    INSERT INTO wallets (user_id, balance)
    VALUES (p_user_id, p_amount)
    ON CONFLICT (user_id) DO UPDATE
      SET balance = wallets.balance + p_amount,
          updated_at = NOW()
    RETURNING balance INTO v_new_balance;
  END IF;

  RETURN v_new_balance;
END;
$$;

GRANT EXECUTE ON FUNCTION add_wallet_balance(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION add_wallet_balance(UUID, INT) TO service_role;

COMMENT ON FUNCTION add_wallet_balance IS 'Atomic wallet credit. Returns new balance. Auto-creates wallet if missing.';
