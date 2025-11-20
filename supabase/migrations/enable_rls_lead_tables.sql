-- Enable RLS on lead tables
-- This migration adds Row Level Security policies for tenant isolation
-- Users can only see leads where visibility = 'public' OR tenant_id = their_tenant_id

-- ============================================================================
-- LEAD TABLE POLICIES
-- ============================================================================

-- Enable RLS on lead table
ALTER TABLE public.lead ENABLE ROW LEVEL SECURITY;

-- Policy: Users can SELECT leads that are public OR belong to their tenant
CREATE POLICY "Users can view public leads or leads from their tenant"
ON public.lead
FOR SELECT
USING (
  -- Allow if lead is public
  visibility = 'public'::public.lead_visibility_enum
  OR
  -- Allow if user's tenant is the father tenant (can see everything)
  public.is_user_father_tenant()
  OR
  -- Allow if lead belongs to user's tenant
  tenant_id = public.get_user_tenant_id()
);

-- Policy: Users can INSERT leads into their own tenant
CREATE POLICY "Users can insert leads into their tenant"
ON public.lead
FOR INSERT
WITH CHECK (
  -- Allow if user's tenant is the father tenant (can insert anywhere)
  public.is_user_father_tenant()
  OR
  -- Allow if inserting into user's tenant (tenant_id must match or be null for public leads)
  (
    tenant_id IS NULL 
    OR 
    tenant_id = public.get_user_tenant_id()
  )
);

-- Policy: Users can UPDATE leads from their tenant or public leads
CREATE POLICY "Users can update leads from their tenant or public leads"
ON public.lead
FOR UPDATE
USING (
  -- Allow if user's tenant is the father tenant (can update anything)
  public.is_user_father_tenant()
  OR
  -- Allow if lead is public
  visibility = 'public'::public.lead_visibility_enum
  OR
  -- Allow if lead belongs to user's tenant
  tenant_id = public.get_user_tenant_id()
)
WITH CHECK (
  -- Allow if user's tenant is the father tenant (can update anything)
  public.is_user_father_tenant()
  OR
  -- Allow if updating to public visibility (anyone can make a lead public)
  visibility = 'public'::public.lead_visibility_enum
  OR
  -- Allow if lead stays in user's tenant (can only update leads in their own tenant)
  tenant_id = public.get_user_tenant_id()
);

-- Policy: Users can DELETE leads from their tenant (not public leads from other tenants)
CREATE POLICY "Users can delete leads from their tenant"
ON public.lead
FOR DELETE
USING (
  -- Allow if user's tenant is the father tenant (can delete anything)
  public.is_user_father_tenant()
  OR
  -- Allow if lead belongs to user's tenant (only their own leads, not public ones from others)
  tenant_id = public.get_user_tenant_id()
);

-- ============================================================================
-- LEAD_DETAIL TABLE POLICIES
-- ============================================================================

-- Enable RLS on lead_detail table
ALTER TABLE public.lead_detail ENABLE ROW LEVEL SECURITY;

-- Policy: Users can SELECT lead_details if they can see the parent lead
CREATE POLICY "Users can view lead details for accessible leads"
ON public.lead_detail
FOR SELECT
USING (
  -- Check if user can access the parent lead
  EXISTS (
    SELECT 1
    FROM public.lead l
    WHERE l.id = lead_detail.lead_id
    AND (
      -- Allow if lead is public
      l.visibility = 'public'::public.lead_visibility_enum
      OR
      -- Allow if user's tenant is the father tenant
      public.is_user_father_tenant()
      OR
      -- Allow if lead belongs to user's tenant
      l.tenant_id = public.get_user_tenant_id()
    )
  )
);

-- Policy: Users can INSERT lead_details if they can access the parent lead
CREATE POLICY "Users can insert lead details for accessible leads"
ON public.lead_detail
FOR INSERT
WITH CHECK (
  -- Check if user can access the parent lead
  EXISTS (
    SELECT 1
    FROM public.lead l
    WHERE l.id = lead_detail.lead_id
    AND (
      -- Allow if user's tenant is the father tenant
      public.is_user_father_tenant()
      OR
      -- Allow if lead is public
      l.visibility = 'public'::public.lead_visibility_enum
      OR
      -- Allow if lead belongs to user's tenant
      l.tenant_id = public.get_user_tenant_id()
    )
  )
);

-- Policy: Users can UPDATE lead_details if they can access the parent lead
CREATE POLICY "Users can update lead details for accessible leads"
ON public.lead_detail
FOR UPDATE
USING (
  -- Check if user can access the parent lead
  EXISTS (
    SELECT 1
    FROM public.lead l
    WHERE l.id = lead_detail.lead_id
    AND (
      -- Allow if user's tenant is the father tenant
      public.is_user_father_tenant()
      OR
      -- Allow if lead is public
      l.visibility = 'public'::public.lead_visibility_enum
      OR
      -- Allow if lead belongs to user's tenant
      l.tenant_id = public.get_user_tenant_id()
    )
  )
)
WITH CHECK (
  -- Check if user can access the parent lead
  EXISTS (
    SELECT 1
    FROM public.lead l
    WHERE l.id = lead_detail.lead_id
    AND (
      -- Allow if user's tenant is the father tenant
      public.is_user_father_tenant()
      OR
      -- Allow if lead is public
      l.visibility = 'public'::public.lead_visibility_enum
      OR
      -- Allow if lead belongs to user's tenant
      l.tenant_id = public.get_user_tenant_id()
    )
  )
);

