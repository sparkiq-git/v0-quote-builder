-- Fix RLS policy circular dependency issue
-- The policy was trying to query member table to check tenant_id,
-- but that query itself was blocked by RLS, creating infinite recursion.
-- Solution: Use SECURITY DEFINER function to get tenant_id without triggering RLS

-- Drop existing policy
DROP POLICY IF EXISTS "Users can view members of their own tenant" ON public.member;

-- Create a SECURITY DEFINER function to get user's tenant_id without triggering RLS
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

-- Create a SECURITY DEFINER function to check if user is in father tenant
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

-- Recreate SELECT policy using the SECURITY DEFINER functions (no circular dependency)
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

-- Fix INSERT policy
DROP POLICY IF EXISTS "Admins can insert members in their tenant" ON public.member;
CREATE POLICY "Admins can insert members in their tenant"
ON public.member
FOR INSERT
WITH CHECK (
  public.is_user_father_tenant()
  OR
  (tenant_id = public.get_user_tenant_id() AND public.is_user_admin_or_manager())
);

-- Fix UPDATE policy
DROP POLICY IF EXISTS "Admins can update members in their tenant" ON public.member;
CREATE POLICY "Admins can update members in their tenant"
ON public.member
FOR UPDATE
USING (
  public.is_user_father_tenant()
  OR
  (tenant_id = public.get_user_tenant_id() AND public.is_user_admin_or_manager())
)
WITH CHECK (
  public.is_user_father_tenant()
  OR
  (tenant_id = public.get_user_tenant_id() AND public.is_user_admin_or_manager())
);

-- Fix DELETE policy
DROP POLICY IF EXISTS "Admins can delete members in their tenant" ON public.member;
CREATE POLICY "Admins can delete members in their tenant"
ON public.member
FOR DELETE
USING (
  public.is_user_father_tenant()
  OR
  (tenant_id = public.get_user_tenant_id() AND public.is_user_admin_or_manager())
);

