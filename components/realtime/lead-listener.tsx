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
    
    console.log("🔔 LeadListener mounted, setting up real-time notifications...")
    
    // Test Sonner immediately to verify it's working
    console.log("🔔 Testing Sonner toast...")
    toast("LeadListener Test", {
      description: "Testing if Sonner is working",
      duration: 3000,
    })
    console.log("🔔 Test toast called")
    
    // Preload the sound
    soundRef.current = new Audio("/notify.mp3")

    let cleanup: (() => void) | undefined

    const subscribeRealtime = async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) {
        console.error("🔔 Session error:", sessionError)
        return
      }
      if (!session) {
        console.log("🔔 No session found")
        return
      }
      
      console.log("🔔 Session found, user:", session.user?.email)
      console.log("🔔 Access token exists:", !!session.access_token)
      
      supabase.realtime.setAuth(session.access_token)
      
      // Get tenantId from user metadata
      const tenantId = session.user?.app_metadata?.tenant_id
      console.log("🔔 Tenant ID:", tenantId)

      // Create separate channels for each table to avoid conflicts
      const leadsChannel = supabase.channel("leads-listener")
      const quotesChannel = supabase.channel("quotes-listener")
      const invoicesChannel = supabase.channel("invoices-listener")

      const flushLeads = debounce(() => {
        console.log("🔔 flushLeads called, pending leads:", pendingLeads.current.length)
        if (pendingLeads.current.length === 0) {
          console.log("🔔 No pending leads, returning")
          return
        }
        const count = pendingLeads.current.length

        const firstLead = pendingLeads.current[0]
        const label = count === 1
          ? `New Lead: ${firstLead.customer_name || "Unnamed"}`
          : `${count} New Leads`

        console.log("🔔 About to show toast:", label)
        console.log("🔔 Toast function available:", typeof toast)
        
        try {
          toast(label, {
            description: count === 1
              ? firstLead.trip_summary || "No trip summary"
              : "Multiple new leads received",
            action: {
              label: "View",
              onClick: () => router.push("/leads"),
            },
          })
          console.log("🔔 Toast called successfully")
        } catch (error) {
          console.error("🔔 Toast error:", error)
        }

        soundRef.current?.play().catch(() => {}) // silent fail if autoplay blocked
        pendingLeads.current = []
        console.log("🔔 flushLeads completed")
      }, 1000) // group leads arriving within 1s

      // 🔔 Listen for new leads
      leadsChannel.on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "lead" },
        (payload) => {
          console.log("🔔 Lead INSERT event received:", payload)
          const newLead = payload.new as Lead

          // ✅ Only show for same tenant
          if (tenantId && newLead.tenant_id !== tenantId) {
            console.log("🔔 Lead filtered out - different tenant")
            return
          }

          console.log("🔔 Processing new lead:", newLead.customer_name)
          
          // Test immediate toast first (bypass debounce)
          console.log("🔔 Testing immediate toast...")
          toast("IMMEDIATE TEST: New Lead", {
            description: `Lead: ${newLead.customer_name || "Unnamed"}`,
            duration: 5000,
          })
          console.log("🔔 Immediate toast called")
          
          console.log("🔔 About to call flushLeads...")
          pendingLeads.current.push(newLead)
          flushLeads()
          console.log("🔔 flushLeads called")
        }
      )

      // 🔔 Listen for quote status changes (approved/declined)
      quotesChannel.on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "quote" },
        (payload) => {
          console.log("🔔 Quote UPDATE event received:", payload)
          const oldQuote = payload.old
          const newQuote = payload.new

          // Only show notifications for specific status changes
          if (oldQuote.status !== newQuote.status) {
            console.log("🔔 Quote status changed:", oldQuote.status, "->", newQuote.status)
            if (newQuote.status === "accepted") {
              toast("Quote Approved! 🎉", {
                description: `Quote "${newQuote.title || 'Untitled'}" has been approved by the customer.`,
                action: {
                  label: "View Quote",
                  onClick: () => router.push(`/quotes/${newQuote.id}`),
                },
              })
            } else if (newQuote.status === "declined") {
              toast("Quote Declined", {
                description: `Quote "${newQuote.title || 'Untitled'}" was declined by the customer.`,
                action: {
                  label: "View Quote",
                  onClick: () => router.push(`/quotes/${newQuote.id}`),
                },
              })
            }
          }
        }
      )

      // 🔔 Listen for invoice status changes (paid)
      invoicesChannel.on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "invoice" },
        (payload) => {
          console.log("🔔 Invoice UPDATE event received:", payload)
          const oldInvoice = payload.old
          const newInvoice = payload.new

          // Only show notifications for payment status changes
          if (oldInvoice.status !== newInvoice.status && newInvoice.status === "paid") {
            console.log("🔔 Invoice marked as paid:", newInvoice.number)
            toast("Invoice Paid! 💰", {
              description: `Invoice ${newInvoice.number} has been paid ($${newInvoice.amount}).`,
              action: {
                label: "View Invoice",
                onClick: () => router.push(`/invoices`),
              },
            })
          }
        }
      )

      // Test with a simple channel first to verify real-time is working
      const testChannel = supabase.channel("test-connection")
      testChannel.subscribe((status, err) => {
        console.log("🔔 Test channel status:", status)
        if (err) console.error("🔔 Test channel error:", err)
        if (status === "SUBSCRIBED") {
          console.log("🔔 Real-time connection working!")
          // Unsubscribe from test channel
          testChannel.unsubscribe()
        }
      })

      // Subscribe to all channels
      leadsChannel.subscribe((status, err) => {
        console.log("🔔 Leads channel status:", status)
        if (err) console.error("🔔 Leads channel error:", err)
      })

      quotesChannel.subscribe((status, err) => {
        console.log("🔔 Quotes channel status:", status)
        if (err) console.error("🔔 Quotes channel error:", err)
      })

      invoicesChannel.subscribe((status, err) => {
        console.log("🔔 Invoices channel status:", status)
        if (err) console.error("🔔 Invoices channel error:", err)
      })

      return () => {
        leadsChannel.unsubscribe()
        quotesChannel.unsubscribe()
        invoicesChannel.unsubscribe()
      }
    }

    subscribeRealtime().then((cleanupFn) => {
      cleanup = cleanupFn
    })

    return () => {
      if (cleanup) {
        cleanup()
      }
    }
  }, [router])

  return null // no UI, background listener only
}
