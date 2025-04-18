/*
  # Fix receipts storage and policies

  1. Changes
    - Drop existing policies to avoid conflicts
    - Create storage bucket for receipts
    - Add receipt_image_url column
    - Set up proper storage policies
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow public to read receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to upload receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to update receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to delete receipts" ON storage.objects;

-- Create storage bucket for receipts if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Add receipt_image_url column if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' 
    AND column_name = 'receipt_image_url'
  ) THEN
    ALTER TABLE transactions ADD COLUMN receipt_image_url text;
  END IF;
END $$;

-- Allow public access to read receipts
CREATE POLICY "Allow public to read receipts"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'receipts');

-- Allow public access to upload receipts
CREATE POLICY "Allow public to upload receipts"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'receipts' AND
  LENGTH(COALESCE(NULLIF(metadata->>'size', '')::int, 0)) <= 5242880
);

-- Allow public access to update receipts
CREATE POLICY "Allow public to update receipts"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'receipts')
WITH CHECK (LENGTH(COALESCE(NULLIF(metadata->>'size', '')::int, 0)) <= 5242880);

-- Allow public access to delete receipts
CREATE POLICY "Allow public to delete receipts"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'receipts');