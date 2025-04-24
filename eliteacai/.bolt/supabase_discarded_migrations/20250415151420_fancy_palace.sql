/*
  # Fix balance calculation for redemptions

  1. Changes
    - Drop existing triggers and function
    - Create new balance calculation function that properly handles redemptions
    - Add validation to prevent negative balances
    - Create new trigger with proper timing
    
  2. Security
    - Maintain existing RLS policies
    - Ensure atomic updates
*/

-- Drop existing triggers and function
DROP TRIGGER IF EXISTS trg_update_balance ON transactions;
DROP TRIGGER IF EXISTS update_customer_balance_on_transaction ON transactions;
DROP TRIGGER IF EXISTS trg_calculate_balance ON transactions;
DROP FUNCTION IF EXISTS update_customer_balance();
DROP FUNCTION IF EXISTS calculate_customer_balance();

-- Create new function to handle balance updates
CREATE OR REPLACE FUNCTION handle_customer_balance()
RETURNS TRIGGER AS $$
DECLARE
  new_balance decimal;
BEGIN
  -- Calculate new balance for the customer
  SELECT COALESCE(SUM(
    CASE 
      WHEN type = 'purchase' AND status = 'approved' THEN cashback_amount
      WHEN type = 'redemption' AND status = 'approved' THEN -amount
      ELSE 0
    END
  ), 0)
  INTO new_balance
  FROM transactions
  WHERE customer_id = COALESCE(NEW.customer_id, OLD.customer_id);

  -- Update customer balance
  UPDATE customers
  SET 
    balance = new_balance,
    updated_at = NOW()
  WHERE id = COALESCE(NEW.customer_id, OLD.customer_id);

  -- For redemptions, verify balance is sufficient
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.type = 'redemption' AND NEW.status = 'approved' AND new_balance < 0 THEN
      RAISE EXCEPTION 'Insufficient balance for redemption';
    END IF;
  END IF;

  RETURN CASE TG_OP
    WHEN 'DELETE' THEN OLD
    ELSE NEW
  END;
END;
$$ LANGUAGE plpgsql;

-- Create new trigger
CREATE TRIGGER trg_handle_balance
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION handle_customer_balance();