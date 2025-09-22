"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Calendar, Search, Filter, X, Eye, ExternalLink, Plane, Clock, MapPin } from "lucide-react"
import { useMockStore } from "@/lib/mock/store"
import { formatDate, formatTimeAgo } from "@/lib/utils/format"

export default function ItinerariesPage() {
  const { state, loading } = useMockStore()
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [dateFilter, setDateFilter] = useState<string>("all")

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Itineraries</h1>
            <p className="text-muted-foreground">Manage and view trip itineraries</p>
          </div>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading itineraries...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "confirmed":
        return "default"
      case "pending":
        return "secondary"
      case "cancelled":
        return "destructive"
      case "completed":
        return "outline"
      default:
        return "outline"
    }
  }

  const filteredItineraries = (state.itineraries || []).filter((itinerary) => {
    if (statusFilter !== "all" && itinerary.status !== statusFilter) {
      return false
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesName = itinerary.customer.name.toLowerCase().includes(query)
      const matchesCompany = itinerary.customer.company.toLowerCase().includes(query)
      const matchesTripName = itinerary.tripName.toLowerCase().includes(query)
      if (!matchesName && !matchesCompany && !matchesTripName) {
        return false
      }
    }

    if (dateFilter !== "all") {
      const itineraryDate = new Date(itinerary.createdAt)
      const now = new Date()
      const daysDiff = Math.floor((now.getTime() - itineraryDate.getTime()) / (1000 * 60 * 60 * 24))

      switch (dateFilter) {
        case "today":
          if (daysDiff > 0) return false
          break
        case "week":
          if (daysDiff > 7) return false
          break
        case "month":
          if (daysDiff > 30) return false
          break
      }
    }

    return true
  })

  const statusOptions = [
    { value: "all", label: "All Statuses" },
    { value: "confirmed", label: "Confirmed" },
    { value: "pending", label: "Pending" },
    { value: "cancelled", label: "Cancelled" },
    { value: "completed", label: "Completed" },
  ]

  const dateOptions = [
    { value: "all", label: "All Time" },
    { value: "today", label: "Today" },
    { value: "week", label: "This Week" },
    { value: "month", label: "This Month" },
  ]

  const clearFilters = () => {
    setSearchQuery("")
    setStatusFilter("all")
    setDateFilter("all")
  }

  const hasActiveFilters = searchQuery || statusFilter !== "all" || dateFilter !== "all"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Itineraries</h1>
          <p className="text-muted-foreground">Manage and view trip itineraries</p>
        </div>
      </div>

      {filteredItineraries.length > 0 || hasActiveFilters ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Itineraries</CardTitle>
                <CardDescription>View and manage customer trip itineraries</CardDescription>
              </div>
            </div>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by customer name, company, or trip name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Filters:</span>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Date" />
                  </SelectTrigger>
                  <SelectContent>
                    {dateOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {hasActiveFilters && (
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    <X className="mr-2 h-4 w-4" />
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Trip</TableHead>
                  <TableHead>Aircraft</TableHead>
                  <TableHead>Departure</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItineraries.map((itinerary) => (
                  <TableRow key={itinerary.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {itinerary.customer.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{itinerary.customer.name}</div>
                          <div className="text-sm text-muted-foreground">{itinerary.customer.company}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{itinerary.tripName}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {itinerary.segments[0]?.origin} →{" "}
                          {itinerary.segments[itinerary.segments.length - 1]?.destination}
                          {itinerary.segments.length > 1 && ` (+${itinerary.segments.length - 1} stops)`}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Plane className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{itinerary.aircraft.model.name}</div>
                          {itinerary.aircraft.tail && (
                            <div className="text-sm text-muted-foreground">{itinerary.aircraft.tail.tailNumber}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{formatDate(itinerary.segments[0]?.departureDate || "")}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {itinerary.segments[0]?.departureTime}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(itinerary.status)}>{itinerary.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{formatDate(itinerary.createdAt)}</div>
                        <div className="text-muted-foreground">{formatTimeAgo(itinerary.createdAt)}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/itineraries/${itinerary.publicHash}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </Link>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/itineraries/${itinerary.publicHash}`} target="_blank">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Share
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredItineraries.length === 0 && hasActiveFilters && (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No itineraries found</h3>
                <p className="text-muted-foreground mb-4">
                  No itineraries match your current search and filter criteria. Try adjusting your filters or search
                  terms.
                </p>
                <Button variant="outline" onClick={clearFilters}>
                  <X className="mr-2 h-4 w-4" />
                  Clear All Filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No itineraries yet</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Itineraries are automatically created when quotes are marked as paid. Complete a quote to see your first
              itinerary here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
