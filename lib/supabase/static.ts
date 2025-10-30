// lib/supabase/static.ts
// Utility for creating Supabase clients for static API routes
// This avoids the dynamic server usage issues

import { createClient } from "@supabase/supabase-js"

/**
 * Creates a Supabase client for static API routes that don't need authentication
 * This avoids the dynamic server usage issues with cookies
 */
export function createStaticClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables")
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false
    }
  })
}
