# Lead Tables RLS Policies Summary

This document describes the Row Level Security (RLS) policies implemented for the lead-related tables to enforce tenant isolation while allowing public leads to be visible to all tenants.

## Overview

The RLS policies ensure that:
- Users can only see leads where `visibility = 'public'` OR `tenant_id = their_tenant_id`
- Users can only modify leads that belong to their tenant
- Public leads can be viewed by all tenants but only modified by the owner tenant
- Father tenant users (if applicable) have full access to all leads

## Tables Covered

1. **`lead`** - Main lead records
2. **`lead_detail`** - Lead leg/segment details (inherits access from parent lead)
3. **`lead_tenant_engagement`** - Tenant-specific engagement tracking (strict tenant isolation)

## Helper Functions Used

The policies rely on these existing SECURITY DEFINER functions:
- `public.get_user_tenant_id()` - Returns current user's tenant_id from member table
- `public.is_user_father_tenant()` - Checks if user belongs to father tenant (admin access)
- `public.is_user_admin_or_manager()` - Checks if user has admin/manager role

## Policy Details

### Lead Table Policies

#### SELECT Policy
- ✅ Public leads: Visible to all authenticated users
- ✅ Tenant leads: Visible to users from the same tenant
- ✅ Father tenant: Can see all leads

#### INSERT Policy
- ✅ Users can create leads in their own tenant
- ✅ Users can create public leads (tenant_id can be NULL for public)
- ✅ Father tenant: Can create leads in any tenant

#### UPDATE Policy
- ✅ Users can update leads from their tenant
- ✅ Users can update public leads (if they have access)
- ✅ Users can change lead visibility to 'public'
- ✅ Users cannot change tenant_id to another tenant (enforced in WITH CHECK)
- ✅ Father tenant: Can update any lead

#### DELETE Policy
- ✅ Users can delete leads from their own tenant only
- ✅ Users cannot delete public leads from other tenants
- ✅ Father tenant: Can delete any lead

### Lead Detail Table Policies

All policies check if the user has access to the parent lead:
- SELECT: Can view details if can view parent lead
- INSERT: Can add details if can access parent lead
- UPDATE: Can update details if can access parent lead
- DELETE: Can delete details if can access parent lead

This ensures lead_details inherit access control from their parent lead.

### Lead Tenant Engagement Table Policies

Strict tenant isolation - users can only access engagement records for their own tenant:
- SELECT: Only see engagement records for their tenant
- INSERT: Only create engagement records for their tenant
- UPDATE: Only update engagement records for their tenant
- DELETE: Only delete engagement records for their tenant

Exception: Father tenant users can access all engagement records.

## Realtime Subscriptions

Realtime subscriptions automatically respect RLS policies. Users will only receive realtime updates for:
- Public leads (visibility = 'public')
- Leads belonging to their tenant (tenant_id = their_tenant_id)
- All leads (if father tenant)

## Client-Side Code Changes

The following changes were made to the client-side code to work with RLS:

1. **`app/leads/page.tsx`**
   - Added tenant filtering using `getCurrentTenantIdClient()`
   - Query filters: `visibility = 'public'` OR `tenant_id = current_tenant_id`
   - Added `visibility` and `tenant_id` to select fields

2. **`components/leads/lead-detail-modal.tsx`**
   - Added tenant filtering to main query and fallback query
   - Added error handling for access-denied scenarios
   - Shows user-friendly error messages when access is denied

## Testing Checklist

- [ ] Users can see public leads from any tenant
- [ ] Users can see leads from their own tenant
- [ ] Users cannot see leads from other tenants (unless public)
- [ ] Users can create leads in their own tenant
- [ ] Users can create public leads
- [ ] Users can update leads from their own tenant
- [ ] Users can update public leads (if they have access)
- [ ] Users cannot change tenant_id to another tenant
- [ ] Users can delete leads from their own tenant
- [ ] Users cannot delete public leads from other tenants
- [ ] Lead details inherit access from parent lead
- [ ] Engagement records are strictly tenant-isolated
- [ ] Realtime updates respect RLS policies
- [ ] Father tenant users have full access (if applicable)

## Migration File

The RLS policies are defined in:
\`\`\`
supabase/migrations/enable_rls_lead_tables.sql
\`\`\`

To apply the migration:
\`\`\`bash
supabase migration up
\`\`\`

Or manually run the SQL file in your Supabase dashboard.
