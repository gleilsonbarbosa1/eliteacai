/*
  # Add name field to customers table

  1. Changes
    - Add name column to customers table
    - Make it optional to maintain compatibility with existing records
    - Add index for better search performance

  2. Security
    - Maintain existing RLS policies
*/

-- Add name column
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS name text;

-- Add index for name search
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers (name);