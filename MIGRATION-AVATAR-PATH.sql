-- Migration: Add avatar_path columns to contact and contact_passenger tables
-- Run this in your Supabase SQL Editor

-- Add avatar_path column to contact table
ALTER TABLE public.contact 
ADD COLUMN IF NOT EXISTS avatar_path TEXT NULL;

-- Add avatar_path column to contact_passenger table  
ALTER TABLE public.contact_passenger 
ADD COLUMN IF NOT EXISTS avatar_path TEXT NULL;

-- Optional: Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS contact_avatar_path_idx ON public.contact(avatar_path) 
WHERE avatar_path IS NOT NULL;

CREATE INDEX IF NOT EXISTS contact_passenger_avatar_path_idx ON public.contact_passenger(avatar_path) 
WHERE avatar_path IS NOT NULL;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('contact', 'contact_passenger')
  AND column_name = 'avatar_path';
