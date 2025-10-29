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
    
    // Preload the sound
    soundRef.current = new Audio("/notify.mp3")

    let cleanup: (() => void) | undefined

    const subscribeRealtime = async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      
      supabase.realtime.setAuth(session.access_token)
      
      // Get tenantId from user metadata
      const tenantId = session.user?.app_metadata?.tenant_id

      // Create separate channels for each table to avoid conflicts
      const leadsChannel = supabase.channel("leads-listener")
      const quotesChannel = supabase.channel("quotes-listener")
      const invoicesChannel = supabase.channel("invoices-listener")

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

      // 🔔 Listen for new leads
      leadsChannel.on(
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

      // 🔔 Listen for quote status changes (approved/declined)
      quotesChannel.on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "quote" },
        (payload) => {
          const oldQuote = payload.old
          const newQuote = payload.new

          // Only show notifications for specific status changes
          if (oldQuote.status !== newQuote.status) {
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
          const oldInvoice = payload.old
          const newInvoice = payload.new

          // Only show notifications for payment status changes
          if (oldInvoice.status !== newInvoice.status && newInvoice.status === "paid") {
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

      // Subscribe to all channels
      leadsChannel.subscribe()
      quotesChannel.subscribe()
      invoicesChannel.subscribe()

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
