/*
  # Fix transaction policies

  1. Changes
    - Drop existing transaction policies
    - Create new policies allowing public access for transaction creation
    - Enable read access for all users
    - Maintain authenticated access for updates

  2. Security
    - Allow public access for transaction creation
    - Allow public read access for viewing transactions
    - Maintain authenticated access for updates
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Transactions are viewable by authenticated users" ON transactions;
DROP POLICY IF EXISTS "Transactions are insertable by authenticated users" ON transactions;
DROP POLICY IF EXISTS "Transactions are updatable by authenticated users" ON transactions;

-- Create new policies with proper access
CREATE POLICY "Enable insert access for all users"
  ON transactions
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Enable read access for all users"
  ON transactions
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Enable update access for authenticated users"
  ON transactions
  FOR UPDATE
  TO authenticated
  USING (true);

-- Ensure RLS is enabled
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;