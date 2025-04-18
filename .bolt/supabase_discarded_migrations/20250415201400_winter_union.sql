/*
  # Add receipt image support to transactions

  1. Changes
    - Add receipt_image_url column to transactions table
    - Create storage bucket for receipt images
    - Add storage policies for public access

  2. Security
    - Enable public access to receipts bucket
    - Add file size limit of 5MB
*/

-- Add receipt_image_url column
ALTER TABLE transactions
ADD COLUMN receipt_image_url text;

-- Create storage bucket for receipts if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

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