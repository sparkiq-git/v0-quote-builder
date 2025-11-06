-- ============================================
-- ITINERARY TRIGGERS SETUP (Invoice-Based)
-- ============================================
-- This script sets up the triggers for creating itineraries
-- Trigger fires when invoice is INSERTED (not when quote status changes)
-- ============================================

-- Step 1: Drop old quote-based trigger if it exists
DROP TRIGGER IF EXISTS trg_quote_status_create_itinerary ON public.quote;
DROP FUNCTION IF EXISTS public.handle_quote_status_change();

-- Step 2: Create function to handle invoice INSERT
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
    -- Log error but don't fail the invoice insert
    RAISE WARNING '[ITINERARY TRIGGER] ❌❌❌ ERROR creating itinerary for quote %: %', NEW.quote_id, SQLERRM;
    RAISE WARNING '[ITINERARY TRIGGER] SQLSTATE: %', SQLSTATE;
  END;
  
  RETURN NEW;
END;
$$;

-- Step 3: Create trigger on invoice INSERT
DROP TRIGGER IF EXISTS trg_invoice_insert_create_itinerary ON public.invoice;
CREATE TRIGGER trg_invoice_insert_create_itinerary
  AFTER INSERT ON public.invoice
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_invoice_insert();

-- Step 4: Update invoice paid handler (invoice_id already linked, just ensure it's set)
CREATE OR REPLACE FUNCTION public.handle_invoice_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- When invoice status changes to "paid", ensure itinerary is linked and ready for confirmation
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    -- Ensure invoice_id is linked to itinerary (in case INSERT trigger failed or was skipped)
    UPDATE public.itinerary
    SET invoice_id = NEW.id
    WHERE quote_id = NEW.quote_id
      AND (invoice_id IS NULL OR invoice_id != NEW.id);
    
    RAISE WARNING '[ITINERARY TRIGGER] Invoice % paid for quote %. Itinerary is ready to be confirmed.', NEW.id, NEW.quote_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Step 5: Ensure invoice paid trigger exists (should already exist from user's schema)
-- This keeps the existing trigger name from the user's schema
DROP TRIGGER IF EXISTS trg_invoice_paid_link_itinerary ON public.invoice;
CREATE TRIGGER trg_invoice_paid_link_itinerary
  AFTER UPDATE OF status ON public.invoice
  FOR EACH ROW
  WHEN (NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid'))
  EXECUTE FUNCTION public.handle_invoice_paid();

-- Step 6: Verify triggers were created
SELECT 
  '✅ Triggers created' as status,
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
    ELSE 'UNKNOWN'
  END as event,
  pg_get_triggerdef(oid) as definition
FROM pg_trigger
WHERE tgname IN (
  'trg_invoice_insert_create_itinerary',
  'trg_invoice_paid_link_itinerary'
)
  AND tgrelid = 'public.invoice'::regclass
ORDER BY tgname;

-- ============================================
-- SUMMARY
-- ============================================
-- ✅ Trigger 1: trg_invoice_insert_create_itinerary
--    - Fires: AFTER INSERT on invoice
--    - Action: Creates draft itinerary and links invoice_id
--
-- ✅ Trigger 2: trg_invoice_paid_link_itinerary
--    - Fires: AFTER UPDATE OF status on invoice (when status = 'paid')
--    - Action: Ensures invoice_id is linked (safety check)
--
-- 🔄 Workflow:
--    1. Invoice created → Draft itinerary created automatically
--    2. Invoice paid → Itinerary ready for "trip_confirmed" status
--    3. User changes itinerary status to "trip_confirmed" in application
