-- Fix RLS policy to avoid potential circular dependency issues
-- This policy ensures users can always see their own member record first

-- Drop existing policy
DROP POLICY IF EXISTS "Users can view members of their own tenant" ON public.member;

-- Create improved policy that allows users to see their own record first
CREATE POLICY "Users can view members of their own tenant"
ON public.member
FOR SELECT
USING (
  -- Always allow users to see their own member record (needed for RLS to work)
  user_id = auth.uid()
  OR
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

