"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Users, Archive } from "lucide-react"
import { LeadTable } from "@/components/leads/lead-table"
import { createClient } from "@/lib/supabase/client"
import type { Lead } from "@/lib/types"

export default function LeadsPage() {
  const [leads, setLeads] = useState<(Lead & { last_viewed_at?: string | null })[]>([])
  const [statusFilter, setStatusFilter] = useState<"active" | "expired" | "all">("active")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sessionChecked, setSessionChecked] = useState(false)
  const router = useRouter()

  /**
   * ✅ Session check
   */
  useEffect(() => {
    const supabase = createClient()

    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) {
        console.error("Session check error:", error)
        setError("Failed to check session.")
        return
      }
      if (!session) {
        router.push("/sign-in")
        return
      }

      supabase.realtime.setAuth(session.access_token)
      setSessionChecked(true)
    }

    checkSession()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (newSession) supabase.realtime.setAuth(newSession.access_token)
      else router.push("/sign-in")
    })

    return () => authListener.subscription.unsubscribe()
  }, [router])

  /**
   * ✅ Fetch + realtime sync
   */
  useEffect(() => {
    if (!sessionChecked) return
    const supabase = createClient()

    const fetchLeads = async () => {
      const { data, error } = await supabase
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
          lead_tenant_engagement (status, last_viewed_at)
        `)
        .neq("status", "withdrawn")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Fetch error:", error)
        setError("Failed to load leads.")
        return
      }

const leadsWithView = (data || []).map((l: any) => ({
  ...l,
  status: l.lead_tenant_engagement?.[0]?.status ?? "new",
  last_viewed_at: l.lead_tenant_engagement?.[0]?.last_viewed_at ?? null,
}))


      setLeads(leadsWithView)
      setLoading(false)
    }

    fetchLeads()

    // ✅ Realtime channel setup
    const channel = supabase.channel("leads-realtime")

    // 🔹 Lead INSERT / UPDATE / DELETE
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "lead" },
      (payload) => {
        setLeads((prev) => {
          switch (payload.eventType) {
            case "INSERT":
              // prevent duplicates
              if (prev.some((l) => l.id === payload.new.id)) return prev
              return [{ ...payload.new, last_viewed_at: null }, ...prev]
            case "UPDATE":
              return prev.map((lead) =>
                lead.id === payload.new.id
                  ? { ...lead, ...payload.new }
                  : lead
              )
            case "DELETE":
              return prev.filter((lead) => lead.id !== payload.old.id)
            default:
              return prev
          }
        })
      }
    )

    // 🔹 Engagement last_viewed_at update
    channel.on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "lead_tenant_engagement" },
      (payload) => {
        const leadId = payload.new.lead_id
        const lastViewed = payload.new.last_viewed_at
        if (!leadId) return
        setLeads((prev) =>
          prev.map((lead) =>
            lead.id === leadId ? { ...lead, last_viewed_at: lastViewed } : lead
          )
        )
      }
    )

    const subscription = channel.subscribe((status) =>
      console.log("Realtime subscription status:", status)
    )

    return () => {
      // ✅ Proper cleanup for Next.js hot reloads
      supabase.removeChannel(channel)
      subscription.unsubscribe?.()
    }
  }, [sessionChecked])

  /**
   * ✅ Filtering logic
   */
  const getFilteredLeads = () => {
    switch (statusFilter) {
      case "active":
        return leads.filter((l) => ["active", "new", "opened"].includes(l.status))
      case "expired":
        return leads.filter((l) => l.status === "expired")
      default:
        return leads
    }
  }

  const filteredLeads = getFilteredLeads()
  const activeCount = leads.filter((l) => ["active", "new", "opened"].includes(l.status)).length
  const expiredCount = leads.filter((l) => l.status === "expired").length

  if (error) return <div className="p-8 text-red-600">Error: {error}</div>
  if (loading) return <div className="p-8 text-muted-foreground">Loading leads...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground">Track and manage customer inquiries in real time.</p>
        </div>

        <div className="flex items-center gap-4">
          <Select
            value={statusFilter}
            onValueChange={(v: "active" | "expired" | "all") => setStatusFilter(v)}
          >
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

          <Button onClick={() => router.push("/leads/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Add Lead
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leads ({filteredLeads.length})</CardTitle>
          <CardDescription>
            Showing {statusFilter === "all" ? "all" : statusFilter} leads (auto-updates in real time).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LeadTable data={filteredLeads} setLeads={setLeads} />
        </CardContent>
      </Card>
    </div>
  )
}
