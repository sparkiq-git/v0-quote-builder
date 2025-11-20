"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import type { Lead } from "@/lib/types"
import type { Session } from "@supabase/supabase-js"

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
    if (typeof window === "undefined") return

    let active = true
    let cleanupChannels: (() => void) | null = null
    let authSubscription: { unsubscribe: () => void } | null = null
    let supabaseClientPromise: Promise<typeof import("@/lib/supabase/client") | null> | null = null

    const ensureSupabaseClient = async () => {
      if (!supabaseClientPromise) {
        supabaseClientPromise = import("@/lib/supabase/client").catch((error) => {
          console.error("[LeadListener] Failed to load Supabase client", error)
          return null
        })
      }
      return supabaseClientPromise
    }

    const preloadSound = () => {
      if (!soundRef.current) {
        soundRef.current = new Audio("/notify.mp3")
        soundRef.current.load?.()
      }
    }

    const playSound = () => {
      soundRef.current?.play().catch(() => {
        // Ignore autoplay errors
      })
    }

    const flushLeads = debounce(() => {
      if (!pendingLeads.current.length) return

      const count = pendingLeads.current.length
      const firstLead = pendingLeads.current[0]
      const label = count === 1 ? `New Lead: ${firstLead.customer_name || "Unnamed"}` : `${count} New Leads`
      const description =
        count === 1 ? firstLead.trip_summary || "No trip summary provided." : "Multiple new leads received."

      toast(label, {
        description,
        action: {
          label: "View",
          onClick: () => router.push("/leads"),
        },
      })

      playSound()
      pendingLeads.current = []
    }, 1000)

    const teardownChannels = () => {
      if (cleanupChannels) {
        cleanupChannels()
        cleanupChannels = null
      }
    }

    const setupRealtime = async (session: Session) => {
      const module = await ensureSupabaseClient()
      if (!module || !active) return

      const supabase = module.createClient()
      supabase.realtime.setAuth(session.access_token)

      const tenantId =
        session.user?.app_metadata?.tenant_id ??
        session.user?.user_metadata?.tenant_id ??
        session.user?.app_metadata?.tenant ??
        null

      const leadsChannel = supabase.channel("leads-listener")
      const quotesChannel = supabase.channel("quotes-listener")
      const invoicesChannel = supabase.channel("invoices-listener")

      leadsChannel.on("postgres_changes", { event: "INSERT", schema: "public", table: "lead" }, (payload) => {
        const newLead = payload.new as Lead
        if (tenantId && newLead.tenant_id !== tenantId) return
        pendingLeads.current.push(newLead)
        flushLeads()
      })

      quotesChannel.on("postgres_changes", { event: "UPDATE", schema: "public", table: "quote" }, (payload) => {
        const oldQuote = payload.old
        const newQuote = payload.new
        if (oldQuote.status === newQuote.status) return

        if (newQuote.status === "accepted") {
          toast("Quote Approved! 🎉", {
            description: `Quote "${newQuote.title || "Untitled"}" has been approved by the customer.`,
            action: {
              label: "View Quote",
              onClick: () => router.push(`/quotes/${newQuote.id}`),
            },
          })
          playSound()
        } else if (newQuote.status === "declined") {
          toast("Quote Declined", {
            description: `Quote "${newQuote.title || "Untitled"}" was declined by the customer.`,
            action: {
              label: "View Quote",
              onClick: () => router.push(`/quotes/${newQuote.id}`),
            },
          })
        }
      })

      invoicesChannel.on("postgres_changes", { event: "UPDATE", schema: "public", table: "invoice" }, (payload) => {
        const oldInvoice = payload.old
        const newInvoice = payload.new
        if (oldInvoice.status === newInvoice.status || newInvoice.status !== "paid") return

        toast("Invoice Paid! 💰", {
          description: `Invoice ${newInvoice.number} has been paid ($${newInvoice.amount}).`,
          action: {
            label: "View Invoice",
            onClick: () => router.push(`/invoices`),
          },
        })
        playSound()
      })

      await Promise.all([leadsChannel.subscribe(), quotesChannel.subscribe(), invoicesChannel.subscribe()])

      cleanupChannels = () => {
        supabase.removeChannel(leadsChannel)
        supabase.removeChannel(quotesChannel)
        supabase.removeChannel(invoicesChannel)
      }
    }

    const initialise = async () => {
      const module = await ensureSupabaseClient()
      if (!module || !active) return
      const supabase = module.createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session) {
        preloadSound()
        await setupRealtime(session)
      }

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
        teardownChannels()
        if (!nextSession) {
          pendingLeads.current = []
          return
        }
        preloadSound()
        await setupRealtime(nextSession)
      })
      authSubscription = subscription
    }

    initialise()

    return () => {
      active = false
      teardownChannels()
      authSubscription?.unsubscribe()
      soundRef.current?.pause?.()
      soundRef.current = null
    }
  }, [router])

  return null // no UI, background listener only
}
