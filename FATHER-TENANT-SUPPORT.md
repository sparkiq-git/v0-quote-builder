# Father Tenant Support

## Overview

The application supports a special "father" tenant that has elevated permissions to see and manage all members across all tenants. This is useful for system administrators or parent organizations that need to oversee multiple tenant organizations.

## Configuration

The father tenant is identified by the `is_father` column in the `tenant` table:

```sql
CREATE TABLE public.tenant (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  is_father boolean NOT NULL DEFAULT false,
  CONSTRAINT tenant_pkey PRIMARY KEY (id)
);
```

To designate a tenant as the father tenant, set `is_father = true`:

```sql
UPDATE public.tenant SET is_father = true WHERE id = 'your-tenant-id';
```

## Permissions

### What the Father Tenant Can Do

1. **View All Members**: See all members across all tenants in the system
2. **Create Members**: Create members in any tenant (currently defaults to father tenant, but RLS allows creation in any tenant)
3. **Update Members**: Update members in any tenant
4. **Delete Members**: Delete members in any tenant
5. **View Statistics**: See role statistics across all tenants

### RLS Policy Behavior

The RLS policies automatically check if the current user's tenant is the father tenant:

```sql
-- Example: SELECT policy allows father tenant to see all members
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
```

## Code Implementation

### Helper Functions

The `lib/supabase/member-helpers.ts` file includes:

- `isFatherTenant()` - Checks if current user's tenant is the father tenant
- `getTenantMembers()` - Returns all members if father tenant, otherwise tenant-scoped members

### Server Actions

All server actions in `lib/actions/admin-users.ts` check for father tenant status:

- `getUsers()` - Returns all users if father tenant
- `getRoleStatistics()` - Counts all members if father tenant
- Create/Update/Delete operations respect RLS policies (father tenant can operate on any tenant)

## Database Functions

### `public.is_father_tenant()`

A database function that checks if the current user's tenant is the father tenant:

```sql
SELECT public.is_father_tenant(); -- Returns true/false
```

This function is used in RLS policies to determine if a user should have cross-tenant access.

## Best Practices

1. **Limit Father Tenants**: Only designate one or very few tenants as father tenants
2. **Audit Access**: Monitor father tenant activity for security purposes
3. **User Roles**: Father tenant users should still have appropriate roles (admin/manager) for clarity
4. **Testing**: Test father tenant access separately from regular tenant access

## Security Considerations

- The father tenant bypasses normal tenant isolation
- RLS policies enforce father tenant checks at the database level
- All operations are logged and can be audited
- Consider implementing additional audit logging for father tenant operations

## Future Enhancements

Potential improvements:

1. **Tenant Selection UI**: Allow father tenant to select which tenant to create members in
2. **Cross-Tenant Operations**: Explicit UI for managing members across tenants
3. **Audit Logging**: Enhanced logging for father tenant operations
4. **Permission Granularity**: More granular permissions (e.g., read-only father tenant)

