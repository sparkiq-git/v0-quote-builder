-- Data migration: Create member records for existing users
-- Run this AFTER enabling RLS but BEFORE testing
-- This ensures all existing users have member records

-- First, check for users without member records
DO $$
DECLARE
  missing_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO missing_count
  FROM auth.users au
  LEFT JOIN public.member m ON au.id = m.user_id
  WHERE m.id IS NULL
  AND au.raw_app_meta_data->>'tenant_id' IS NOT NULL;

  RAISE NOTICE 'Found % users without member records', missing_count;
END $$;

-- Create member records for users missing them
-- This uses the tenant_id from app_metadata
INSERT INTO public.member (tenant_id, user_id, role, is_global_admin, created_at)
SELECT 
  (raw_app_meta_data->>'tenant_id')::uuid as tenant_id,
  id as user_id,
  COALESCE(
    (raw_app_meta_data->>'role'),
    CASE 
      WHEN (raw_app_meta_data->'roles'->>0) IS NOT NULL 
      THEN raw_app_meta_data->'roles'->>0
      ELSE 'user'
    END,
    'user'
  ) as role,
  COALESCE((raw_app_meta_data->>'is_global_admin')::boolean, false) as is_global_admin,
  created_at
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.member)
AND raw_app_meta_data->>'tenant_id' IS NOT NULL
ON CONFLICT (tenant_id, user_id) DO NOTHING;

-- Verify the migration
DO $$
DECLARE
  still_missing INTEGER;
BEGIN
  SELECT COUNT(*) INTO still_missing
  FROM auth.users au
  LEFT JOIN public.member m ON au.id = m.user_id
  WHERE m.id IS NULL
  AND au.raw_app_meta_data->>'tenant_id' IS NOT NULL;

  IF still_missing > 0 THEN
    RAISE WARNING 'Still have % users without member records. Please review manually.', still_missing;
  ELSE
    RAISE NOTICE 'Migration complete: All users with tenant_id now have member records';
  END IF;
END $$;
