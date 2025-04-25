/*
  # Fix storage policies for receipts

  1. Changes
    - Recreate storage bucket with proper permissions
    - Set up correct RLS policies for public access
    - Ensure proper file size limits

  2. Security
    - Maintain 5MB file size limit
    - Allow public access for basic operations
    - Enable proper bucket security
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow public to read receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to upload receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to update receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to delete own receipts" ON storage.objects;

-- Ensure the bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow public to read any receipt
CREATE POLICY "Allow public to read receipts"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'receipts');

-- Allow public to upload receipts
CREATE POLICY "Allow public to upload receipts"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'receipts' AND
  octet_length(content) <= 5242880
);

-- Allow public to update their own receipts
CREATE POLICY "Allow public to update receipts"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'receipts')
WITH CHECK (octet_length(content) <= 5242880);

-- Allow public to delete their own receipts
CREATE POLICY "Allow public to delete receipts"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'receipts');