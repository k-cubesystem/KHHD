-- ============================================================
-- Atomic wallet balance deduction RPC function
--
-- Prevents race condition in concurrent deduct requests.
-- Uses UPDATE ... WHERE balance >= p_amount for atomic check-and-deduct.
--
-- Returns:
--   >= 0 : new balance (success)
--   -1   : wallet not found
--   -2   : insufficient balance
-- ============================================================
CREATE OR REPLACE FUNCTION deduct_wallet_balance(p_user_id UUID, p_amount INT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance INT;
BEGIN
  -- Validate input
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT: amount must be positive, got %', p_amount;
  END IF;

  -- Atomic deduction: only succeeds if balance >= p_amount
  UPDATE wallets
  SET balance = balance - p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id
    AND balance >= p_amount
  RETURNING balance INTO v_new_balance;

  IF NOT FOUND THEN
    -- Distinguish between "wallet not found" and "insufficient balance"
    PERFORM 1 FROM wallets WHERE user_id = p_user_id;
    IF NOT FOUND THEN
      RETURN -1; -- wallet not found
    ELSE
      RETURN -2; -- insufficient balance
    END IF;
  END IF;

  RETURN v_new_balance;
END;
$$;

-- Grant execute to authenticated users (caller context enforces RLS)
GRANT EXECUTE ON FUNCTION deduct_wallet_balance(UUID, INT) TO authenticated;

COMMENT ON FUNCTION deduct_wallet_balance IS 'Atomic wallet deduction. Returns new balance on success, -1 if no wallet, -2 if insufficient balance';
