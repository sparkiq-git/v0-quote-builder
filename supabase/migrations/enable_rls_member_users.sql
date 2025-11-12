-- Enable RLS on member table
ALTER TABLE public.member ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view members of their own tenant
CREATE POLICY "Users can view members of their own tenant"
ON public.member
FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id 
    FROM public.member 
    WHERE user_id = auth.uid()
  )
);

-- Policy: Admins can insert members in their tenant
CREATE POLICY "Admins can insert members in their tenant"
ON public.member
FOR INSERT
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id 
    FROM public.member 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'manager')
  )
);

-- Policy: Admins can update members in their tenant
CREATE POLICY "Admins can update members in their tenant"
ON public.member
FOR UPDATE
USING (
  tenant_id IN (
    SELECT tenant_id 
    FROM public.member 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'manager')
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id 
    FROM public.member 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'manager')
  )
);

-- Policy: Admins can delete members in their tenant
CREATE POLICY "Admins can delete members in their tenant"
ON public.member
FOR DELETE
USING (
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

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_member_user_id ON public.member(user_id);
CREATE INDEX IF NOT EXISTS idx_member_tenant_id ON public.member(tenant_id);
CREATE INDEX IF NOT EXISTS idx_member_tenant_user ON public.member(tenant_id, user_id);

