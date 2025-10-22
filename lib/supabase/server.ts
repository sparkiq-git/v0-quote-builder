import { createServerClient } from "@supabase/ssr"
import { cookies, headers } from "next/headers"

/**
 * Create a Supabase client for server components and route handlers.
 * Defaults to anon key (for SSR and standard pages).
 * Pass `true` to use service role for secure inserts/updates in API routes.
 */
export async function createClient(serviceRole = false) {
  const cookieStore = await cookies()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables")
  }

  // Determine which key to use (anon vs service)
  const supabaseKey = serviceRole ? supabaseServiceKey : supabaseAnonKey
  if (!supabaseKey) {
    throw new Error("Service role key is required for privileged operations")
  }

  // Extract basic request metadata for audit/context
  const hdrs = headers()
  const ip = hdrs.get("x-forwarded-for") ?? "unknown"
  const ua = hdrs.get("user-agent") ?? "unknown"

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Called in a Server Component (safe to ignore)
        }
      },
    },
    global: {
      headers: {
        "X-Forwarded-For": ip,
        "User-Agent": ua,
      },
    },
  })
}

/**
 * Fetches the current authenticated user and role from Supabase session.
 * Supports both array roles (`roles`) and single role (`role`) in app_metadata.
 */
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

    console.log("[server] User app_metadata:", user.app_metadata)

    const roles = user.app_metadata?.roles || []
    const singleRole = user.app_metadata?.role || null
    const tenantId = user.app_metadata?.tenant_id || null
    const primaryRole = roles.length > 0 ? roles[0] : singleRole

    return { user, role: primaryRole, tenantId }
  } catch (error) {
    console.error("[server] Error in getServerUser:", error)
    return { user: null, role: null, tenantId: null }
  }
}
