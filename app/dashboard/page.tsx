"use client"

import Link from "next/link"
import { useMemo, useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tooltip, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Users, FileText, Clock, Plus, Plane } from "lucide-react"
import { useMockStore } from "@/lib/mock/store"
import { formatTimeAgo } from "@/lib/utils/format"
import { RouteMap } from "@/components/dashboard/route-map"
import { createClient } from "@/lib/supabase/client"

/* ---------------------------------- page ---------------------------------- */
export default function DashboardPage() {
  const supabase = createClient()
  const [leadCount, setLeadCount] = useState(0)

  const refreshLeadCount = useCallback(async () => {
    const { count, error } = await supabase
      .from("lead")
      .select("*", { count: "exact", head: true })
      .in("status", ["opened", "new"])
    if (!error) setLeadCount(count ?? 0)
    else console.error("Lead count error:", error)
  }, [supabase])

  useEffect(() => {
    refreshLeadCount()
    // optional realtime updates:
    const channel = supabase
      .channel("realtime-leads-count")
      .on("postgres_changes", { event: "*", schema: "public", table: "lead" }, () => refreshLeadCount())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [refreshLeadCount, supabase])

  const { state, getMetrics, loading } = useMockStore()

  const metrics = getMetrics()

  const recentLeads = useMemo(
    () =>
      state.leads
        .filter((l) => l.status !== "deleted")
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
        .slice(0, 3),
    [state.leads],
  )

  const recentQuotes = useMemo(
    () => state.quotes.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 3),
    [state.quotes],
  )

  const pendingConversionLeads = state.leads.filter((l) => l.status === "new").length
  const quotesAwaitingAcceptance = state.quotes.filter((q) => q.status === "pending_acceptance").length
  const unpaidQuotes = state.quotes.filter((q) => q.status === "awaiting_payment").length

  const upcomingTrips = useMemo(() => {
    const now = new Date()
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    return state.quotes.filter((quote) => {
      if (quote.status !== "paid") return false

      // Check if any leg has a departure date within the next 7 days
      return quote.legs.some((leg) => {
        if (!leg.departureDate) return false
        const departureDate = new Date(leg.departureDate)
        return departureDate >= now && departureDate <= sevenDaysFromNow
      })
    }).length
  }, [state.quotes])

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "new":
        return "default"
      case "converted":
        return "secondary"
      case "pending_acceptance":
        return "outline"
      case "accepted_by_requester":
      case "accepted":
        return "default"
      case "declined":
        return "destructive"
      case "expired":
        return "secondary"
      default:
        return "outline"
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 sm:space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Welcome back!</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Loading your dashboard...</p>
        </div>

        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="col-span-1 h-full flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                <div className="h-4 bg-muted rounded animate-pulse w-16" />
                <div className="h-6 bg-muted rounded animate-pulse w-12" />
              </CardHeader>
              <CardContent className="grid grid-rows-[auto_auto] gap-1 flex-1">
                <div className="h-6 bg-muted rounded animate-pulse w-8" />
                <div className="h-3 bg-muted rounded animate-pulse w-24" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Loading skeleton for route map */}
        <Card className="h-96">
          <CardContent className="h-full flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="h-8 w-8 bg-muted rounded animate-pulse mx-auto" />
              <p className="text-muted-foreground text-sm">Loading route map...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  function MetricCard({
    title,
    icon: Icon,
    currentValue,
    description,
  }: {
    title: string
    icon: any
    currentValue: number
    description: string
  }) {
    return (
      <Card className="col-span-1 h-full flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Icon className="h-4 w-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-rows-[auto_auto] gap-1 flex-1">
          <div className="text-2xl font-bold leading-none">{currentValue}</div>
          <p className="text-xs text-muted-foreground mb-0 min-h-4 truncate">{description}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Welcome back!</h1>
        <p className="text-muted-foreground text-xs sm:text-base">Here's what's happening today.</p>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard title="Leads" icon={Users} currentValue={leadCount} description="Pending conversion to quote" />
        <MetricCard
          title="Quotes"
          icon={FileText}
          currentValue={quotesAwaitingAcceptance}
          description="Awaiting client acceptance"
        />
        <MetricCard title="Unpaid" icon={Clock} currentValue={unpaidQuotes} description="Still awaiting payment" />
        <MetricCard
          title="Upcoming"
          icon={Plane}
          currentValue={upcomingTrips}
          description="Paid trips in next 7 days"
        />
      </div>

      <RouteMap />

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
        <Card className="col-span-1 lg:col-span-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div>
                  <CardTitle className="text-base sm:text-lg">Recent Leads</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Latest customer inquiries</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 sm:space-y-4">
              {recentLeads.length > 0 ? (
                recentLeads.map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between space-x-2 sm:space-x-4">
                    <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                              <AvatarFallback className="text-xs sm:text-sm">
                                {lead.customer.name
                                  .split(" ")
                                  .map((n: string) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                          </TooltipTrigger>
                        </Tooltip>
                      </TooltipProvider>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-medium leading-none truncate">{lead.customer.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {lead.legs[0]?.origin} → {lead.legs[0]?.destination}
                          {lead.legs.length > 1 && ` +${lead.legs.length - 1} more`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant={getStatusBadgeVariant(lead.status)} className="text-xs">
                              {lead.status.replace("_", " ")}
                            </Badge>
                          </TooltipTrigger>
                        </Tooltip>
                      </TooltipProvider>
                      <p className="text-xs text-muted-foreground hidden sm:block">{formatTimeAgo(lead.createdAt)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <Users className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-semibold">No leads yet</h3>
                  <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                    Get started by adding your first lead.
                  </p>
                  <div className="mt-4 sm:mt-6">
                    <Button asChild size="sm">
                      <Link href="/leads">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Lead
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 lg:col-span-3">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <div>
                <CardTitle className="text-base sm:text-lg">Recent Quotes</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Latest quotes generated</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 sm:space-y-4">
              {recentQuotes.length > 0 ? (
                recentQuotes.map((quote) => (
                  <div key={quote.id} className="flex items-center justify-between space-x-2 sm:space-x-4">
                    <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                              <AvatarFallback className="text-xs sm:text-sm">
                                {quote.customer.name
                                  .split(" ")
                                  .map((n: string) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                          </TooltipTrigger>
                        </Tooltip>
                      </TooltipProvider>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-medium leading-none truncate">{quote.customer.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {quote.legs[0]?.origin} → {quote.legs[0]?.destination}
                          {quote.legs.length > 1 && ` +${quote.legs.length - 1} more`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant={getStatusBadgeVariant(quote.status)} className="text-xs">
                              {quote.status.replace("_", " ")}
                            </Badge>
                          </TooltipTrigger>
                        </Tooltip>
                      </TooltipProvider>
                      <p className="text-xs text-muted-foreground hidden sm:block">{formatTimeAgo(quote.createdAt)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <FileText className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-semibold">No quotes yet</h3>
                  <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                    Get started by generating your first quote.
                  </p>
                  <div className="mt-4 sm:mt-6">
                    <Button asChild size="sm">
                      <Link href="/quotes">
                        <Plus className="mr-2 h-4 w-4" />
                        Generate Quote
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
