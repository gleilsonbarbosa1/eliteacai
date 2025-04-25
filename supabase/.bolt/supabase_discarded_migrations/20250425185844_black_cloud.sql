/*
  # Add maximum redemption limit for specific customer

  1. Changes
    - Add validation for maximum redemption amount for specific customer
    - Maintain existing balance validation
    - Improve error messages
*/

-- Drop existing trigger first to avoid dependency issues
DROP TRIGGER IF EXISTS trg_handle_balance ON transactions;

-- Create improved balance handling trigger with customer-specific limits
CREATE OR REPLACE FUNCTION handle_customer_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_available_balance decimal;
  v_expired_balance decimal;
  v_min_redemption_amount constant decimal := 1.00;
  v_customer_phone text;
BEGIN
  -- For redemptions, verify balance is sufficient
  IF TG_OP IN ('INSERT', 'UPDATE') AND 
     NEW.type = 'redemption' AND 
     NEW.status = 'approved' THEN
    
    -- Round the redemption amount
    NEW.amount := ROUND(NEW.amount, 2);
    
    -- Get customer phone
    SELECT phone INTO v_customer_phone
    FROM customers
    WHERE id = NEW.customer_id;

    -- Validate minimum redemption amount
    IF NEW.amount < v_min_redemption_amount THEN
      RAISE EXCEPTION 'O valor mínimo para resgate é R$ %',
        v_min_redemption_amount;
    END IF;

    -- Validate maximum redemption amount for specific customer
    IF v_customer_phone = '33333333333' AND NEW.amount > 3.00 THEN
      RAISE EXCEPTION 'O valor máximo para resgate é R$ 3,00 para este cliente';
    END IF;

    -- Get available balance
    SELECT get_available_balance(NEW.customer_id) INTO v_available_balance;

    -- Get expired balance
    SELECT COALESCE(SUM(ROUND(cashback_amount, 2)), 0)
    INTO v_expired_balance
    FROM transactions
    WHERE customer_id = NEW.customer_id
      AND type = 'purchase'
      AND status = 'approved'
      AND expires_at <= CURRENT_TIMESTAMP;

    -- Validate balance with proper decimal comparison
    IF ROUND(v_available_balance, 2) < ROUND(NEW.amount, 2) THEN
      IF v_expired_balance > 0 THEN
        RAISE EXCEPTION 'Você possui R$ % em cashback expirado. Saldo disponível para resgate: R$ %',
          ROUND(v_expired_balance, 2),
          ROUND(v_available_balance, 2);
      ELSE
        RAISE EXCEPTION 'Saldo insuficiente para resgate. Disponível: R$ %',
          ROUND(v_available_balance, 2);
      END IF;
    END IF;
  END IF;

  -- Update customer balance
  UPDATE customers c
  SET balance = ROUND(get_available_balance(c.id), 2),
      updated_at = NOW()
  WHERE id = COALESCE(NEW.customer_id, OLD.customer_id);

  RETURN CASE TG_OP
    WHEN 'DELETE' THEN OLD
    ELSE NEW
  END;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trg_handle_balance
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION handle_customer_balance();

-- Add comment
COMMENT ON FUNCTION handle_customer_balance IS 'Handles balance updates and validates redemptions with customer-specific limits';