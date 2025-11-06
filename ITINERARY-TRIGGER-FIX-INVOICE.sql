-- ============================================
-- FIX INVOICE TRIGGER WITH ENHANCED LOGGING
-- ============================================
-- Run this to fix and enhance the invoice trigger
-- ============================================

-- Step 1: Drop and recreate the trigger function with enhanced logging
CREATE OR REPLACE FUNCTION public.handle_invoice_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_itinerary_id UUID;
BEGIN
  -- ALWAYS log when trigger fires (use RAISE WARNING so it shows in logs)
  RAISE WARNING '[ITINERARY TRIGGER] 🔔🔔🔔 Invoice INSERT trigger fired! Invoice: %, Quote: %', NEW.id, NEW.quote_id;
  
  -- Check if itinerary already exists for this quote (prevent duplicates)
  IF EXISTS (SELECT 1 FROM public.itinerary WHERE quote_id = NEW.quote_id) THEN
    RAISE WARNING '[ITINERARY TRIGGER] Itinerary already exists for quote %, linking invoice_id...', NEW.quote_id;
    
    -- Update existing itinerary to link this invoice
    UPDATE public.itinerary
    SET invoice_id = NEW.id
    WHERE quote_id = NEW.quote_id
      AND invoice_id IS NULL;
    
    RAISE WARNING '[ITINERARY TRIGGER] ✅ Linked invoice % to existing itinerary', NEW.id;
    RETURN NEW;
  END IF;
  
  -- Create new draft itinerary from quote
  RAISE WARNING '[ITINERARY TRIGGER] Creating draft itinerary for quote: %', NEW.quote_id;
  
  BEGIN
    v_itinerary_id := public.create_itinerary_from_quote(NEW.quote_id);
    
    -- Link the invoice_id to the newly created itinerary
    UPDATE public.itinerary
    SET invoice_id = NEW.id
    WHERE id = v_itinerary_id;
    
    RAISE WARNING '[ITINERARY TRIGGER] ✅✅✅ SUCCESS! Created itinerary % and linked invoice % for quote: %', 
      v_itinerary_id, NEW.id, NEW.quote_id;
  EXCEPTION WHEN OTHERS THEN
    -- Log detailed error but don't fail the invoice insert
    RAISE WARNING '[ITINERARY TRIGGER] ❌❌❌ ERROR creating itinerary for quote %: %', NEW.quote_id, SQLERRM;
    RAISE WARNING '[ITINERARY TRIGGER] SQLSTATE: %', SQLSTATE;
    -- Don't re-raise - let invoice insert succeed even if itinerary creation fails
  END;
  
  RETURN NEW;
END;
$$;

-- Step 2: Drop and recreate the trigger (ensure it's AFTER INSERT)
DROP TRIGGER IF EXISTS trg_invoice_insert_create_itinerary ON public.invoice;

CREATE TRIGGER trg_invoice_insert_create_itinerary
  AFTER INSERT ON public.invoice
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_invoice_insert();

-- Step 3: Verify trigger was created
SELECT 
  '✅ Trigger created' as status,
  tgname as trigger_name,
  CASE tgenabled 
    WHEN 'O' THEN '✅ Enabled'
    WHEN 'D' THEN '⚠️ DISABLED - Enable it with: ALTER TABLE invoice ENABLE TRIGGER trg_invoice_insert_create_itinerary;'
    ELSE '❓ Unknown'
  END as enabled,
  CASE 
    WHEN tgtype & 2 = 2 THEN 'BEFORE'
    ELSE 'AFTER'
  END as timing,
  pg_get_triggerdef(oid) as definition
FROM pg_trigger
WHERE tgname = 'trg_invoice_insert_create_itinerary'
  AND tgrelid = 'public.invoice'::regclass;

-- Step 4: If trigger is disabled, enable it
-- ALTER TABLE public.invoice ENABLE TRIGGER trg_invoice_insert_create_itinerary;

-- Step 5: Test with a manual invoice insert (optional - uncomment and modify)
/*
-- First, create a test invoice
INSERT INTO public.invoice (
  tenant_id,
  quote_id,
  selected_option_id,
  number,
  amount,
  currency,
  status
) VALUES (
  'your-tenant-id',
  'your-quote-id',
  'your-selected-option-id',
  'TEST-001',
  1000.00,
  'USD',
  'issued'
) RETURNING id;

-- Check logs for [ITINERARY TRIGGER] messages
-- Check if itinerary was created
SELECT * FROM public.itinerary WHERE quote_id = 'your-quote-id';
*/
