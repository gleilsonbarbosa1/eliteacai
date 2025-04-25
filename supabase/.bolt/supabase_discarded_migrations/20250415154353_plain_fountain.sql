/*
  # Fix balance calculation trigger for direct database updates

  1. Changes
    - Update trigger function to handle redemptions directly in the database
    - Add proper validation and error handling
    - Ensure atomic updates
    - Add proper transaction isolation

  2. Security
    - Maintain existing RLS policies
    - Prevent race conditions
    - Ensure data consistency
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS trg_handle_balance ON transactions;
DROP FUNCTION IF EXISTS handle_customer_balance();

-- Create new function to handle balance updates
CREATE OR REPLACE FUNCTION handle_customer_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- For redemptions, verify balance is sufficient before proceeding
  IF TG_OP IN ('INSERT', 'UPDATE') AND 
     NEW.type = 'redemption' AND 
     NEW.status = 'approved' THEN
    
    -- Lock the customer row for update to prevent race conditions
    PERFORM id 
    FROM customers 
    WHERE id = NEW.customer_id 
    FOR UPDATE;
    
    -- Check if customer has sufficient balance
    IF EXISTS (
      SELECT 1 
      FROM customers 
      WHERE id = NEW.customer_id 
      AND balance < NEW.amount
    ) THEN
      RAISE EXCEPTION 'Insufficient balance for redemption';
    END IF;
  END IF;

  -- Update customer balance based on transaction type
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