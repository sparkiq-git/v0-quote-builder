-- Fix RLS policy circular dependency issue
-- The policy was trying to query member table to check tenant_id,
-- but that query itself was blocked by RLS, creating a circular dependency.
-- Solution: Allow users to see their own member record first.

-- Drop existing policy
DROP POLICY IF EXISTS "Users can view members of their own tenant" ON public.member;

-- Recreate policy with fix: allow users to see their own record first
CREATE POLICY "Users can view members of their own tenant"
ON public.member
FOR SELECT
USING (
  -- Always allow users to see their own member record first (prevents circular dependency)
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

