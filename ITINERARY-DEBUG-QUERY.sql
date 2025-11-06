-- ============================================
-- DEBUG: Check why itinerary isn't showing up
-- ============================================
-- Run this to check if the itinerary exists and has correct tenant_id
-- ============================================

-- Step 1: Check if itinerary exists
SELECT 
  id,
  quote_id,
  invoice_id,
  contact_id,
  tenant_id,
  status,
  title,
  trip_summary,
  created_at
FROM public.itinerary
WHERE id = '6f3d7fe8-cdad-4d08-94ac-1a7891bab810';

-- Step 2: Check tenant_id from invoice
SELECT 
  i.id as invoice_id,
  i.tenant_id as invoice_tenant_id,
  it.id as itinerary_id,
  it.tenant_id as itinerary_tenant_id,
  CASE 
    WHEN i.tenant_id = it.tenant_id THEN '✅ Match'
    ELSE '❌ MISMATCH'
  END as tenant_match
FROM public.invoice i
JOIN public.itinerary it ON i.quote_id = it.quote_id
WHERE i.id = '2d1de827-9972-41e2-8f58-6c46e6965373';

-- Step 3: Check contact exists
SELECT 
  id,
  tenant_id,
  full_name,
  email,
  status
FROM public.contact
WHERE id = (
  SELECT contact_id 
  FROM public.itinerary 
  WHERE id = '6f3d7fe8-cdad-4d08-94ac-1a7891bab810'
);

-- Step 4: Test the exact query the API uses
-- Replace YOUR_TENANT_ID with the actual tenant_id from the invoice
SELECT 
  it.*,
  c.id as contact_id_check,
  c.full_name,
  c.email,
  c.company
FROM public.itinerary it
LEFT JOIN public.contact c ON it.contact_id = c.id
WHERE it.tenant_id = 'YOUR_TENANT_ID_HERE'
ORDER BY it.created_at DESC;

-- Step 5: Check if RLS policies exist (they shouldn't, but let's verify)
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'itinerary';

-- Step 6: Check if RLS is enabled on itinerary table
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'itinerary';
