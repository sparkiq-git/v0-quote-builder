-- ============================================
-- ITINERARY PASSENGERS & CREW JUNCTION TABLES
-- ============================================
-- These tables link passengers and crew members to itineraries
-- 
-- PREREQUISITES:
-- 1. Run ITINERARY-SCHEMA-PROPOSAL.sql first to create the itinerary table
-- 2. Ensure contact_passenger and tenant tables exist
-- Note: Crew members are stored directly in itinerary_crew, no crew table reference needed
-- 
-- IMPORTANT: This script must be run AFTER ITINERARY-SCHEMA-PROPOSAL.sql
-- The itinerary table must exist before creating these junction tables
-- ============================================

-- Check if itinerary table exists (informational only - will fail if it doesn't)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'itinerary') THEN
    RAISE EXCEPTION 'The itinerary table does not exist. Please run ITINERARY-SCHEMA-PROPOSAL.sql first.';
  END IF;
END $$;

-- ============================================
-- ITINERARY_PASSENGER TABLE
-- ============================================
-- Links passengers (contact_passenger) to itineraries
-- Multi-tenant: includes tenant_id for tenant isolation

-- Drop table if it exists (to ensure clean creation)
DROP TABLE IF EXISTS public.itinerary_passenger CASCADE;

CREATE TABLE public.itinerary_passenger (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  
  -- Relationships
  itinerary_id UUID NOT NULL,
  passenger_id UUID NOT NULL, -- References contact_passenger.id
  tenant_id UUID NOT NULL,
  
  -- Passenger assignment metadata
  seat_preference TEXT NULL, -- Optional seat preference
  special_notes TEXT NULL, -- Special notes for this passenger on this itinerary
  checked_in BOOLEAN NOT NULL DEFAULT false, -- Check-in status
  checked_in_at TIMESTAMP WITHOUT TIME ZONE NULL, -- Check-in timestamp
  
  -- Audit fields
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT itinerary_passenger_pkey PRIMARY KEY (id),
  CONSTRAINT itinerary_passenger_itinerary_id_fkey FOREIGN KEY (itinerary_id) 
    REFERENCES public.itinerary(id) ON DELETE CASCADE,
  CONSTRAINT itinerary_passenger_passenger_id_fkey FOREIGN KEY (passenger_id) 
    REFERENCES public.contact_passenger(id) ON DELETE CASCADE,
  CONSTRAINT itinerary_passenger_tenant_id_fkey FOREIGN KEY (tenant_id) 
    REFERENCES public.tenant(id) ON DELETE CASCADE,
  CONSTRAINT itinerary_passenger_unique UNIQUE (itinerary_id, passenger_id)
) TABLESPACE pg_default;

-- Indexes
CREATE INDEX IF NOT EXISTS itinerary_passenger_itinerary_id_idx 
  ON public.itinerary_passenger USING btree (itinerary_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS itinerary_passenger_passenger_id_idx 
  ON public.itinerary_passenger USING btree (passenger_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS itinerary_passenger_tenant_id_idx 
  ON public.itinerary_passenger USING btree (tenant_id) TABLESPACE pg_default;

-- Trigger: Update updated_at timestamp
DROP TRIGGER IF EXISTS trg_itinerary_passenger_updated_at ON public.itinerary_passenger;
CREATE TRIGGER trg_itinerary_passenger_updated_at
  BEFORE UPDATE ON public.itinerary_passenger
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- ITINERARY_CREW TABLE
-- ============================================
-- Stores crew members assigned to itineraries
-- Crew members are added freely without linking to a crew table
-- Multi-tenant: includes tenant_id for tenant isolation

-- Drop table if it exists (to ensure clean creation)
DROP TABLE IF EXISTS public.itinerary_crew CASCADE;

CREATE TABLE public.itinerary_crew (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  
  -- Relationships
  itinerary_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  
  -- Crew member information (stored directly, not referenced)
  name TEXT NOT NULL, -- Crew member name
  role TEXT NOT NULL, -- 'PIC', 'SIC', 'Cabin Attendance', or custom role
  -- Note: PIC = Pilot in Command, SIC = Second in Command
  
  -- Optional contact information
  email TEXT NULL, -- Crew member email
  phone TEXT NULL, -- Crew member phone number
  
  -- Assignment metadata
  notes TEXT NULL, -- Notes about this crew member's assignment
  confirmed BOOLEAN NOT NULL DEFAULT false, -- Confirmation status
  confirmed_at TIMESTAMP WITHOUT TIME ZONE NULL, -- Confirmation timestamp
  
  -- Audit fields
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT itinerary_crew_pkey PRIMARY KEY (id),
  CONSTRAINT itinerary_crew_itinerary_id_fkey FOREIGN KEY (itinerary_id) 
    REFERENCES public.itinerary(id) ON DELETE CASCADE,
  CONSTRAINT itinerary_crew_tenant_id_fkey FOREIGN KEY (tenant_id) 
    REFERENCES public.tenant(id) ON DELETE CASCADE,
  CONSTRAINT itinerary_crew_role_check CHECK (
    role IN ('PIC', 'SIC', 'Cabin Attendance') OR role IS NOT NULL
  )
) TABLESPACE pg_default;

-- Indexes
CREATE INDEX IF NOT EXISTS itinerary_crew_itinerary_id_idx 
  ON public.itinerary_crew USING btree (itinerary_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS itinerary_crew_name_idx 
  ON public.itinerary_crew USING btree (name) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS itinerary_crew_tenant_id_idx 
  ON public.itinerary_crew USING btree (tenant_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS itinerary_crew_role_idx 
  ON public.itinerary_crew USING btree (role) TABLESPACE pg_default;

-- Trigger: Update updated_at timestamp
DROP TRIGGER IF EXISTS trg_itinerary_crew_updated_at ON public.itinerary_crew;
CREATE TRIGGER trg_itinerary_crew_updated_at
  BEFORE UPDATE ON public.itinerary_crew
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE public.itinerary_passenger IS 'Links passengers (contact_passenger) to itineraries. Allows multiple passengers per itinerary up to total_pax.';
COMMENT ON TABLE public.itinerary_crew IS 'Stores crew members assigned to itineraries. Crew members are added freely without linking to a crew table. Supports PIC, SIC, and Cabin Attendance roles.';

