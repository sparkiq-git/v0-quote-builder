"use client"

import { createClient } from "./client"

/**
 * Get the current user's tenant_id from the member table (client-side)
 * This is the RLS-safe way to get tenant_id in client components
 */
export async function getCurrentTenantIdClient(): Promise<string | null> {
  try {
    // Only run on client side
    if (typeof window === 'undefined') return null
    
    const supabase = createClient()
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
    // Fallback to app_metadata
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      return user?.app_metadata?.tenant_id || null
    } catch {
      return null
    }
  }
}
