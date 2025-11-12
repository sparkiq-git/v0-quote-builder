-- Enable RLS on member table
ALTER TABLE public.member ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view members of their own tenant, or all members if father tenant
CREATE POLICY "Users can view members of their own tenant"
ON public.member
FOR SELECT
USING (
  -- Allow if user's tenant is the father tenant (can see everything)
  EXISTS (
    SELECT 1 
    FROM public.member m
    JOIN public.tenant t ON m.tenant_id = t.id
    WHERE m.user_id = auth.uid()
    AND t.is_father = true
  )
  OR
  -- Or allow if member belongs to user's tenant
  tenant_id IN (
    SELECT tenant_id 
    FROM public.member 
    WHERE user_id = auth.uid()
  )
);

-- Policy: Admins can insert members in their tenant, or father tenant can insert anywhere
CREATE POLICY "Admins can insert members in their tenant"
ON public.member
FOR INSERT
WITH CHECK (
  -- Allow if user's tenant is the father tenant (can insert anywhere)
  EXISTS (
    SELECT 1 
    FROM public.member m
    JOIN public.tenant t ON m.tenant_id = t.id
    WHERE m.user_id = auth.uid()
    AND t.is_father = true
  )
  OR
  -- Or allow if inserting into user's tenant and user is admin/manager
  tenant_id IN (
    SELECT tenant_id 
    FROM public.member 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'manager')
  )
);

-- Policy: Admins can update members in their tenant, or father tenant can update anywhere
CREATE POLICY "Admins can update members in their tenant"
ON public.member
FOR UPDATE
USING (
  -- Allow if user's tenant is the father tenant (can update anywhere)
  EXISTS (
    SELECT 1 
    FROM public.member m
    JOIN public.tenant t ON m.tenant_id = t.id
    WHERE m.user_id = auth.uid()
    AND t.is_father = true
  )
  OR
  -- Or allow if updating member in user's tenant and user is admin/manager
  tenant_id IN (
    SELECT tenant_id 
    FROM public.member 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'manager')
  )
)
WITH CHECK (
  -- Allow if user's tenant is the father tenant (can update anywhere)
  EXISTS (
    SELECT 1 
    FROM public.member m
    JOIN public.tenant t ON m.tenant_id = t.id
    WHERE m.user_id = auth.uid()
    AND t.is_father = true
  )
  OR
  -- Or allow if updating member in user's tenant and user is admin/manager
  tenant_id IN (
    SELECT tenant_id 
    FROM public.member 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'manager')
  )
);

-- Policy: Admins can delete members in their tenant, or father tenant can delete anywhere
CREATE POLICY "Admins can delete members in their tenant"
ON public.member
FOR DELETE
USING (
  -- Allow if user's tenant is the father tenant (can delete anywhere)
  EXISTS (
    SELECT 1 
    FROM public.member m
    JOIN public.tenant t ON m.tenant_id = t.id
    WHERE m.user_id = auth.uid()
    AND t.is_father = true
  )
  OR
  -- Or allow if deleting member in user's tenant and user is admin/manager
  tenant_id IN (
    SELECT tenant_id 
    FROM public.member 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'manager')
  )
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

