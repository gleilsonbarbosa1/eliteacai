/*
  # Fix balance calculation trigger

  1. Changes
    - Drop existing triggers and function
    - Create new trigger function with proper balance calculation
    - Add new trigger that handles all transaction changes
    - Ensure atomic updates and prevent race conditions

  2. Security
    - Maintain existing RLS policies
    - Prevent balance manipulation
*/

-- Drop existing triggers and function
DROP TRIGGER IF EXISTS trg_update_balance ON transactions;
DROP TRIGGER IF EXISTS update_customer_balance_on_transaction ON transactions;
DROP FUNCTION IF EXISTS update_customer_balance();

-- Create new function to calculate balance
CREATE OR REPLACE FUNCTION calculate_customer_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Update customer balance based on transaction type and status
  UPDATE customers c
  SET balance = (
    SELECT COALESCE(SUM(
      CASE 
        WHEN t.type = 'purchase' AND t.status = 'approved' THEN t.cashback_amount
        WHEN t.type = 'redemption' AND t.status = 'approved' THEN -t.amount
        ELSE 0
      END
    ), 0)
    FROM transactions t
    WHERE t.customer_id = c.id
  ),
  updated_at = NOW()
  WHERE c.id = COALESCE(NEW.customer_id, OLD.customer_id);

  -- Return appropriate record based on operation
  RETURN CASE TG_OP
    WHEN 'DELETE' THEN OLD
    ELSE NEW
  END;
END;
$$ LANGUAGE plpgsql;

-- Create new trigger that runs on all transaction changes
CREATE TRIGGER trg_calculate_balance
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW
EXECUTE FUNCTION calculate_customer_balance();