-- ============================================
-- ITINERARY TRIGGER DIAGNOSTICS (Invoice-Based)
-- ============================================
-- Run this to diagnose why the invoice trigger isn't firing
-- ============================================

-- STEP 1: Check if trigger exists and is enabled
SELECT 
  tgname as trigger_name,
  CASE tgenabled 
    WHEN 'O' THEN '✅ Enabled'
    WHEN 'D' THEN '⚠️ DISABLED - This is the problem!'
    ELSE '❓ Unknown'
  END as enabled,
  CASE 
    WHEN tgtype & 2 = 2 THEN 'BEFORE'
    ELSE 'AFTER'
  END as timing,
  CASE 
    WHEN tgtype & 4 = 4 THEN 'INSERT'
    WHEN tgtype & 8 = 8 THEN 'DELETE'
    WHEN tgtype & 16 = 16 THEN 'UPDATE'
    ELSE 'UNKNOWN'
  END as event,
  pg_get_triggerdef(oid) as definition
FROM pg_trigger
WHERE tgrelid = 'public.invoice'::regclass
  AND tgname = 'trg_invoice_insert_create_itinerary'
ORDER BY tgname;

-- STEP 2: Check ALL triggers on invoice table (to see order and conflicts)
SELECT 
  tgname as trigger_name,
  CASE tgenabled 
    WHEN 'O' THEN '✅ Enabled'
    WHEN 'D' THEN '⚠️ DISABLED'
    ELSE '❓ Unknown'
  END as enabled,
  CASE 
    WHEN tgtype & 2 = 2 THEN 'BEFORE'
    ELSE 'AFTER'
  END as timing,
  CASE 
    WHEN tgtype & 4 = 4 THEN 'INSERT'
    WHEN tgtype & 8 = 8 THEN 'DELETE'
    WHEN tgtype & 16 = 16 THEN 'UPDATE'
    WHEN tgtype & 20 = 20 THEN 'INSERT OR UPDATE'
    ELSE 'UNKNOWN'
  END as event,
  pg_get_triggerdef(oid) as definition
FROM pg_trigger
WHERE tgrelid = 'public.invoice'::regclass
  AND NOT tgisinternal
ORDER BY 
  CASE WHEN tgtype & 2 = 2 THEN 1 ELSE 2 END, -- BEFORE triggers first
  tgname;

-- STEP 3: Check if function exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_invoice_insert') 
    THEN '✅ Function exists'
    ELSE '❌ Function DOES NOT exist'
  END as function_check,
  proname as function_name,
  CASE 
    WHEN prosrc LIKE '%RAISE%' THEN 'Has logging'
    ELSE 'No logging found'
  END as has_logging
FROM pg_proc
WHERE proname = 'handle_invoice_insert';

-- STEP 4: Check if RPC function exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_itinerary_from_quote') 
    THEN '✅ RPC function exists'
    ELSE '❌ RPC function DOES NOT exist'
  END as rpc_function_check;

-- STEP 5: Check recent invoice inserts
SELECT 
  id,
  quote_id,
  status,
  created_at,
  updated_at
FROM public.invoice
ORDER BY created_at DESC
LIMIT 10;

-- STEP 6: Check if itineraries exist for recent invoices
SELECT 
  i.id as invoice_id,
  i.quote_id,
  i.status as invoice_status,
  i.created_at as invoice_created,
  it.id as itinerary_id,
  it.status as itinerary_status,
  it.created_at as itinerary_created,
  CASE 
    WHEN it.id IS NULL THEN '❌ NO ITINERARY FOUND'
    WHEN it.invoice_id IS NULL THEN '⚠️ Itinerary exists but invoice_id not linked'
    WHEN it.invoice_id = i.id THEN '✅ Itinerary exists and linked'
    ELSE '⚠️ Itinerary linked to different invoice'
  END as status
FROM public.invoice i
LEFT JOIN public.itinerary it ON i.quote_id = it.quote_id
ORDER BY i.created_at DESC
LIMIT 10;

-- STEP 7: Test the function manually (replace INVOICE_ID with actual invoice ID)
-- Uncomment and run with a specific invoice_id:
/*
DO $$
DECLARE
  v_test_invoice_id UUID := 'INVOICE_ID_HERE';
  v_invoice RECORD;
  v_itinerary_exists BOOLEAN;
BEGIN
  -- Get invoice data
  SELECT * INTO v_invoice
  FROM public.invoice
  WHERE id = v_test_invoice_id;
  
  IF NOT FOUND THEN
    RAISE NOTICE '❌ Invoice % not found', v_test_invoice_id;
    RETURN;
  END IF;
  
  RAISE NOTICE '📋 Invoice data:';
  RAISE NOTICE '  - ID: %', v_invoice.id;
  RAISE NOTICE '  - Quote ID: %', v_invoice.quote_id;
  RAISE NOTICE '  - Status: %', v_invoice.status;
  
  -- Check if itinerary exists
  SELECT EXISTS(SELECT 1 FROM public.itinerary WHERE quote_id = v_invoice.quote_id) 
  INTO v_itinerary_exists;
  
  IF v_itinerary_exists THEN
    RAISE NOTICE '⚠️ Itinerary already exists for quote %', v_invoice.quote_id;
  ELSE
    RAISE NOTICE '✅ No itinerary exists, trigger should have created one';
  END IF;
  
  -- Test the trigger function manually
  BEGIN
    PERFORM public.handle_invoice_insert() FROM (SELECT * FROM public.invoice WHERE id = v_test_invoice_id) AS t;
    RAISE NOTICE '✅ Trigger function executed (but it expects NEW/OLD context)';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Function error: %', SQLERRM;
  END;
END $$;
*/

