/*
  # Remove invoice number from transactions

  1. Changes
    - Drop invoice number constraints and column
    - Clean up related indexes
*/

-- Drop constraints first
ALTER TABLE transactions
DROP CONSTRAINT IF EXISTS transactions_invoice_number_check,
DROP CONSTRAINT IF EXISTS transactions_invoice_number_unique;

-- Drop index
DROP INDEX IF EXISTS idx_transactions_invoice_number;

-- Drop column
ALTER TABLE transactions
DROP COLUMN IF EXISTS invoice_number;