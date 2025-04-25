/*
  # Add store code and invoice number fields

  1. Changes
    - Add store_code and invoice_number columns
    - Clean existing data to match new constraints
    - Add proper validation constraints
    - Add index for performance

  2. Security
    - Maintain existing RLS policies
*/

-- First drop any existing constraints that might conflict
ALTER TABLE transactions
DROP CONSTRAINT IF EXISTS transactions_store_code_check,
DROP CONSTRAINT IF EXISTS transactions_store_invoice_unique,
DROP CONSTRAINT IF EXISTS transactions_invoice_number_check;

-- Drop existing index if it exists
DROP INDEX IF EXISTS idx_transactions_store_invoice;

-- Add columns if they don't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'store_code') THEN
    ALTER TABLE transactions ADD COLUMN store_code text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'invoice_number') THEN
    ALTER TABLE transactions ADD COLUMN invoice_number text;
  END IF;
END $$;

-- Clean and update existing records with valid values
WITH cleaned_data AS (
  SELECT 
    id,
    type,
    created_at,
    CASE 
      WHEN type = 'redemption' THEN 'RES'
      ELSE 'LEG'
    END as new_store_code,
    CASE 
      WHEN type = 'redemption' THEN 
        -- Ensure redemption invoice numbers are valid
        LEFT(REGEXP_REPLACE('R' || EXTRACT(EPOCH FROM created_at)::text, '[^A-Za-z0-9-]', ''), 20)
      ELSE 
        -- Ensure purchase invoice numbers are valid
        LEFT(REGEXP_REPLACE('M' || id::text, '[^A-Za-z0-9-]', ''), 20)
    END as new_invoice_number
  FROM transactions
  WHERE store_code IS NULL OR invoice_number IS NULL
)
UPDATE transactions t
SET 
  store_code = cd.new_store_code,
  invoice_number = cd.new_invoice_number
FROM cleaned_data cd
WHERE t.id = cd.id;

-- Add check constraints first (while columns are nullable)
ALTER TABLE transactions
ADD CONSTRAINT transactions_store_code_check 
CHECK (store_code ~ '^[A-Za-z0-9]{3,10}$');

ALTER TABLE transactions
ADD CONSTRAINT transactions_invoice_number_check 
CHECK (invoice_number ~ '^[A-Za-z0-9-]{1,20}$');

-- Now make columns NOT NULL after ensuring data is valid
ALTER TABLE transactions 
ALTER COLUMN store_code SET NOT NULL,
ALTER COLUMN invoice_number SET NOT NULL;

-- Create unique constraint to prevent duplicate invoices per store
ALTER TABLE transactions
ADD CONSTRAINT transactions_store_invoice_unique 
UNIQUE (store_code, invoice_number);

-- Add index for faster lookups
CREATE INDEX idx_transactions_store_invoice 
ON transactions(store_code, invoice_number);