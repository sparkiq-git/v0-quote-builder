"use client"

import { createBrowserClient } from "@supabase/ssr"

let client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  // Return existing client if already created (singleton pattern)
  if (client) {
    return client
  }

  // Check if we're in browser environment
  if (typeof window === "undefined") {
    throw new Error("createClient should only be called in browser environment")
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables")
  }

  client = createBrowserClient(supabaseUrl, supabaseAnonKey)
  return client
}

// Export a function to get the client instead of calling it at module level
export const getSupabaseClient = () => createClient()

// This creates a proxy that only initializes the client when actually accessed
export const supabase = new Proxy({} as ReturnType<typeof createBrowserClient>, {
  get(target, prop) {
    const client = createClient()
    return (client as any)[prop]
  },
})
