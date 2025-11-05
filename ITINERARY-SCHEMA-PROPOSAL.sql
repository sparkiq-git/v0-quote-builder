-- ============================================
-- ITINERARY SYSTEM - Database Schema Proposal
-- ============================================
-- This schema implements the itinerary workflow:
-- 1. When quote status → "accepted", create draft itinerary
-- 2. When invoice status → "paid", allow itinerary status → "trip_confirmed"
-- ============================================

-- ============================================
-- ITINERARY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.itinerary (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  
  -- Relationships
  quote_id UUID NOT NULL,
  invoice_id UUID NULL, -- Set when invoice is created/paid
  contact_id UUID NOT NULL, -- From quote
  lead_id UUID NULL, -- Link back to original lead
  tenant_id UUID NOT NULL,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'draft',
  -- Status values: 'draft', 'trip_confirmed', 'in_progress', 'completed', 'cancelled'
  
  -- Trip Information (copied from quote)
  title TEXT NULL, -- Quote/itinerary title
  trip_summary TEXT NULL, -- Overall trip description
  trip_type TEXT NULL, -- Trip type: 'one-way', 'round-trip', 'multi-city'
  leg_count INTEGER NOT NULL DEFAULT 0, -- Number of flight legs
  total_pax INTEGER NOT NULL DEFAULT 0, -- Total passengers
  domestic_trip BOOLEAN NULL, -- Domestic vs international trip flag
  asap BOOLEAN NULL DEFAULT false, -- ASAP/urgent trip flag (from lead)
  
  -- Aircraft Information
  aircraft_id UUID NULL, -- From quote_option.aircraft_id (references aircraft.id)
  aircraft_tail_id UUID NULL, -- From quote_option.aircraft_tail_id (references aircraft.id, same as aircraft_id if specific tail selected)
  aircraft_tail_no TEXT NULL, -- Tail number from aircraft.tail_number
  aircraft_pref TEXT NULL, -- Aircraft preference notes from quote
  
  -- Trip Dates
  earliest_departure DATE NULL, -- Earliest departure date (from quote or itinerary_detail)
  latest_return DATE NULL, -- Latest return date (from quote or itinerary_detail)
  
  -- Metadata
  notes TEXT NULL, -- General notes (from quote.notes)
  special_requirements TEXT NULL, -- Special requirements/requests (from quote.special_notes or lead.special_notes)
  currency TEXT NULL, -- Currency context (from quote, default 'USD')
  source TEXT NULL, -- Lead source (from lead.source)
  source_ref TEXT NULL, -- Lead source reference (from lead.source_ref)
  
  -- Audit fields
  created_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT itinerary_pkey PRIMARY KEY (id),
  CONSTRAINT itinerary_quote_id_fkey FOREIGN KEY (quote_id) 
    REFERENCES public.quote(id) ON DELETE CASCADE,
  CONSTRAINT itinerary_invoice_id_fkey FOREIGN KEY (invoice_id) 
    REFERENCES public.invoice(id) ON DELETE SET NULL,
  CONSTRAINT itinerary_contact_id_fkey FOREIGN KEY (contact_id) 
    REFERENCES public.contact(id) ON DELETE RESTRICT,
  CONSTRAINT itinerary_lead_id_fkey FOREIGN KEY (lead_id) 
    REFERENCES public.lead(id) ON DELETE SET NULL,
  CONSTRAINT itinerary_tenant_id_fkey FOREIGN KEY (tenant_id) 
    REFERENCES public.tenant(id) ON DELETE CASCADE,
  CONSTRAINT itinerary_aircraft_id_fkey FOREIGN KEY (aircraft_id) 
    REFERENCES public.aircraft(id) ON DELETE SET NULL,
  CONSTRAINT itinerary_aircraft_tail_id_fkey FOREIGN KEY (aircraft_tail_id) 
    REFERENCES public.aircraft(id) ON DELETE SET NULL,
  CONSTRAINT itinerary_status_check CHECK (
    status IN ('draft', 'trip_confirmed', 'in_progress', 'completed', 'cancelled')
  ),
  CONSTRAINT itinerary_trip_type_check CHECK (
    trip_type IS NULL OR trip_type IN ('one-way', 'round-trip', 'multi-city')
  ),
  CONSTRAINT itinerary_leg_count_check CHECK (leg_count >= 0),
  CONSTRAINT itinerary_total_pax_check CHECK (total_pax >= 0)
) TABLESPACE pg_default;

