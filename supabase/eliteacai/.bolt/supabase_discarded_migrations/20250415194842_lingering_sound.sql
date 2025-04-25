/*
  # Add invoice number field to transactions

  1. Changes
    - Add invoice_number column to transactions table
    - Clean existing data to match new constraints
    - Add proper validation constraints
    - Add index for performance

  2. Security
    - Maintain existing RLS policies
*/

-- Drop any existing constraints and indexes to avoid conflicts
DROP INDEX IF EXISTS idx_transactions_invoice_number;
DROP CONSTRAINT IF EXISTS transactions_invoice_number_check;
DROP CONSTRAINT IF EXISTS transactions_invoice_number_unique;

-- Add invoice_number column if it doesn't exist
DO $$ 
BEGIN 
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
      WHEN type = 'redemption' THEN 
        -- Ensure redemption invoice numbers are valid
        LEFT(REGEXP_REPLACE('R' || EXTRACT(EPOCH FROM created_at)::text, '[^A-Za-z0-9-]', ''), 20)
      ELSE 
        -- Ensure purchase invoice numbers are valid
        LEFT(REGEXP_REPLACE('M' || id::text, '[^A-Za-z0-9-]', ''), 20)
    END as new_invoice_number
  FROM transactions
  WHERE invoice_number IS NULL
)
UPDATE transactions t
SET invoice_number = cd.new_invoice_number
FROM cleaned_data cd
WHERE t.id = cd.id;

-- Add check constraint for invoice_number format
ALTER TABLE transactions
ADD CONSTRAINT transactions_invoice_number_check 
CHECK (invoice_number ~ '^[A-Za-z0-9-]{1,20}$');

-- Make column NOT NULL after ensuring data is valid
ALTER TABLE transactions 
ALTER COLUMN invoice_number SET NOT NULL;

-- Create unique constraint
ALTER TABLE transactions
ADD CONSTRAINT transactions_invoice_number_unique 
UNIQUE (invoice_number);

-- Add index for faster lookups
CREATE INDEX idx_transactions_invoice_number 
ON transactions(invoice_number);