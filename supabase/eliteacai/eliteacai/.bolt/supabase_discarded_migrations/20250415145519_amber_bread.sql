/*
  # Implement automatic balance calculation trigger

  1. Changes
    - Create new trigger function that recalculates total balance
    - Drop existing trigger and function
    - Add new trigger that runs on all transaction changes
    - Handle INSERT, UPDATE, and DELETE operations
    - Ensure atomic updates

  2. Security
    - Maintain existing RLS policies
    - Prevent balance manipulation
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS update_customer_balance_on_transaction ON transactions;
DROP FUNCTION IF EXISTS update_customer_balance();

-- Create new function to calculate balance
CREATE OR REPLACE FUNCTION calculate_customer_balance()
RETURNS TRIGGER AS $$
DECLARE
  target_customer_id uuid;
BEGIN
  -- Determine which customer_id to update based on operation type
  IF TG_OP = 'DELETE' THEN
    target_customer_id := OLD.customer_id;
  ELSE
    target_customer_id := NEW.customer_id;
  END IF;

  -- Update customer balance by calculating sum of all approved transactions
  UPDATE customers
  SET 
    balance = (
      SELECT COALESCE(SUM(
        CASE 
          WHEN type = 'purchase' AND status = 'approved' THEN cashback_amount
          WHEN type = 'redemption' AND status = 'approved' THEN -amount
          ELSE 0
        END
      ), 0)
      FROM transactions
      WHERE customer_id = target_customer_id
    ),
    updated_at = NOW()
  WHERE id = target_customer_id;

  -- For INSERT or UPDATE operations, return NEW
  -- For DELETE operations, return OLD
  RETURN CASE TG_OP
    WHEN 'DELETE' THEN OLD
    ELSE NEW
  END;
END;
$$ LANGUAGE plpgsql;

-- Create new trigger that runs on all transaction changes
CREATE TRIGGER calculate_customer_balance_trigger
AFTER INSERT OR UPDATE OR DELETE
ON transactions
FOR EACH ROW
EXECUTE FUNCTION calculate_customer_balance();