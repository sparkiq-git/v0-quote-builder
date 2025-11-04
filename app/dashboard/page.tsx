"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, FileText, Clock, Plane, Mail, Phone, Calendar } from "lucide-react"
import { RouteMap } from "@/components/dashboard/route-map"
import DashboardMetrics from "@/components/dashboard/DashboardMetrics"
import { RecentActivities } from "@/components/dashboard/recent-activities"
import { Badge } from "@/components/ui/badge"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

export default function DashboardPage() {
  const [leadCount, setLeadCount] = useState(0)
  const [quotesAwaitingResponse, setQuotesAwaitingResponse] = useState(0)
  const [unpaidQuotes, setUnpaidQuotes] = useState(0)
  const [upcomingDepartures, setUpcomingDepartures] = useState(0)
  const [isClient, setIsClient] = useState(false)
  const [todayLeads, setTodayLeads] = useState<any[]>([])
  const [todayQuotes, setTodayQuotes] = useState<any[]>([])
  const [chartData, setChartData] = useState<any[]>([])

  useEffect(() => setIsClient(true), [])

  // === Load Lead Count ===
  useEffect(() => {
    if (!isClient) return
    let cancelled = false

    const loadLeadCount = async () => {
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()

      const { count, error } = await supabase
        .from("lead")
        .select("*", { count: "exact", head: true })
        .in("status", ["opened", "new"])

      if (!cancelled) {
        if (error) {
          console.error("Lead count error:", error)
          setLeadCount(0)
        } else {
          setLeadCount(count ?? 0)
        }
      }
    }

    loadLeadCount()
    const id = setInterval(loadLeadCount, 15000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [isClient])

  // === Load Metrics ===
  useEffect(() => {
    if (!isClient) return
    let cancelled = false

    const loadMetrics = async () => {
      try {
        const res = await fetch("/api/metrics", { cache: "no-store" })
        if (!res.ok) throw new Error(`metrics ${res.status}`)
        const j = await res.json()
        if (cancelled) return
        setQuotesAwaitingResponse(j.quotesAwaitingResponse ?? 0)
        setUnpaidQuotes(j.unpaidQuotes ?? 0)
        setUpcomingDepartures(j.upcomingDepartures ?? 0)
      } catch (e) {
        if (!cancelled) console.error("Failed to load metrics:", e)
      }
    }

    loadMetrics()
    const id = setInterval(loadMetrics, 15000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [isClient])

  // === Load today's NEW Leads and DRAFT Quotes ===
  useEffect(() => {
    if (!isClient) return

    const loadTodayData = async () => {
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()

      const start = new Date()
      start.setHours(0, 0, 0, 0)
      const end = new Date()
      end.setHours(23, 59, 59, 999)

      try {
        const [{ data: leads }, { data: quotes }] = await Promise.all([
          supabase
            .from("lead")
            .select(`
              id,
              customer_name,
              customer_email,
              customer_phone,
              status,
              trip_type,
              trip_summary,
              earliest_departure,
              created_at
            `)
            .in("status", ["opened", "new"])
            .gte("created_at", start.toISOString())
            .lte("created_at", end.toISOString())
            .order("created_at", { ascending: false }),

          supabase
            .from("quote")
            .select(`
              id,
              contact_name,
              status,
              created_at,
              title,
              trip_summary,
              trip_type,
              total_pax
            `)
            .in("status", ["opened", "awaiting response"])
            .gte("created_at", start.toISOString())
            .lte("created_at", end.toISOString())
            .order("created_at", { ascending: false }),
        ])

        setTodayLeads(leads ?? [])
        setTodayQuotes(quotes ?? [])
      } catch (error) {
        console.error("Error loading today's data:", error)
      }
    }

    loadTodayData()
  }, [isClient])

  // === Load Yearly Chart Data (Filtered by Quote Status) ===
  useEffect(() => {
    if (!isClient) return

    const loadChartData = async () => {
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()

      const currentYear = new Date().getFullYear()
      const startOfYear = new Date(currentYear, 0, 1).toISOString()
      const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59).toISOString()

      // Step 1: Get IDs of quotes with allowed statuses
      const allowedStatuses = ["accepted", "invoiced", "paid", "pending_approval"]
      const { data: quotes, error: quoteError } = await supabase
        .from("quote")
        .select("id")
        .in("status", allowedStatuses)

      if (quoteError) {
        console.error("Error loading quotes:", quoteError)
        return
      }

      const quoteIds = quotes?.map((q) => q.id) ?? []
      if (quoteIds.length === 0) {
        setChartData([])
        return
      }

      // Step 2: Get related quote_options
      const { data, error } = await supabase
        .from("quote_option")
        .select("created_at, cost_operator, price_commission, quote_id")
        .in("quote_id", quoteIds)
        .gte("created_at", startOfYear)
        .lte("created_at", endOfYear)

      if (error) {
        console.error("Error loading chart data:", error)
        return
      }

      // Step 3: Aggregate monthly data
      const monthlyData = Array.from({ length: 12 }, (_, i) => ({
        month: new Date(0, i).toLocaleString("default", { month: "short" }),
        cost_operator: 0,
        price_commission: 0,
      }))

      data?.forEach((row) => {
        const monthIndex = new Date(row.created_at).getMonth()
        monthlyData[monthIndex].cost_operator += row.cost_operator || 0
        monthlyData[monthIndex].price_commission += row.price_commission || 0
      })

      setChartData(monthlyData)
    }

    loadChartData()
  }, [isClient])

  // === Metric Card Component ===
  function MetricCard({
    title,
    icon: Icon,
    currentValue,
    description,
  }: {
    title: string
    icon: any
    currentValue: number | string
    description: string
  }) {
    return (
      <Card className="col-span-1 h-full flex flex-col hover:shadow-lg transition-all duration-200 border border-border bg-card rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 pt-6 px-6">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-rows-[auto_auto] gap-2 flex-1 px-6 pb-6">
          <div className="text-3xl font-bold leading-none text-foreground tracking-tight">{currentValue}</div>
          <p className="text-xs text-muted-foreground leading-relaxed min-h-4 truncate">{description}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Welcome back!</h1>
        <p className="text-muted-foreground text-base leading-relaxed">Here's what's happening today.</p>
      </div>

      {/* === Top Metric Cards === */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Leads" icon={Users} currentValue={leadCount} description="Pending conversion to quote" />
        <MetricCard
          title="Quotes"
          icon={FileText}
          currentValue={quotesAwaitingResponse}
          description="Awaiting client response"
        />
        <MetricCard title="Unpaid" icon={Clock} currentValue={unpaidQuotes} description="Awaiting payment" />
        <MetricCard
          title="Upcoming Trips"
          icon={Plane}
          currentValue={upcomingDepartures}
          description="Departures in next 7 days"
        />
      </div>

      {/* === Monthly Metrics === */}
      <DashboardMetrics />

      {/* === Chart + Recent Activities === */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Card */}
        <Card className="border border-border shadow-sm rounded-xl bg-card hover:shadow-md transition-shadow lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">
              Cost & Commission (Yearly)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="cost_operator" fill="#60a5fa" name="Cost Operator" />
                <Bar dataKey="price_commission" fill="#fbbf24" name="Price Commission" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <div className="lg:col-span-2">
          <RecentActivities />
        </div>
      </div>

      {/* === Today's New Leads and Draft Quotes === */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Leads */}
        <Card className="border border-border shadow-sm rounded-xl flex flex-col bg-card hover:shadow-md transition-shadow">
          <CardHeader className="px-6 pt-6 pb-4">
            <CardTitle className="text-lg font-semibold text-foreground">Today's New Leads</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 px-6 pb-6 space-y-4 overflow-y-auto max-h-[400px]">
            {todayLeads.length === 0 ? (
              <p className="text-sm text-muted-foreground leading-relaxed">No new leads today.</p>
            ) : (
              todayLeads.map((lead) => (
                <div key={lead.id} className="flex flex-col border-b border-border pb-4 last:border-none">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-sm text-foreground">{lead.customer_name}</p>
                    <Badge variant="secondary" className="text-[10px] uppercase font-medium">
                      {lead.status}
                    </Badge>
                  </div>

                  {lead.customer_email && (
                    <p className="text-xs text-muted-foreground flex items-center gap-2 mt-1 leading-relaxed">
                      <Mail className="w-3 h-3" /> {lead.customer_email}
                    </p>
                  )}

                  {lead.customer_phone && (
                    <p className="text-xs text-muted-foreground flex items-center gap-2 leading-relaxed">
                      <Phone className="w-3 h-3" /> {lead.customer_phone}
                    </p>
                  )}

                  {lead.trip_summary && (
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                      <span className="font-semibold text-foreground">Route:</span> {lead.trip_summary}
                    </p>
                  )}

                  {lead.trip_type && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      <span className="font-semibold text-foreground">Trip Type:</span> {lead.trip_type}
                    </p>
                  )}

                  {lead.earliest_departure && (
                    <p className="text-xs text-muted-foreground flex items-center gap-2 leading-relaxed">
                      <Calendar className="w-3 h-3" />{" "}
                      {new Date(lead.earliest_departure).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  )}

                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    Created at:{" "}
                    {new Date(lead.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Quotes */}
        <Card className="border border-border shadow-sm rounded-xl flex flex-col bg-card hover:shadow-md transition-shadow">
          <CardHeader className="px-6 pt-6 pb-4">
            <CardTitle className="text-lg font-semibold text-foreground">Today's New Quotes</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 px-6 pb-6 space-y-4 overflow-y-auto max-h-[400px]">
            {todayQuotes.length === 0 ? (
              <p className="text-sm text-muted-foreground leading-relaxed">No draft quotes today.</p>
            ) : (
              todayQuotes.map((quote) => (
                <div key={quote.id} className="flex flex-col border-b border-border pb-3 last:border-none">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-sm text-foreground">
                      {quote.title || `Quote ${quote.id.slice(0, 6)}`} — {quote.contact_name}
                    </p>
                    <Badge variant="secondary" className="text-[10px] uppercase font-medium">
                      {quote.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {quote.trip_summary || "No trip summary"}
                  </div>
                  <div className="text-xs text-muted-foreground flex justify-between mt-2 leading-relaxed">
                    <span>
                      Pax: {quote.total_pax ?? "—"} | {quote.trip_type ?? "one-way"}
                    </span>
                    <span>
                      {new Date(quote.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* === RouteMap === */}
      <div className="w-full h-[500px] relative">
        <RouteMap />
      </div>
    </div>
  )
}
