-- ============================================
-- FIX: create_itinerary_from_quote RPC Function
-- ============================================
-- Fixes the column reference error: aircraft_tail_id doesn't exist in quote_option
-- ============================================

CREATE OR REPLACE FUNCTION public.create_itinerary_from_quote(p_quote_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_itinerary_id UUID;
  v_quote RECORD;
  v_quote_detail RECORD;
  v_contact_id UUID;
  v_tenant_id UUID;
  v_leg_count INTEGER;
  v_total_pax INTEGER;
  v_earliest_departure DATE;
  v_latest_return DATE;
  v_seq INTEGER;
BEGIN
  -- Fetch comprehensive quote data including all relevant fields
  -- Also join with lead table to get lead-specific fields
  SELECT 
    q.id,
    q.tenant_id,
    q.contact_id,
    q.lead_id,
    q.selected_option_id,
    q.title,
    q.trip_summary,
    q.trip_type,
    q.leg_count,
    q.total_pax,
    q.domestic_trip,
    q.aircraft_pref,
    q.notes,
    q.special_notes,
    q.currency,
    q.earliest_departure,
    q.latest_return,
    qo.aircraft_id,
    ac.tail_number as aircraft_tail_no,
    -- Lead-specific fields
    l.asap,
    l.source,
    l.source_ref,
    l.special_notes as lead_special_notes
  INTO v_quote
  FROM public.quote q
  LEFT JOIN public.quote_option qo ON q.selected_option_id = qo.id
  LEFT JOIN public.aircraft ac ON qo.aircraft_id = ac.id -- FIXED: quote_option only has aircraft_id, not aircraft_tail_id
  LEFT JOIN public.lead l ON q.lead_id = l.id
  WHERE q.id = p_quote_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quote not found: %', p_quote_id;
  END IF;
  
  -- Check if itinerary already exists
  IF EXISTS (SELECT 1 FROM public.itinerary WHERE quote_id = p_quote_id) THEN
    RAISE EXCEPTION 'Itinerary already exists for quote: %', p_quote_id;
  END IF;
  
  -- Log start of itinerary creation
  RAISE NOTICE '[CREATE ITINERARY] Starting itinerary creation for quote: %', p_quote_id;
  
  -- Get contact_id (use from quote or find/create from contact_name/email)
  v_contact_id := v_quote.contact_id;
  v_tenant_id := v_quote.tenant_id;
  
  -- Validate required fields
  IF v_contact_id IS NULL THEN
    RAISE EXCEPTION 'Quote % does not have a contact_id. Cannot create itinerary without a contact.', p_quote_id;
  END IF;
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Quote % does not have a tenant_id. Cannot create itinerary without a tenant.', p_quote_id;
  END IF;
  
  -- Use leg_count from quote if available, otherwise count from quote_detail
  IF v_quote.leg_count IS NOT NULL AND v_quote.leg_count > 0 THEN
    v_leg_count := v_quote.leg_count;
  ELSE
    SELECT COUNT(*) INTO v_leg_count
    FROM public.quote_detail
    WHERE quote_id = p_quote_id;
  END IF;
  
  -- Use total_pax from quote if available, otherwise calculate from quote_detail
  IF v_quote.total_pax IS NOT NULL AND v_quote.total_pax > 0 THEN
    v_total_pax := v_quote.total_pax;
  ELSE
    SELECT COALESCE(MAX(pax_count), 0) INTO v_total_pax
    FROM public.quote_detail
    WHERE quote_id = p_quote_id;
  END IF;
  
  -- Use dates from quote if available (convert timestamp to date), otherwise calculate from quote_detail
  IF v_quote.earliest_departure IS NOT NULL THEN
    v_earliest_departure := v_quote.earliest_departure::DATE;
  ELSE
    SELECT MIN(depart_dt) INTO v_earliest_departure
    FROM public.quote_detail
    WHERE quote_id = p_quote_id;
  END IF;
  
  IF v_quote.latest_return IS NOT NULL THEN
    v_latest_return := v_quote.latest_return::DATE;
  ELSE
    -- For latest return, use the latest depart_dt from quote_detail
    SELECT MAX(depart_dt) INTO v_latest_return
    FROM public.quote_detail
    WHERE quote_id = p_quote_id;
  END IF;
  
  -- Create itinerary with all relevant fields from quote and lead
  INSERT INTO public.itinerary (
    quote_id,
    contact_id,
    lead_id,
    tenant_id,
    status,
    title,
    trip_summary,
    trip_type,
    leg_count,
    total_pax,
    domestic_trip,
    asap,
    aircraft_id,
    aircraft_tail_id, -- Set to same as aircraft_id (quote_option only has aircraft_id)
    aircraft_tail_no,
    aircraft_pref,
    earliest_departure,
    latest_return,
    notes,
    special_requirements,
    currency,
    source,
    source_ref,
    created_by
  ) VALUES (
    p_quote_id,
    v_contact_id,
    v_quote.lead_id,
    v_tenant_id,
    'draft',
    v_quote.title,
    v_quote.trip_summary,
    v_quote.trip_type,
    v_leg_count,
    v_total_pax,
    v_quote.domestic_trip,
    COALESCE(v_quote.asap, false),
    v_quote.aircraft_id,
    v_quote.aircraft_id, -- FIXED: aircraft_tail_id = aircraft_id (quote_option doesn't have separate tail_id)
    v_quote.aircraft_tail_no,
    v_quote.aircraft_pref,
    v_earliest_departure,
    v_latest_return,
    v_quote.notes,
    -- Use quote special_notes if available, otherwise use lead special_notes
    COALESCE(v_quote.special_notes, v_quote.lead_special_notes),
    COALESCE(v_quote.currency, 'USD'),
    v_quote.source,
    v_quote.source_ref,
    auth.uid()
  )
  RETURNING id INTO v_itinerary_id;
  
  -- Copy quote_detail to itinerary_detail
  v_seq := 1;
  FOR v_quote_detail IN
    SELECT * FROM public.quote_detail
    WHERE quote_id = p_quote_id
    ORDER BY seq
  LOOP
    INSERT INTO public.itinerary_detail (
      itinerary_id,
      seq,
      origin,
      origin_code,
      destination,
      destination_code,
      depart_dt,
      depart_time,
      pax_count,
      notes,
      origin_lat,
      origin_long,
      destination_lat,
      destination_long,
      distance_nm
    ) VALUES (
      v_itinerary_id,
      v_seq,
      v_quote_detail.origin,
      v_quote_detail.origin_code,
      v_quote_detail.destination,
      v_quote_detail.destination_code,
      v_quote_detail.depart_dt,
      v_quote_detail.depart_time,
      v_quote_detail.pax_count,
      v_quote_detail.notes,
      v_quote_detail.origin_lat,
      v_quote_detail.origin_long,
      v_quote_detail.destination_lat,
      v_quote_detail.destination_long,
      v_quote_detail.distance_nm
    );
    
    v_seq := v_seq + 1;
  END LOOP;
  
  -- Update itinerary dates if needed (recalculate from detail)
  UPDATE public.itinerary
  SET 
    earliest_departure = (
      SELECT MIN(depart_dt) FROM public.itinerary_detail WHERE itinerary_id = v_itinerary_id
    ),
    latest_return = (
      SELECT MAX(depart_dt) FROM public.itinerary_detail WHERE itinerary_id = v_itinerary_id
    )
  WHERE id = v_itinerary_id;
  
  RAISE NOTICE '[CREATE ITINERARY] ✅ Successfully created itinerary % with % detail records', v_itinerary_id, v_seq - 1;
  
  RETURN v_itinerary_id;
END;
$$;