-- Indexes for itinerary table
CREATE INDEX IF NOT EXISTS itinerary_quote_id_idx 
  ON public.itinerary USING btree (quote_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS itinerary_invoice_id_idx 
  ON public.itinerary USING btree (invoice_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS itinerary_contact_id_idx 
  ON public.itinerary USING btree (contact_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS itinerary_tenant_id_idx 
  ON public.itinerary USING btree (tenant_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS itinerary_status_idx 
  ON public.itinerary USING btree (status) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS itinerary_earliest_departure_idx 
  ON public.itinerary USING btree (earliest_departure) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS itinerary_latest_return_idx 
  ON public.itinerary USING btree (latest_return) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS itinerary_lead_id_idx 
  ON public.itinerary USING btree (lead_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS itinerary_trip_type_idx 
  ON public.itinerary USING btree (trip_type) TABLESPACE pg_default;

-- Unique constraint: One itinerary per quote
CREATE UNIQUE INDEX IF NOT EXISTS itinerary_quote_id_unique 
  ON public.itinerary (quote_id) 
  WHERE quote_id IS NOT NULL;

-- ============================================
-- ITINERARY_DETAIL TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.itinerary_detail (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  itinerary_id UUID NOT NULL,
  seq INTEGER NOT NULL, -- Sequence number for leg ordering
  
  -- Origin information
  origin TEXT NULL,
  origin_code TEXT NULL, -- Airport code (ICAO/IATA)
  origin_lat DOUBLE PRECISION NULL,
  origin_long DOUBLE PRECISION NULL,
  
  -- Destination information
  destination TEXT NULL,
  destination_code TEXT NULL, -- Airport code (ICAO/IATA)
  destination_lat DOUBLE PRECISION NULL,
  destination_long DOUBLE PRECISION NULL,
  
  -- Flight timing
  depart_dt DATE NULL, -- Departure date
  depart_time TIME WITHOUT TIME ZONE NULL, -- Departure time
  arrive_dt DATE NULL, -- Arrival date (may differ from departure)
  arrive_time TIME WITHOUT TIME ZONE NULL, -- Arrival time
  
  -- Passenger count for this leg
  pax_count INTEGER NULL,
  
  -- Additional information
  notes TEXT NULL, -- Leg-specific notes
  distance_nm NUMERIC NULL, -- Distance in nautical miles
  
  -- Audit fields
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT itinerary_detail_pkey PRIMARY KEY (id),
  CONSTRAINT itinerary_detail_itinerary_seq_unique UNIQUE (itinerary_id, seq),
  CONSTRAINT itinerary_detail_itinerary_id_fkey FOREIGN KEY (itinerary_id) 
    REFERENCES public.itinerary(id) ON DELETE CASCADE,
  CONSTRAINT itinerary_detail_origin_dest_chk CHECK (
    (
      (origin IS NOT NULL) OR (origin_code IS NOT NULL)
    ) AND (
      (destination IS NOT NULL) OR (destination_code IS NOT NULL)
    )
  ),
  CONSTRAINT itinerary_detail_pax_count_check CHECK (
    (pax_count IS NULL) OR (pax_count >= 0)
  ),
  CONSTRAINT itinerary_detail_seq_check CHECK (seq >= 1)
) TABLESPACE pg_default;

-- Indexes for itinerary_detail table
CREATE INDEX IF NOT EXISTS itinerary_detail_itinerary_id_idx 
  ON public.itinerary_detail USING btree (itinerary_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS itinerary_detail_itinerary_seq_idx 
  ON public.itinerary_detail USING btree (itinerary_id, seq) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS itinerary_detail_depart_dt_idx 
  ON public.itinerary_detail USING btree (depart_dt) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS itinerary_detail_origin_idx 
  ON public.itinerary_detail USING btree (origin_code) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS itinerary_detail_destination_idx 
  ON public.itinerary_detail USING btree (destination_code) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_itinerary_detail_coords 
  ON public.itinerary_detail USING btree (
    origin_lat,
    origin_long,
    destination_lat,
    destination_long
  ) TABLESPACE pg_default;

-- ============================================
-- TRIGGER: Update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to itinerary
CREATE TRIGGER trg_itinerary_updated_at
  BEFORE UPDATE ON public.itinerary
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Apply updated_at trigger to itinerary_detail
CREATE TRIGGER trg_itinerary_detail_updated_at
  BEFORE UPDATE ON public.itinerary_detail
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- RPC FUNCTION: Create Itinerary from Quote
-- ============================================
CREATE OR REPLACE FUNCTION public.create_itinerary_from_quote(p_quote_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_itinerary_id UUID;
  v_quote RECORD;
  v_quote_option RECORD;
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
    qo.aircraft_tail_id,
    ac.tail_number as aircraft_tail_no,
    -- Lead-specific fields
    l.asap,
    l.source,
    l.source_ref,
    l.special_notes as lead_special_notes
  INTO v_quote
  FROM public.quote q
  LEFT JOIN public.quote_option qo ON q.selected_option_id = qo.id
  LEFT JOIN public.aircraft ac ON qo.aircraft_tail_id = ac.id
  LEFT JOIN public.lead l ON q.lead_id = l.id
  WHERE q.id = p_quote_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quote not found: %', p_quote_id;
  END IF;
  
  -- Check if itinerary already exists
  IF EXISTS (SELECT 1 FROM public.itinerary WHERE quote_id = p_quote_id) THEN
    RAISE EXCEPTION 'Itinerary already exists for quote: %', p_quote_id;
  END IF;
  
  -- Get contact_id (use from quote or find/create from contact_name/email)
  v_contact_id := v_quote.contact_id;
  v_tenant_id := v_quote.tenant_id;
  
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
    aircraft_tail_id,
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
    v_quote.aircraft_tail_id,
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
  
  RETURN v_itinerary_id;
END;
$$;

-- ============================================
-- TRIGGER: Auto-create Itinerary when Quote Status → "accepted"
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_quote_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only create itinerary when status changes TO "accepted"
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    -- Check if itinerary already exists (prevent duplicates)
    IF NOT EXISTS (SELECT 1 FROM public.itinerary WHERE quote_id = NEW.id) THEN
      BEGIN
        PERFORM public.create_itinerary_from_quote(NEW.id);
        RAISE NOTICE 'Created draft itinerary for quote: %', NEW.id;
      EXCEPTION WHEN OTHERS THEN
        -- Log error but don't fail the quote update
        RAISE WARNING 'Failed to create itinerary for quote %: %', NEW.id, SQLERRM;
      END;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on quote table
CREATE TRIGGER trg_quote_status_create_itinerary
  AFTER UPDATE OF status ON public.quote
  FOR EACH ROW
  WHEN (NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted'))
  EXECUTE FUNCTION public.handle_quote_status_change();

-- ============================================
-- TRIGGER: Link Invoice to Itinerary when Invoice is Paid
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_invoice_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- When invoice status changes to "paid", link it to itinerary if exists
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    -- Update itinerary to link invoice_id
    UPDATE public.itinerary
    SET invoice_id = NEW.id
    WHERE quote_id = NEW.quote_id
      AND invoice_id IS NULL;
    
    RAISE NOTICE 'Linked paid invoice % to itinerary for quote: %', NEW.id, NEW.quote_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on invoice table
CREATE TRIGGER trg_invoice_paid_link_itinerary
  AFTER UPDATE OF status ON public.invoice
  FOR EACH ROW
  WHEN (NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid'))
  EXECUTE FUNCTION public.handle_invoice_paid();

-- ============================================
-- ITINERARY_IMAGE TABLE
-- ============================================
-- Allows users to upload/override images specific to an itinerary
-- Images are stored in Supabase Storage bucket: "aircraft-media"
-- Storage path: tenant/{tenant_id}/itinerary/{itinerary_id}/{filename}
-- ============================================
CREATE TABLE IF NOT EXISTS public.itinerary_image (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  
  -- Relationships
  itinerary_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  
  -- Storage information
  storage_path TEXT NOT NULL, -- Full path in storage bucket
  public_url TEXT NULL, -- Public URL for the image
  
  -- Image metadata
  caption TEXT NULL, -- Optional caption/description
  is_primary BOOLEAN NOT NULL DEFAULT false, -- Primary/featured image
  display_order INTEGER NOT NULL DEFAULT 0, -- Order for display (lower = first)
  
  -- Audit fields
  uploaded_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT itinerary_image_pkey PRIMARY KEY (id),
  CONSTRAINT itinerary_image_itinerary_id_fkey FOREIGN KEY (itinerary_id) 
    REFERENCES public.itinerary(id) ON DELETE CASCADE,
  CONSTRAINT itinerary_image_tenant_id_fkey FOREIGN KEY (tenant_id) 
    REFERENCES public.tenant(id) ON DELETE CASCADE,
  CONSTRAINT itinerary_image_display_order_check CHECK (display_order >= 0),
  CONSTRAINT itinerary_image_storage_path_unique UNIQUE (storage_path)
) TABLESPACE pg_default;

-- Indexes for itinerary_image table
CREATE INDEX IF NOT EXISTS itinerary_image_itinerary_id_idx 
  ON public.itinerary_image USING btree (itinerary_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS itinerary_image_tenant_id_idx 
  ON public.itinerary_image USING btree (tenant_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS itinerary_image_display_order_idx 
  ON public.itinerary_image USING btree (itinerary_id, display_order) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS itinerary_image_is_primary_idx 
  ON public.itinerary_image USING btree (itinerary_id, is_primary) 
  WHERE is_primary = true;

-- Trigger: Update updated_at timestamp
CREATE TRIGGER trg_itinerary_image_updated_at
  BEFORE UPDATE ON public.itinerary_image
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
-- RLS policies removed - to be implemented later
-- For now, rely on application-level security and tenant filtering

-- ============================================
-- HELPER FUNCTION: Check if Invoice is Paid (for status validation)
-- ============================================
CREATE OR REPLACE FUNCTION public.can_confirm_itinerary_trip(p_itinerary_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invoice_paid BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.itinerary i
    JOIN public.invoice inv ON i.quote_id = inv.quote_id
    WHERE i.id = p_itinerary_id
      AND inv.status = 'paid'
  ) INTO v_invoice_paid;
  
  RETURN v_invoice_paid;
END;
$$;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================
COMMENT ON TABLE public.itinerary IS 'Itineraries created from accepted quotes. Status changes to trip_confirmed when invoice is paid.';
COMMENT ON TABLE public.itinerary_detail IS 'Individual flight legs/segments for an itinerary.';
COMMENT ON TABLE public.itinerary_image IS 'Images specific to an itinerary. Users can override/upload images that override the quote/aircraft images.';
COMMENT ON FUNCTION public.create_itinerary_from_quote IS 'Creates a draft itinerary from an accepted quote, copying quote_detail to itinerary_detail.';
COMMENT ON FUNCTION public.handle_quote_status_change IS 'Trigger function that automatically creates a draft itinerary when quote status changes to accepted.';
COMMENT ON FUNCTION public.handle_invoice_paid IS 'Trigger function that links invoice to itinerary when invoice status changes to paid.';
COMMENT ON FUNCTION public.can_confirm_itinerary_trip IS 'Helper function to check if an itinerary can be confirmed (invoice must be paid).';

