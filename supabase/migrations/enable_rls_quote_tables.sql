-- Enable RLS on quote tables
-- This migration adds Row Level Security policies for tenant isolation
-- Users can only see and modify quotes that belong to their tenant

-- ============================================================================
-- QUOTE TABLE POLICIES
-- ============================================================================

-- Enable RLS on quote table
ALTER TABLE public.quote ENABLE ROW LEVEL SECURITY;

-- Policy: Users can SELECT quotes from their tenant only
CREATE POLICY "Users can view quotes from their tenant"
ON public.quote
FOR SELECT
USING (
  -- Allow if user's tenant is the father tenant (can see everything)
  public.is_user_father_tenant()
  OR
  -- Allow if quote belongs to user's tenant
  tenant_id = public.get_user_tenant_id()
);

-- Policy: Users can INSERT quotes into their own tenant
CREATE POLICY "Users can insert quotes into their tenant"
ON public.quote
FOR INSERT
WITH CHECK (
  -- Allow if user's tenant is the father tenant (can insert anywhere)
  public.is_user_father_tenant()
  OR
  -- Allow if inserting into user's tenant
  tenant_id = public.get_user_tenant_id()
);

-- Policy: Users can UPDATE quotes from their tenant
CREATE POLICY "Users can update quotes from their tenant"
ON public.quote
FOR UPDATE
USING (
  -- Allow if user's tenant is the father tenant (can update anything)
  public.is_user_father_tenant()
  OR
  -- Allow if quote belongs to user's tenant
  tenant_id = public.get_user_tenant_id()
)
WITH CHECK (
  -- Allow if user's tenant is the father tenant (can update anything)
  public.is_user_father_tenant()
  OR
  -- Allow if quote stays in user's tenant (cannot change tenant_id to another tenant)
  tenant_id = public.get_user_tenant_id()
);

-- Policy: Users can DELETE quotes from their tenant
CREATE POLICY "Users can delete quotes from their tenant"
ON public.quote
FOR DELETE
USING (
  -- Allow if user's tenant is the father tenant (can delete anything)
  public.is_user_father_tenant()
  OR
  -- Allow if quote belongs to user's tenant
  tenant_id = public.get_user_tenant_id()
);

-- ============================================================================
-- QUOTE_OPTION TABLE POLICIES
-- ============================================================================

-- Enable RLS on quote_option table
ALTER TABLE public.quote_option ENABLE ROW LEVEL SECURITY;

-- Policy: Users can SELECT quote_options if they can access the parent quote
CREATE POLICY "Users can view quote options for accessible quotes"
ON public.quote_option
FOR SELECT
USING (
  -- Check if user can access the parent quote
  EXISTS (
    SELECT 1
    FROM public.quote q
    WHERE q.id = quote_option.quote_id
    AND (
      -- Allow if user's tenant is the father tenant
      public.is_user_father_tenant()
      OR
      -- Allow if quote belongs to user's tenant
      q.tenant_id = public.get_user_tenant_id()
    )
  )
);

-- Policy: Users can INSERT quote_options if they can access the parent quote
CREATE POLICY "Users can insert quote options for accessible quotes"
ON public.quote_option
FOR INSERT
WITH CHECK (
  -- Check if user can access the parent quote
  EXISTS (
    SELECT 1
    FROM public.quote q
    WHERE q.id = quote_option.quote_id
    AND (
      -- Allow if user's tenant is the father tenant
      public.is_user_father_tenant()
      OR
      -- Allow if quote belongs to user's tenant
      q.tenant_id = public.get_user_tenant_id()
    )
  )
);

-- Policy: Users can UPDATE quote_options if they can access the parent quote
CREATE POLICY "Users can update quote options for accessible quotes"
ON public.quote_option
FOR UPDATE
USING (
  -- Check if user can access the parent quote
  EXISTS (
    SELECT 1
    FROM public.quote q
    WHERE q.id = quote_option.quote_id
    AND (
      -- Allow if user's tenant is the father tenant
      public.is_user_father_tenant()
      OR
      -- Allow if quote belongs to user's tenant
      q.tenant_id = public.get_user_tenant_id()
    )
  )
)
WITH CHECK (
  -- Check if user can access the parent quote
  EXISTS (
    SELECT 1
    FROM public.quote q
    WHERE q.id = quote_option.quote_id
    AND (
      -- Allow if user's tenant is the father tenant
      public.is_user_father_tenant()
      OR
      -- Allow if quote belongs to user's tenant
      q.tenant_id = public.get_user_tenant_id()
    )
  )
);

