/*
  # Fix balance calculation trigger

  1. Changes
    - Drop existing trigger and function
    - Create new trigger function with proper transaction handling
    - Add explicit locking to prevent race conditions
    - Improve balance validation
    - Fix redemption handling

  2. Security
    - Maintain existing RLS policies
    - Prevent balance manipulation
    - Ensure data consistency
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS trg_handle_balance ON transactions;
DROP FUNCTION IF EXISTS handle_customer_balance();

-- Create new function to handle balance updates
CREATE OR REPLACE FUNCTION handle_customer_balance()
RETURNS TRIGGER AS $$
DECLARE
  current_balance decimal;
BEGIN
  -- Lock the customer row for update to prevent race conditions
  SELECT balance INTO current_balance
  FROM customers 
  WHERE id = COALESCE(NEW.customer_id, OLD.customer_id)
  FOR UPDATE;

  -- For redemptions, verify balance is sufficient before proceeding
  IF TG_OP IN ('INSERT', 'UPDATE') AND 
     NEW.type = 'redemption' AND 
     NEW.status = 'approved' THEN
    
    IF current_balance < NEW.amount THEN
      RAISE EXCEPTION 'Insufficient balance for redemption. Available: %, Requested: %', 
        current_balance, NEW.amount;
    END IF;
  END IF;

  -- Update customer balance
  UPDATE customers
  SET balance = (
    SELECT COALESCE(SUM(
      CASE 
        WHEN type = 'purchase' AND status = 'approved' THEN cashback_amount
        WHEN type = 'redemption' AND status = 'approved' THEN -amount
        ELSE 0
      END
    ), 0)
    FROM transactions
    WHERE customer_id = COALESCE(NEW.customer_id, OLD.customer_id)
    AND status = 'approved'
    AND (
      CASE 
        WHEN TG_OP = 'DELETE' THEN id != OLD.id
        WHEN TG_OP = 'UPDATE' THEN id = NEW.id OR id != NEW.id
        ELSE true
      END
    )
  ),
  updated_at = NOW()
  WHERE id = COALESCE(NEW.customer_id, OLD.customer_id);

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

-- Add comment to function for documentation
COMMENT ON FUNCTION handle_customer_balance() IS 'Handles customer balance updates based on transaction changes with proper validation and locking.';