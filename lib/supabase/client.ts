"use client"

import { createBrowserClient } from "@supabase/ssr"

// Use a global variable (attached to window) to persist across module re-evaluations
// This prevents multiple GoTrueClient instances in Next.js with hot module reloading
const GLOBAL_KEY = "__SUPABASE_CLIENT__"

declare global {
  interface Window {
    [GLOBAL_KEY]?: ReturnType<typeof createBrowserClient>
  }
}

function getGlobalClient(): ReturnType<typeof createBrowserClient> | null {
  if (typeof window === "undefined") {
    return null
  }
  return (window as any)[GLOBAL_KEY] || null
}

function setGlobalClient(client: ReturnType<typeof createBrowserClient>): void {
  if (typeof window !== "undefined") {
    ;(window as any)[GLOBAL_KEY] = client
  }
}

export function createClient() {
  // Return existing client if already created (singleton pattern with global storage)
  const existingClient = getGlobalClient()
  if (existingClient) {
    return existingClient
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

  const client = createBrowserClient(supabaseUrl, supabaseAnonKey)
  setGlobalClient(client)
  return client
}

// Export a function to get the client instead of calling it at module level
export const getSupabaseClient = () => createClient()

// Removed Proxy export to avoid module resolution issues
// Use createClient() instead: const supabase = createClient()