-- Policy: Users can DELETE quote_options if they can access the parent quote
CREATE POLICY "Users can delete quote options for accessible quotes"
ON public.quote_option
FOR DELETE
USING (
  -- Check if user can access the parent quote
  EXISTS (
    SELECT 1
    FROM public.quote q
    WHERE q.id = quote_option.quote_id
    AND (
      -- Allow if user's tenant is the father tenant
      public.is_user_father_tenant()
      OR
      -- Allow if quote belongs to user's tenant
      q.tenant_id = public.get_user_tenant_id()
    )
  )
);

-- ============================================================================
-- QUOTE_DETAIL TABLE POLICIES
-- ============================================================================

-- Enable RLS on quote_detail table
ALTER TABLE public.quote_detail ENABLE ROW LEVEL SECURITY;

-- Policy: Users can SELECT quote_details if they can access the parent quote
CREATE POLICY "Users can view quote details for accessible quotes"
ON public.quote_detail
FOR SELECT
USING (
  -- Check if user can access the parent quote
  EXISTS (
    SELECT 1
    FROM public.quote q
    WHERE q.id = quote_detail.quote_id
    AND (
      -- Allow if user's tenant is the father tenant
      public.is_user_father_tenant()
      OR
      -- Allow if quote belongs to user's tenant
      q.tenant_id = public.get_user_tenant_id()
    )
  )
);

-- Policy: Users can INSERT quote_details if they can access the parent quote
CREATE POLICY "Users can insert quote details for accessible quotes"
ON public.quote_detail
FOR INSERT
WITH CHECK (
  -- Check if user can access the parent quote
  EXISTS (
    SELECT 1
    FROM public.quote q
    WHERE q.id = quote_detail.quote_id
    AND (
      -- Allow if user's tenant is the father tenant
      public.is_user_father_tenant()
      OR
      -- Allow if quote belongs to user's tenant
      q.tenant_id = public.get_user_tenant_id()
    )
  )
);

-- Policy: Users can UPDATE quote_details if they can access the parent quote
CREATE POLICY "Users can update quote details for accessible quotes"
ON public.quote_detail
FOR UPDATE
USING (
  -- Check if user can access the parent quote
  EXISTS (
    SELECT 1
    FROM public.quote q
    WHERE q.id = quote_detail.quote_id
    AND (
      -- Allow if user's tenant is the father tenant
      public.is_user_father_tenant()
      OR
      -- Allow if quote belongs to user's tenant
      q.tenant_id = public.get_user_tenant_id()
    )
  )
)
WITH CHECK (
  -- Check if user can access the parent quote
  EXISTS (
    SELECT 1
    FROM public.quote q
    WHERE q.id = quote_detail.quote_id
    AND (
      -- Allow if user's tenant is the father tenant
      public.is_user_father_tenant()
      OR
      -- Allow if quote belongs to user's tenant
      q.tenant_id = public.get_user_tenant_id()
    )
  )
);

-- Policy: Users can DELETE quote_details if they can access the parent quote
CREATE POLICY "Users can delete quote details for accessible quotes"
ON public.quote_detail
FOR DELETE
USING (
  -- Check if user can access the parent quote
  EXISTS (
    SELECT 1
    FROM public.quote q
    WHERE q.id = quote_detail.quote_id
    AND (
      -- Allow if user's tenant is the father tenant
      public.is_user_father_tenant()
      OR
      -- Allow if quote belongs to user's tenant
      q.tenant_id = public.get_user_tenant_id()
    )
  )
);

-- ============================================================================
-- QUOTE_ITEM TABLE POLICIES
-- ============================================================================

-- Enable RLS on quote_item table
ALTER TABLE public.quote_item ENABLE ROW LEVEL SECURITY;

-- Policy: Users can SELECT quote_items if they can access the parent quote
CREATE POLICY "Users can view quote items for accessible quotes"
ON public.quote_item
FOR SELECT
USING (
  -- Check if user can access the parent quote
  EXISTS (
    SELECT 1
    FROM public.quote q
    WHERE q.id = quote_item.quote_id
    AND (
      -- Allow if user's tenant is the father tenant
      public.is_user_father_tenant()
      OR
      -- Allow if quote belongs to user's tenant
      q.tenant_id = public.get_user_tenant_id()
    )
  )
);

