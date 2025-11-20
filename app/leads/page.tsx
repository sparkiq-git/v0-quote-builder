"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Archive } from "lucide-react"
import { LeadTable } from "@/components/leads/lead-table"
import { ErrorBoundary } from "@/components/ui/error-boundary"
import { LeadTableSkeleton } from "@/components/leads/lead-skeletons"
import type { LeadWithEngagement } from "@/lib/types"
import { useAppHeader } from "@/components/app-header-context"

export default function LeadsPage() {
  const [leads, setLeads] = useState<LeadWithEngagement[]>([])
  const [statusFilter, setStatusFilter] = useState<"active" | "expired" | "all">("active")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sessionChecked, setSessionChecked] = useState(false)
  const router = useRouter()
  const { setContent } = useAppHeader()

  /**
   * ✅ Session check
   */
  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") return

    let authListener: any = null

    const checkSession = async () => {
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()
      if (error) {
        console.error("Session check error:", error)
        setError("Failed to check session.")
        return
      }
      if (!session) {
        router.push("/auth/sign-in")
        return
      }

      supabase.realtime.setAuth(session.access_token)
      setSessionChecked(true)

      authListener = supabase.auth.onAuthStateChange((_event: string, newSession: any) => {
        if (newSession) supabase.realtime.setAuth(newSession.access_token)
        else router.push("/auth/sign-in")
      })
    }

    checkSession()

    return () => {
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe()
      }
    }
  }, [router])

  /**
   * ✅ Fetch + realtime sync
   */
  useEffect(() => {
    if (!sessionChecked) return
    // Only run on client side
    if (typeof window === "undefined") return

    let supabase: any = null
    let channel: any = null
    let subscription: any = null
    let currentTenantId: string | null = null

    const fetchLeads = async () => {
      const { createClient } = await import("@/lib/supabase/client")
      const { getCurrentTenantIdClient } = await import("@/lib/supabase/client-member-helpers")
      supabase = createClient()
      
      // Get current tenant_id for filtering
      currentTenantId = await getCurrentTenantIdClient()
      
      // Build query with tenant filtering
      let query = supabase
        .from("lead")
        .select(`
          id,
          customer_name,
          company,
          trip_summary,
          total_pax,
          leg_count,
          status,
          created_at,
          earliest_departure,
          visibility,
          tenant_id,
          lead_tenant_engagement (status, last_viewed_at)
        `)
        .neq("status", "withdrawn")
        .order("created_at", { ascending: false })

      // Apply tenant filtering: show public leads OR leads belonging to current tenant
      if (currentTenantId) {
        query = query.or(`visibility.eq.public,tenant_id.eq.${currentTenantId}`)
      } else {
        // Fallback: only show public leads if no tenant_id
        query = query.eq("visibility", "public")
      }

      const { data, error } = await query

      if (error) {
        console.error("Fetch error:", error)
        setError("Failed to load leads.")
        return
      }

      const leadsWithView = (data || []).map(
        (l: any): LeadWithEngagement => ({
          ...l,
          status: l.lead_tenant_engagement?.[0]?.status ?? "new",
          last_viewed_at: l.lead_tenant_engagement?.[0]?.last_viewed_at ?? null,
        }),
      )

      setLeads(leadsWithView)
      setLoading(false)

      // Helper function to check if a lead should be visible to the current tenant
      const shouldShowLead = (lead: any): boolean => {
        // Filter out withdrawn leads
        if (lead.status === "withdrawn") return false
        
        // If no tenant_id available, only show public leads
        if (!currentTenantId) {
          return lead.visibility === "public"
        }
        
        // Show if lead is public OR belongs to current tenant
        return lead.visibility === "public" || lead.tenant_id === currentTenantId
      }

      // ✅ Realtime channel setup
      channel = supabase.channel("leads-realtime")

      // 🔹 Lead INSERT / UPDATE / DELETE
      channel.on("postgres_changes", { event: "*", schema: "public", table: "lead" }, (payload: any) => {
        setLeads((prev) => {
          switch (payload.eventType) {
            case "INSERT": {
              const newLead = payload.new as any
              // Check if lead should be visible to current tenant
              if (!shouldShowLead(newLead)) return prev
              // Prevent duplicates
              if (prev.some((l) => l.id === newLead.id)) return prev
              // Add lead with engagement defaults
              return [{ ...newLead, last_viewed_at: null }, ...prev]
            }
            case "UPDATE": {
              const updatedLead = payload.new as any
              const leadIndex = prev.findIndex((l) => l.id === updatedLead.id)
              
              // If lead was in the list, check if it should still be visible
              if (leadIndex >= 0) {
                if (shouldShowLead(updatedLead)) {
                  // Update the lead
                  return prev.map((lead) => (lead.id === updatedLead.id ? { ...lead, ...updatedLead } : lead))
                } else {
                  // Lead no longer matches filter criteria, remove it
                  return prev.filter((lead) => lead.id !== updatedLead.id)
                }
              } else {
                // Lead wasn't in the list, check if it should be added now
                if (shouldShowLead(updatedLead)) {
                  return [{ ...updatedLead, last_viewed_at: null }, ...prev]
                }
                return prev
              }
            }
            case "DELETE": {
              // Only remove if it exists in the list (which means it was visible)
              return prev.filter((lead) => lead.id !== payload.old.id)
            }
            default:
              return prev
          }
        })
      })

      // 🔹 Engagement last_viewed_at update
      channel.on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "lead_tenant_engagement" },
        (payload: any) => {
          const leadId = payload.new.lead_id
          const engagementTenantId = payload.new.tenant_id
          const lastViewed = payload.new.last_viewed_at
          
          if (!leadId) return
          
          // Only update if the engagement belongs to the current tenant
          if (currentTenantId && engagementTenantId !== currentTenantId) {
            return
          }
          
          // Only update if the lead exists in the current leads array (already filtered)
          setLeads((prev) => {
            const leadExists = prev.some((lead) => lead.id === leadId)
            if (!leadExists) return prev
            return prev.map((lead) => (lead.id === leadId ? { ...lead, last_viewed_at: lastViewed } : lead))
          })
        },
      )

      subscription = channel.subscribe((status: string) => console.log("Realtime subscription status:", status))
    }

    fetchLeads()

    return () => {
      // ✅ Proper cleanup for Next.js hot reloads
      if (supabase && channel) {
        supabase.removeChannel(channel)
      }
      if (subscription) {
        subscription.unsubscribe?.()
      }
    }
  }, [sessionChecked])

  /**
   * ✅ Memoized filtering logic for better performance
   */
  const filteredLeads = useMemo(() => {
    switch (statusFilter) {
      case "active":
        return leads.filter((l) => ["active", "new", "opened"].includes(l.status))
      case "expired":
        return leads.filter((l) => l.status === "expired")
      default:
        return leads
    }
  }, [leads, statusFilter])

  /**
   * ✅ Memoized counts calculation
   */
  const leadCounts = useMemo(() => {
    const activeCount = leads.filter((l) => ["active", "new", "opened"].includes(l.status)).length
    const expiredCount = leads.filter((l) => l.status === "expired").length
    return { activeCount, expiredCount }
  }, [leads])

  const { activeCount, expiredCount } = leadCounts

  useEffect(() => {
    setContent({
      title: "Leads",
      subtitle: "Track and manage customer inquiries in real time.",
      actions: (
        <Select value={statusFilter} onValueChange={(v: "active" | "expired" | "all") => setStatusFilter(v)}>
          <SelectTrigger className="w-[180px]">
            <Archive className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active ({activeCount})</SelectItem>
            <SelectItem value="expired">Expired ({expiredCount})</SelectItem>
            <SelectItem value="all">All Leads</SelectItem>
          </SelectContent>
        </Select>
      ),
    })

    return () => {
      setContent({})
    }
  }, [setContent, statusFilter, activeCount, expiredCount])

  if (error) return <div className="p-8 text-red-600">Error: {error}</div>
  if (loading)
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <LeadTableSkeleton />
          </CardContent>
        </Card>
      </div>
    )

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <ErrorBoundary>
            <LeadTable data={filteredLeads} setLeads={setLeads} />
          </ErrorBoundary>
        </CardContent>
      </Card>
    </div>
  )
}
