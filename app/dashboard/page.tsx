"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Users, FileText, Eye, TrendingUp, Clock, ArrowRight, Plus, Activity } from "lucide-react"
import { useMockStore } from "@/lib/mock/store"
import { formatTimeAgo, formatCurrency } from "@/lib/utils/format"

export default function DashboardPage() {
  const { state, getMetrics } = useMockStore()
  const metrics = getMetrics()

  // Get recent activity
  const recentLeads = state.leads
    .filter((lead) => lead.status !== "deleted")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3)

  const recentQuotes = state.quotes
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3)

  const recentEvents = state.events
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5)

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "new":
        return "default"
      case "converted":
        return "secondary"
      case "pending_acceptance":
        return "outline"
      case "accepted_by_requester":
        return "default"
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

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's what's happening with your charter business today.</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads Today</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.leadsToday}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              New inquiries received
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quotes Pending</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.quotesPending}</div>
            <p className="text-xs text-muted-foreground">
              <Clock className="inline h-3 w-3 mr-1" />
              Awaiting customer response
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Views This Week</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.viewsThisWeek}</div>
            <p className="text-xs text-muted-foreground">
              <Activity className="inline h-3 w-3 mr-1" />
              Quote page visits
            </p>
          </CardContent>
        </Card>

        
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Recent Leads */}
        <Card className="col-span-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Leads</CardTitle>
                <CardDescription>Latest customer inquiries</CardDescription>
              </div>
              <Button asChild size="sm">
                <Link href="/leads">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentLeads.length > 0 ? (
                recentLeads.map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between space-x-4">
                    <div className="flex items-center space-x-4">
                      <Avatar>
                        <AvatarFallback>
                          {lead.customer.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium leading-none">{lead.customer.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {lead.legs[0]?.origin} → {lead.legs[0]?.destination}
                          {lead.legs.length > 1 && ` +${lead.legs.length - 1} more`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={getStatusBadgeVariant(lead.status)}>{lead.status.replace("_", " ")}</Badge>
                      <p className="text-sm text-muted-foreground">{formatTimeAgo(lead.createdAt)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-semibold">No leads yet</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Get started by adding your first lead.</p>
                  <div className="mt-6">
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

        {/* Recent Activity */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest system events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentEvents.length > 0 ? (
                recentEvents.map((event) => {
                  const quote = event.quoteId ? state.quotes.find((q) => q.id === event.quoteId) : null
                  const lead = event.leadId ? state.leads.find((l) => l.id === event.leadId) : null

                  let description = ""
                  let icon = <Activity className="h-4 w-4" />

                  switch (event.type) {
                    case "quote_viewed":
                      description = quote ? `Quote viewed by ${quote.customer.name}` : "Quote viewed"
                      icon = <Eye className="h-4 w-4" />
                      break
                    case "option_selected":
                      description = quote ? `Option selected by ${quote.customer.name}` : "Option selected"
                      icon = <FileText className="h-4 w-4" />
                      break
                    case "lead_created":
                      description = lead ? `New lead from ${lead.customer.name}` : "New lead created"
                      icon = <Users className="h-4 w-4" />
                      break
                  }

                  return (
                    <div key={event.id} className="flex items-center space-x-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">{icon}</div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">{description}</p>
                        <p className="text-sm text-muted-foreground">{formatTimeAgo(event.timestamp)}</p>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-6">
                  <Activity className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-semibold">No activity yet</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Activity will appear here as you use the system.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks to get you started</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/leads">
                <Users className="mr-2 h-4 w-4" />
                View All Leads
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/quotes">
                <FileText className="mr-2 h-4 w-4" />
                Manage Quotes
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/aircraft">
                <Plus className="mr-2 h-4 w-4" />
                Add Aircraft
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
