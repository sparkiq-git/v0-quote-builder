// lib/supabase/action-links.ts
// Isolated Supabase client specifically for action links
// This won't interfere with your existing Supabase client patterns

import { createServerClient } from "@supabase/ssr"

/**
 * Creates a Supabase client specifically for action link operations.
 * This is isolated from your existing client patterns to avoid conflicts.
 */
export async function createActionLinkClient(useServiceRole = false) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL")
  }

  if (useServiceRole) {
    if (!serviceRoleKey) {
      throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY")
    }

    return createServerClient(supabaseUrl, serviceRoleKey, {
      cookies: {
        getAll() {
          return []
        },
        setAll() {
          // No-op for service role
        },
      },
    })
  }

  if (!supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY")
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return []
      },
      setAll() {
        // No-op for action links
      },
    },
  })
}