-- Policy: Users can DELETE lead_details if they can access the parent lead
CREATE POLICY "Users can delete lead details for accessible leads"
ON public.lead_detail
FOR DELETE
USING (
  -- Check if user can access the parent lead
  EXISTS (
    SELECT 1
    FROM public.lead l
    WHERE l.id = lead_detail.lead_id
    AND (
      -- Allow if user's tenant is the father tenant
      public.is_user_father_tenant()
      OR
      -- Allow if lead is public
      l.visibility = 'public'::public.lead_visibility_enum
      OR
      -- Allow if lead belongs to user's tenant
      l.tenant_id = public.get_user_tenant_id()
    )
  )
);

-- ============================================================================
-- LEAD_TENANT_ENGAGEMENT TABLE POLICIES
-- ============================================================================

-- Enable RLS on lead_tenant_engagement table
ALTER TABLE public.lead_tenant_engagement ENABLE ROW LEVEL SECURITY;

-- Policy: Users can SELECT engagement records for their tenant only
CREATE POLICY "Users can view engagement records for their tenant"
ON public.lead_tenant_engagement
FOR SELECT
USING (
  -- Allow if user's tenant is the father tenant (can see everything)
  public.is_user_father_tenant()
  OR
  -- Allow if engagement belongs to user's tenant
  tenant_id = public.get_user_tenant_id()
);

-- Policy: Users can INSERT engagement records for their tenant
CREATE POLICY "Users can insert engagement records for their tenant"
ON public.lead_tenant_engagement
FOR INSERT
WITH CHECK (
  -- Allow if user's tenant is the father tenant (can insert anywhere)
  public.is_user_father_tenant()
  OR
  -- Allow if inserting for user's tenant
  tenant_id = public.get_user_tenant_id()
);

-- Policy: Users can UPDATE engagement records for their tenant
CREATE POLICY "Users can update engagement records for their tenant"
ON public.lead_tenant_engagement
FOR UPDATE
USING (
  -- Allow if user's tenant is the father tenant (can update anything)
  public.is_user_father_tenant()
  OR
  -- Allow if engagement belongs to user's tenant
  tenant_id = public.get_user_tenant_id()
)
WITH CHECK (
  -- Allow if user's tenant is the father tenant (can update anything)
  public.is_user_father_tenant()
  OR
  -- Allow if engagement stays in user's tenant (cannot change tenant_id to another tenant)
  tenant_id = public.get_user_tenant_id()
);

-- Policy: Users can DELETE engagement records for their tenant
CREATE POLICY "Users can delete engagement records for their tenant"
ON public.lead_tenant_engagement
FOR DELETE
USING (
  -- Allow if user's tenant is the father tenant (can delete anything)
  public.is_user_father_tenant()
  OR
  -- Allow if engagement belongs to user's tenant
  tenant_id = public.get_user_tenant_id()
);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY "Users can view public leads or leads from their tenant" ON public.lead IS 
'Allows users to view leads that are public OR belong to their tenant. Father tenant users can see all leads.';

COMMENT ON POLICY "Users can insert leads into their tenant" ON public.lead IS 
'Allows users to create leads in their own tenant or as public leads. Father tenant users can create leads in any tenant.';

COMMENT ON POLICY "Users can update leads from their tenant or public leads" ON public.lead IS 
'Allows users to update leads from their tenant or public leads. Father tenant users can update any lead.';

COMMENT ON POLICY "Users can delete leads from their tenant" ON public.lead IS 
'Allows users to delete leads from their own tenant. Father tenant users can delete any lead.';

COMMENT ON POLICY "Users can view lead details for accessible leads" ON public.lead_detail IS 
'Allows users to view lead_details for leads they have access to (public or their tenant).';

COMMENT ON POLICY "Users can insert lead details for accessible leads" ON public.lead_detail IS 
'Allows users to insert lead_details for leads they have access to.';

COMMENT ON POLICY "Users can update lead details for accessible leads" ON public.lead_detail IS 
'Allows users to update lead_details for leads they have access to.';

COMMENT ON POLICY "Users can delete lead details for accessible leads" ON public.lead_detail IS 
'Allows users to delete lead_details for leads they have access to.';

COMMENT ON POLICY "Users can view engagement records for their tenant" ON public.lead_tenant_engagement IS 
'Allows users to view engagement records for their tenant only. Father tenant users can see all.';

COMMENT ON POLICY "Users can insert engagement records for their tenant" ON public.lead_tenant_engagement IS 
'Allows users to create engagement records for their tenant. Father tenant users can create for any tenant.';

COMMENT ON POLICY "Users can update engagement records for their tenant" ON public.lead_tenant_engagement IS 
'Allows users to update engagement records for their tenant. Father tenant users can update any.';

COMMENT ON POLICY "Users can delete engagement records for their tenant" ON public.lead_tenant_engagement IS 
'Allows users to delete engagement records for their tenant. Father tenant users can delete any.';