-- Policy: Users can INSERT quote_items if they can access the parent quote
CREATE POLICY "Users can insert quote items for accessible quotes"
ON public.quote_item
FOR INSERT
WITH CHECK (
  -- Check if user can access the parent quote
  EXISTS (
    SELECT 1
    FROM public.quote q
    WHERE q.id = quote_item.quote_id
    AND (
      -- Allow if user's tenant is the father tenant
      public.is_user_father_tenant()
      OR
      -- Allow if quote belongs to user's tenant
      q.tenant_id = public.get_user_tenant_id()
    )
  )
);

-- Policy: Users can UPDATE quote_items if they can access the parent quote
CREATE POLICY "Users can update quote items for accessible quotes"
ON public.quote_item
FOR UPDATE
USING (
  -- Check if user can access the parent quote
  EXISTS (
    SELECT 1
    FROM public.quote q
    WHERE q.id = quote_item.quote_id
    AND (
      -- Allow if user's tenant is the father tenant
      public.is_user_father_tenant()
      OR
      -- Allow if quote belongs to user's tenant
      q.tenant_id = public.get_user_tenant_id()
    )
  )
)
WITH CHECK (
  -- Check if user can access the parent quote
  EXISTS (
    SELECT 1
    FROM public.quote q
    WHERE q.id = quote_item.quote_id
    AND (
      -- Allow if user's tenant is the father tenant
      public.is_user_father_tenant()
      OR
      -- Allow if quote belongs to user's tenant
      q.tenant_id = public.get_user_tenant_id()
    )
  )
);

-- Policy: Users can DELETE quote_items if they can access the parent quote
CREATE POLICY "Users can delete quote items for accessible quotes"
ON public.quote_item
FOR DELETE
USING (
  -- Check if user can access the parent quote
  EXISTS (
    SELECT 1
    FROM public.quote q
    WHERE q.id = quote_item.quote_id
    AND (
      -- Allow if user's tenant is the father tenant
      public.is_user_father_tenant()
      OR
      -- Allow if quote belongs to user's tenant
      q.tenant_id = public.get_user_tenant_id()
    )
  )
);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY "Users can view quotes from their tenant" ON public.quote IS 
'Allows users to view quotes that belong to their tenant. Father tenant users can see all quotes.';

COMMENT ON POLICY "Users can insert quotes into their tenant" ON public.quote IS 
'Allows users to create quotes in their own tenant. Father tenant users can create quotes in any tenant.';

COMMENT ON POLICY "Users can update quotes from their tenant" ON public.quote IS 
'Allows users to update quotes from their tenant. Father tenant users can update any quote.';

COMMENT ON POLICY "Users can delete quotes from their tenant" ON public.quote IS 
'Allows users to delete quotes from their own tenant. Father tenant users can delete any quote.';

COMMENT ON POLICY "Users can view quote options for accessible quotes" ON public.quote_option IS 
'Allows users to view quote_options for quotes they have access to (their tenant).';

COMMENT ON POLICY "Users can insert quote options for accessible quotes" ON public.quote_option IS 
'Allows users to insert quote_options for quotes they have access to.';

COMMENT ON POLICY "Users can update quote options for accessible quotes" ON public.quote_option IS 
'Allows users to update quote_options for quotes they have access to.';

COMMENT ON POLICY "Users can delete quote options for accessible quotes" ON public.quote_option IS 
'Allows users to delete quote_options for quotes they have access to.';

COMMENT ON POLICY "Users can view quote details for accessible quotes" ON public.quote_detail IS 
'Allows users to view quote_details (legs) for quotes they have access to (their tenant).';

COMMENT ON POLICY "Users can insert quote details for accessible quotes" ON public.quote_detail IS 
'Allows users to insert quote_details for quotes they have access to.';

COMMENT ON POLICY "Users can update quote details for accessible quotes" ON public.quote_detail IS 
'Allows users to update quote_details for quotes they have access to.';

COMMENT ON POLICY "Users can delete quote details for accessible quotes" ON public.quote_detail IS 
'Allows users to delete quote_details for quotes they have access to.';

COMMENT ON POLICY "Users can view quote items for accessible quotes" ON public.quote_item IS 
'Allows users to view quote_items (services) for quotes they have access to (their tenant).';

COMMENT ON POLICY "Users can insert quote items for accessible quotes" ON public.quote_item IS 
'Allows users to insert quote_items for quotes they have access to.';

COMMENT ON POLICY "Users can update quote items for accessible quotes" ON public.quote_item IS 
'Allows users to update quote_items for quotes they have access to.';

COMMENT ON POLICY "Users can delete quote items for accessible quotes" ON public.quote_item IS 
'Allows users to delete quote_items for quotes they have access to.';
