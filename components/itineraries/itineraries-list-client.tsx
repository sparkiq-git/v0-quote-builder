"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { ItineraryStatusBadge } from "./itinerary-status-badge"
import { useAppHeader } from "@/components/app-header-context"
import {
  Plus,
  Search,
  Eye,
  MapPin,
  Calendar,
  Users,
  Plane,
  Contact,
} from "lucide-react"
import { formatDate } from "@/lib/utils/format"

interface Itinerary {
  id: string
  quote_id: string
  invoice_id: string | null
  contact_id: string
  lead_id: string | null
  tenant_id: string
  status: string
  title: string | null
  trip_summary: string | null
  trip_type: string | null
  leg_count: number
  total_pax: number
  domestic_trip: boolean | null
  asap: boolean | null
  aircraft_id: string | null
  aircraft_tail_id: string | null
  aircraft_tail_no: string | null
  earliest_departure: string | null
  latest_return: string | null
  created_at: string
  updated_at: string
  contact?: {
    id: string
    full_name: string
    email: string
    company: string | null
  }
  quote?: {
    id: string
    title: string | null
    contact_name: string | null
    contact_email: string | null
  }
}

export function ItinerariesListClient() {
  const [itineraries, setItineraries] = useState<Itinerary[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const { toast } = useToast()
  const { setContent } = useAppHeader()

  useEffect(() => {
    setContent({
      title: "Itineraries",
      subtitle: "Manage trip itineraries and travel details",
      actions: null,
    })
  }, [setContent])

  const fetchItineraries = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.append("search", searchQuery)
      if (statusFilter !== "all") params.append("status", statusFilter)

      const response = await fetch(`/api/itineraries?${params.toString()}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("Failed to fetch itineraries:", response.status, errorData)
        throw new Error(errorData.error || "Failed to fetch itineraries")
      }

      const { data } = await response.json()
      console.log(`[ITINERARIES CLIENT] Received ${data?.length || 0} itineraries`)
      setItineraries(data || [])
    } catch (error: any) {
      console.error("Error fetching itineraries:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load itineraries",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItineraries()
  }, [searchQuery, statusFilter])

  const filteredItineraries = itineraries.filter((itinerary) => {
    if (statusFilter !== "all" && itinerary.status !== statusFilter) return false
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Itineraries</h1>
          <p className="text-muted-foreground">
            Manage trip itineraries created from accepted quotes
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Itinerary Directory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title, trip summary, or contact name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="trip_confirmed">Trip Confirmed</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title/Summary</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Trip Details</TableHead>
                <TableHead>Aircraft</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[50px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Loading itineraries...
                  </TableCell>
                </TableRow>
              ) : filteredItineraries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    {searchQuery || statusFilter !== "all"
                      ? "No itineraries found matching your filters"
                      : "No itineraries yet. They will be created automatically when quotes are accepted."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredItineraries.map((itinerary) => (
                  <TableRow key={itinerary.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {itinerary.title || itinerary.trip_summary || "Untitled Itinerary"}
                        </div>
                        {itinerary.trip_summary && itinerary.title && (
                          <div className="text-sm text-muted-foreground truncate max-w-md">
                            {itinerary.trip_summary}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {itinerary.contact ? (
                        <div className="flex items-center gap-2">
                          <Contact className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{itinerary.contact.full_name}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span>{itinerary.leg_count} leg{itinerary.leg_count !== 1 ? "s" : ""}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span>{itinerary.total_pax} pax</span>
                        </div>
                        {itinerary.trip_type && (
                          <Badge variant="outline" className="text-xs">
                            {itinerary.trip_type}
                          </Badge>
                        )}
                        {itinerary.asap && (
                          <Badge variant="destructive" className="text-xs">
                            ASAP
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {itinerary.aircraft_tail_no ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Plane className="h-3 w-3 text-muted-foreground" />
                          <span>{itinerary.aircraft_tail_no}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {itinerary.earliest_departure ? (
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(itinerary.earliest_departure)}</span>
                          </div>
                          {itinerary.latest_return && itinerary.latest_return !== itinerary.earliest_departure && (
                            <div className="text-xs text-muted-foreground">
                              to {formatDate(itinerary.latest_return)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <ItineraryStatusBadge status={itinerary.status} />
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(itinerary.created_at)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/itineraries/${itinerary.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

