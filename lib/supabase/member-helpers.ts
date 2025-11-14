"use server"

import { createClient } from "./server"

/**
 * Get the current user's tenant_id from the member table
 * This is the RLS-safe way to get tenant_id
 */
export async function getCurrentTenantId(): Promise<string | null> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return null

    // Try to get tenant_id from member table first (RLS-safe)
    const { data: member, error } = await supabase
      .from("member")
      .select("tenant_id")
      .eq("user_id", user.id)
      .single()

    if (error || !member) {
      // Fallback to app_metadata for backward compatibility during migration
      return user.app_metadata?.tenant_id || null
    }

    return member.tenant_id
  } catch (error) {
    console.error("Error getting tenant_id from member table:", error)
    return null
  }
}

/**
 * Get the current user's role from the member table
 * Returns the role for the user's current tenant
 */
export async function getCurrentUserRole(): Promise<string | null> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return null

    const { data: member, error } = await supabase
      .from("member")
      .select("role")
      .eq("user_id", user.id)
      .single()

    if (error || !member) {
      // Fallback to app_metadata for backward compatibility
      const roles = user.app_metadata?.roles || []
      const singleRole = user.app_metadata?.role || null
      return roles.length > 0 ? roles[0] : singleRole
    }

    return member.role
  } catch (error) {
    console.error("Error getting role from member table:", error)
    return null
  }
}

/**
 * Check if current user is admin or manager in their tenant
 */
export async function isAdminOrManager(): Promise<boolean> {
  const role = await getCurrentUserRole()
  return role === "admin" || role === "manager"
}

/**
 * Check if current user's tenant is the father tenant
 * Father tenant can see and manage all tenants
 */
export async function isFatherTenant(): Promise<boolean> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return false

    // Check if user's tenant is the father tenant
    const { data: member, error: memberError } = await supabase
      .from("member")
      .select("tenant_id")
      .eq("user_id", user.id)
      .single()

    if (memberError || !member) return false

    const { data: tenant, error: tenantError } = await supabase
      .from("tenant")
      .select("is_father")
      .eq("id", member.tenant_id)
      .single()

    if (tenantError || !tenant) return false

    return tenant.is_father === true
  } catch (error) {
    console.error("Error checking if father tenant:", error)
    return false
  }
}

/**
 * Get all members for the current user's tenant
 * If user is from father tenant, returns all members across all tenants
 * This respects RLS policies
 */
export async function getTenantMembers() {
  try {
    const supabase = await createClient()
    const tenantId = await getCurrentTenantId()
    const isFather = await isFatherTenant()

    if (!tenantId && !isFather) {
      return { success: false, error: "No tenant found", data: [] }
    }

    // Build query - if father tenant, don't filter by tenant_id
    let query = supabase
      .from("member")
      .select(`
        id,
        tenant_id,
        user_id,
        role,
        created_at,
        is_global_admin,
        auth_users:user_id (
          id,
          email,
          raw_user_meta_data,
          raw_app_meta_data,
          created_at,
          last_sign_in_at,
          banned_until
        )
      `)

    // Only filter by tenant_id if not father tenant
    if (!isFather && tenantId) {
      query = query.eq("tenant_id", tenantId)
    }

    const { data, error } = await query.order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching tenant members:", error)
      return { success: false, error: error.message, data: [] }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    console.error("Error in getTenantMembers:", error)
    return { success: false, error: "Failed to fetch members", data: [] }
  }
}
