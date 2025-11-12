# RLS Migration Guide - Users Section

This guide documents the migration to Row Level Security (RLS) for the users section of the application.

## Overview

We're migrating from direct `auth.users` queries (using service role) to tenant-scoped queries through the `member` table with RLS enabled. This ensures that:

1. Users can only see members of their own tenant
2. Only admins/managers can create, update, or delete members
3. All queries respect tenant boundaries automatically

## Database Changes

### 1. Run the Migration

Execute the SQL migration file:
```sql
supabase/migrations/enable_rls_member_users.sql
```

This migration:
- Enables RLS on the `member` table
- Creates policies for SELECT, INSERT, UPDATE, DELETE operations
- Creates a helper function `auth.current_tenant_id()` for getting tenant_id
- Creates indexes for performance

### 2. Verify Existing Data

Before enabling RLS, ensure all existing users have corresponding `member` records:

```sql
-- Check for users without member records
SELECT au.id, au.email, au.raw_app_meta_data->>'tenant_id' as tenant_id
FROM auth.users au
LEFT JOIN public.member m ON au.id = m.user_id
WHERE m.id IS NULL;

-- Create member records for users missing them (adjust tenant_id as needed)
INSERT INTO public.member (tenant_id, user_id, role, is_global_admin)
SELECT 
  (raw_app_meta_data->>'tenant_id')::uuid as tenant_id,
  id as user_id,
  COALESCE((raw_app_meta_data->>'role'), 'user') as role,
  false as is_global_admin
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.member)
AND raw_app_meta_data->>'tenant_id' IS NOT NULL;
```

## Code Changes

### 1. New Helper Functions

Created `lib/supabase/member-helpers.ts` with:
- `getCurrentTenantId()` - Gets tenant_id from member table (RLS-safe)
- `getCurrentUserRole()` - Gets role from member table
- `isAdminOrManager()` - Checks if user is admin/manager
- `getTenantMembers()` - Gets all members for current tenant

### 2. Updated Server Actions

`lib/actions/admin-users.ts` has been refactored to:

#### `getUsers()`
- ✅ Queries `member` table first (respects RLS)
- ✅ Filters by current tenant_id
- ✅ Fetches auth user details only for members in tenant
- ✅ Uses member table role instead of app_metadata

#### `createUser()`
- ✅ Creates auth user (still requires service role)
- ✅ Creates `member` record in member table (RLS handles permissions)
- ✅ Uses tenant_id from current user's member record

#### `updateUser()`
- ✅ Updates auth user (still requires service role)
- ✅ Updates `member` record (RLS handles permissions)
- ✅ Ensures tenant_id matches current user's tenant

#### `deleteUser()`
- ✅ Deletes `member` record first (RLS handles permissions)
- ✅ Deletes auth user (still requires service role)
- ✅ Ensures tenant_id matches current user's tenant

#### `getRoleStatistics()`
- ✅ Queries `member` table (respects RLS)
- ✅ Calculates statistics from member table roles

#### `bulkUpdateUserRoles()`
- ✅ Updates `member` table records (RLS handles permissions)
- ✅ Also updates auth app_metadata for backward compatibility

## Testing Checklist

- [ ] Run the SQL migration
- [ ] Verify all existing users have member records
- [ ] Test user listing (should only show users in same tenant)
- [ ] Test creating a new user (should create member record)
- [ ] Test updating a user (should update member record)
- [ ] Test deleting a user (should delete member record)
- [ ] Test role statistics (should only count current tenant)
- [ ] Test bulk role updates
- [ ] Verify users from different tenants cannot see each other
- [ ] Verify non-admin users cannot create/update/delete members

## Rollback Plan

If you need to rollback:

1. Disable RLS temporarily:
```sql
ALTER TABLE public.member DISABLE ROW LEVEL SECURITY;
```

2. Drop the policies:
```sql
DROP POLICY IF EXISTS "Users can view members of their own tenant" ON public.member;
DROP POLICY IF EXISTS "Admins can insert members in their tenant" ON public.member;
DROP POLICY IF EXISTS "Admins can update members in their tenant" ON public.member;
DROP POLICY IF EXISTS "Admins can delete members in their tenant" ON public.member;
```

3. Revert code changes in `lib/actions/admin-users.ts` to use service role client for all queries

## Next Steps

After verifying the users section works correctly:

1. Migrate other sections (contacts, passengers, quotes, etc.) to use RLS
2. Create similar helper functions for other tables
3. Enable RLS on other tenant-scoped tables
4. Remove service role usage where possible (keep only for auth operations)

## Notes

- Auth operations (create/update/delete users) still require service role client
- The `member` table is the source of truth for tenant membership and roles
- `app_metadata.tenant_id` is kept for backward compatibility but should eventually be removed
- All queries now automatically filter by tenant_id through RLS policies

