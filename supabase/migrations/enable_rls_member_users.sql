-- Enable RLS on member table
ALTER TABLE public.member ENABLE ROW LEVEL SECURITY;

-- Create SECURITY DEFINER functions to avoid circular dependency in RLS policies
-- These functions bypass RLS when checking tenant membership

CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id 
  FROM public.member 
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_user_father_tenant()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.member m
    JOIN public.tenant t ON m.tenant_id = t.id
    WHERE m.user_id = auth.uid()
    AND t.is_father = true
  );
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_father_tenant() TO authenticated;

-- Policy: Users can view members of their own tenant, or all members if father tenant
-- Uses SECURITY DEFINER functions to avoid circular dependency
CREATE POLICY "Users can view members of their own tenant"
ON public.member
FOR SELECT
USING (
  -- Always allow users to see their own member record
  user_id = auth.uid()
  OR
  -- Allow if user's tenant is the father tenant (can see everything)
  public.is_user_father_tenant()
  OR
  -- Or allow if member belongs to user's tenant
  tenant_id = public.get_user_tenant_id()
);

-- Create function to check if user is admin/manager in their tenant
CREATE OR REPLACE FUNCTION public.is_user_admin_or_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.member 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'manager')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_user_admin_or_manager() TO authenticated;

-- Policy: Admins can insert members in their tenant, or father tenant can insert anywhere
CREATE POLICY "Admins can insert members in their tenant"
ON public.member
FOR INSERT
WITH CHECK (
  -- Allow if user's tenant is the father tenant (can insert anywhere)
  public.is_user_father_tenant()
  OR
  -- Or allow if inserting into user's tenant and user is admin/manager
  (tenant_id = public.get_user_tenant_id() AND public.is_user_admin_or_manager())
);

-- Policy: Admins can update members in their tenant, or father tenant can update anywhere
CREATE POLICY "Admins can update members in their tenant"
ON public.member
FOR UPDATE
USING (
  -- Allow if user's tenant is the father tenant (can update anywhere)
  public.is_user_father_tenant()
  OR
  -- Or allow if updating member in user's tenant and user is admin/manager
  (tenant_id = public.get_user_tenant_id() AND public.is_user_admin_or_manager())
)
WITH CHECK (
  -- Allow if user's tenant is the father tenant (can update anywhere)
  public.is_user_father_tenant()
  OR
  -- Or allow if updating member in user's tenant and user is admin/manager
  (tenant_id = public.get_user_tenant_id() AND public.is_user_admin_or_manager())
);

-- Policy: Admins can delete members in their tenant, or father tenant can delete anywhere
CREATE POLICY "Admins can delete members in their tenant"
ON public.member
FOR DELETE
USING (
  -- Allow if user's tenant is the father tenant (can delete anywhere)
  public.is_user_father_tenant()
  OR
  -- Or allow if deleting member in user's tenant and user is admin/manager
  (tenant_id = public.get_user_tenant_id() AND public.is_user_admin_or_manager())
);

-- Helper function to get current user's tenant_id from member table
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT tenant_id 
  FROM public.member 
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.current_tenant_id() TO authenticated;

-- Helper function to check if current user's tenant is the father tenant
CREATE OR REPLACE FUNCTION public.is_father_tenant()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.member m
    JOIN public.tenant t ON m.tenant_id = t.id
    WHERE m.user_id = auth.uid()
    AND t.is_father = true
  );
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_father_tenant() TO authenticated;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_member_user_id ON public.member(user_id);
CREATE INDEX IF NOT EXISTS idx_member_tenant_id ON public.member(tenant_id);
CREATE INDEX IF NOT EXISTS idx_member_tenant_user ON public.member(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_is_father ON public.tenant(is_father) WHERE is_father = true;

