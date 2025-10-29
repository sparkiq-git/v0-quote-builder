"use client"

import { useEffect, useRef } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import type { Lead } from "@/lib/types"

// Optional helper: small delay to debounce grouped inserts
const debounce = (fn: Function, delay: number) => {
  let timer: NodeJS.Timeout
  return (...args: any[]) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

export function LeadListener() {
  const router = useRouter()
  const soundRef = useRef<HTMLAudioElement | null>(null)
  const pendingLeads = useRef<Lead[]>([])

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    // Preload the sound
    soundRef.current = new Audio("/notify.mp3")

    const subscribeRealtime = async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return // No session, no need to listen
      
      supabase.realtime.setAuth(session.access_token)
      
      // Get tenantId from user metadata
      const tenantId = session.user?.app_metadata?.tenant_id

      const channel = supabase.channel("global-leads-listener")

      const flushLeads = debounce(() => {
        if (pendingLeads.current.length === 0) return
        const count = pendingLeads.current.length

        const firstLead = pendingLeads.current[0]
        const label = count === 1
          ? `New Lead: ${firstLead.customer_name || "Unnamed"}`
          : `${count} New Leads`

        toast(label, {
          description: count === 1
            ? firstLead.trip_summary || "No trip summary"
            : "Multiple new leads received",
          action: {
            label: "View",
            onClick: () => router.push("/leads"),
          },
        })

        soundRef.current?.play().catch(() => {}) // silent fail if autoplay blocked
        pendingLeads.current = []
      }, 1000) // group leads arriving within 1s

      channel.on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "lead" },
        (payload) => {
          const newLead = payload.new as Lead

          // ✅ Only show for same tenant
          if (tenantId && newLead.tenant_id !== tenantId) return

          pendingLeads.current.push(newLead)
          flushLeads()
        }
      )

      channel.subscribe((status) =>
        console.log("Global Realtime Listener:", status)
      )

      return () => channel.unsubscribe()
    }

    subscribeRealtime()
  }, [router, supabase])

  return null // no UI, background listener only
}
