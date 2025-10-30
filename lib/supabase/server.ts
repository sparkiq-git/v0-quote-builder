import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function createClient() {
  const cookieStore = await cookies()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables")
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  })
}


export async function getServerUser() {
  const supabase = await createClient()

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return { user: null, role: null, tenantId: null }
    }

    console.log("[v0] Server user app_metadata:", user.app_metadata)

    // Check for both possible role structures
    const roles = user.app_metadata?.roles || []
    const singleRole = user.app_metadata?.role || null
    const tenantId = user.app_metadata?.tenant_id || null

    // Return the primary role (first in array or single role)
    const primaryRole = roles.length > 0 ? roles[0] : singleRole

    console.log("[v0] Server roles array:", roles)
    console.log("[v0] Server single role:", singleRole)
    console.log("[v0] Server primary role:", primaryRole)

    return { user, role: primaryRole, tenantId }
  } catch (error) {
    console.error("[v0] Error in getServerUser:", error)
    return { user: null, role: null, tenantId: null }
  }
}
