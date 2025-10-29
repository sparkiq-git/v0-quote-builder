//lib/supabase/queries/items.ts

"use server"

import { createClient } from "@/lib/supabase/server"

/**
 * Fetches available items for a given tenant.
 * Tenants see:
 *  - All items marked as visibility = 'public'
 *  - All items belonging to their own tenant_id
 *
 * @param tenantId - The tenant UUID (required for tenant context)
 */
export async function getAvailableItems(tenantId?: string | null) {
  const supabase = createClient()

  try {
    let query = supabase
      .from("item")
      .select(
        "id, code, name, default_notes, default_unit_price, default_taxable, visibility, tenant_id"
      )
      .eq("active", true)
      .order("name", { ascending: true })

    // ✅ Only include tenant filter if tenantId is actually provided
    if (tenantId) {
      query = query.or(`visibility.eq.public,tenant_id.eq.${tenantId}`)
    } else {
      // ⚙️ Fallback for dev / no tenant_id context
      query = query.eq("visibility", "public")
    }

    const { data, error } = await query

    if (error) {
      console.error("❌ Error fetching items:", error)
      throw error
    }

    return data || []
  } catch (err) {
    console.error("🚨 Unexpected error in getAvailableItems:", err)
    return []
  }
}
