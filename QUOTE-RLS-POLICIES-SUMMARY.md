# Quote Tables RLS Policies Summary

This document describes the Row Level Security (RLS) policies implemented for the quote-related tables to enforce tenant isolation.

## Overview

The RLS policies ensure that:
- Users can only see quotes that belong to their tenant (`tenant_id = their_tenant_id`)
- Users can only modify quotes from their tenant
- Related tables (quote_option, quote_detail, quote_item) inherit access from parent quote
- Father tenant users (if applicable) have full access to all quotes

## Tables Covered

1. **`quote`** - Main quote records (strict tenant isolation)
2. **`quote_option`** - Quote aircraft options (inherits access from parent quote)
3. **`quote_detail`** - Quote leg/segment details (inherits access from parent quote)
4. **`quote_item`** - Quote services/items (inherits access from parent quote)

## Helper Functions Used

The policies rely on these existing SECURITY DEFINER functions:
- `public.get_user_tenant_id()` - Returns current user's tenant_id from member table
- `public.is_user_father_tenant()` - Checks if user belongs to father tenant (admin access)
- `public.is_user_admin_or_manager()` - Checks if user has admin/manager role

## Policy Details

### Quote Table Policies

#### SELECT Policy
- ✅ Users can view quotes from their tenant only
- ✅ Father tenant: Can see all quotes

#### INSERT Policy
- ✅ Users can create quotes in their own tenant
- ✅ Father tenant: Can create quotes in any tenant

#### UPDATE Policy
- ✅ Users can update quotes from their tenant
- ✅ Users cannot change tenant_id to another tenant (enforced in WITH CHECK)
- ✅ Father tenant: Can update any quote

#### DELETE Policy
- ✅ Users can delete quotes from their own tenant only
- ✅ Father tenant: Can delete any quote

### Quote Option Table Policies

All policies check if the user has access to the parent quote:
- SELECT: Can view options if can view parent quote
- INSERT: Can add options if can access parent quote
- UPDATE: Can update options if can access parent quote
- DELETE: Can delete options if can access parent quote

This ensures quote_options inherit access control from their parent quote.

### Quote Detail Table Policies

All policies check if the user has access to the parent quote:
- SELECT: Can view details if can view parent quote
- INSERT: Can add details if can access parent quote
- UPDATE: Can update details if can access parent quote
- DELETE: Can delete details if can access parent quote

This ensures quote_details inherit access control from their parent quote.

### Quote Item Table Policies

All policies check if the user has access to the parent quote:
- SELECT: Can view items if can view parent quote
- INSERT: Can add items if can access parent quote
- UPDATE: Can update items if can access parent quote
- DELETE: Can delete items if can access parent quote

This ensures quote_items inherit access control from their parent quote.

## Client-Side Code Changes

The following changes were made to the client-side code:

1. **`app/quotes/page.tsx`**
   - ✅ Updated to use `getCurrentTenantIdClient()` instead of `process.env.NEXT_PUBLIC_TENANT_ID!`
   - ✅ Added error handling for missing tenant_id
   - ✅ Query now filters by `tenant_id = current_tenant_id`

2. **`lib/supabase/queries/quotes.ts`**
   - ✅ Updated `getQuoteById()` to include tenant_id filtering
   - ✅ Updated `createQuote()` to use `getCurrentTenantIdClient()` with fallback
   - ✅ Added error handling for access-denied scenarios

## Note: Public Quote Access

The API route `/api/quotes/[id]/route.ts` uses a service role client for public quote access via action links. This is intentional and bypasses RLS for public quote viewing. The RLS policies will still enforce tenant isolation for all authenticated operations using regular clients.

## Realtime Subscriptions

Realtime subscriptions automatically respect RLS policies. Users will only receive realtime updates for quotes belonging to their tenant.

## Testing Checklist

- [ ] Users can see quotes from their own tenant
- [ ] Users cannot see quotes from other tenants
- [ ] Users can create quotes in their own tenant
- [ ] Users can update quotes from their own tenant
- [ ] Users cannot change tenant_id to another tenant
- [ ] Users can delete quotes from their own tenant
- [ ] Users cannot delete quotes from other tenants
- [ ] Quote options inherit access from parent quote
- [ ] Quote details inherit access from parent quote
- [ ] Quote items inherit access from parent quote
- [ ] Realtime updates respect RLS policies
- [ ] Father tenant users have full access (if applicable)

## Migration File

The RLS policies are defined in:
\`\`\`
supabase/migrations/enable_rls_quote_tables.sql
\`\`\`

To apply the migration:
\`\`\`bash
supabase migration up
\`\`\`

Or manually run the SQL file in your Supabase dashboard.
