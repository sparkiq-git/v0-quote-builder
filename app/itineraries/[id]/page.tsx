"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  Loader2,
  Calendar,
  Users,
  Plane,
  MapPin,
  Contact,
  FileText,
  ArrowLeft,
  Edit,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate } from "@/lib/utils/format"
import { ItineraryStatusBadge } from "@/components/itineraries/itinerary-status-badge"
import { EditItineraryDialog } from "@/components/itineraries/edit-itinerary-dialog"
import { useToast } from "@/hooks/use-toast"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ItineraryDetail {
  id: string
  origin: string | null
  origin_code: string | null
  destination: string | null
  destination_code: string | null
  depart_dt: string | null
  depart_time: string | null
  arrive_dt: string | null
  arrive_time: string | null
  pax_count: number | null
  notes: string | null
  seq: number
}

interface Itinerary {
  id: string
  quote_id: string
  invoice_id: string | null
  contact_id: string
  status: string
  title: string | null
  trip_summary: string | null
  trip_type: string | null
  leg_count: number
  total_pax: number
  domestic_trip: boolean | null
  asap: boolean | null
  aircraft_tail_no: string | null
  earliest_departure: string | null
  latest_return: string | null
  notes: string | null
  special_requirements: string | null
  currency: string | null
  created_at: string
  details: ItineraryDetail[]
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
  }
  invoice?: {
    id: string
    number: string
    status: string
    amount: number
    currency: string
  }
}

export default function ItineraryDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [itinerary, setItinerary] = useState<Itinerary | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)

  useEffect(() => {
    const fetchItinerary = async () => {
      try {
        const response = await fetch(`/api/itineraries/${id}`)
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `Failed to fetch itinerary: ${response.status}`)
        }

        const { data } = await response.json()
        setItinerary(data)
      } catch (error: any) {
        console.error("Error fetching itinerary:", error)
        toast({
          title: "Error",
          description: error.message || "Failed to load itinerary",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchItinerary()
    }
  }, [id, toast])

  const handleStatusChange = async (newStatus: string) => {
    if (!itinerary) return

    setUpdatingStatus(true)
    try {
      const response = await fetch(`/api/itineraries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update status")
      }

      const { data } = await response.json()
      setItinerary({ ...itinerary, status: data.status })

      toast({
        title: "Success",
        description: "Itinerary status updated successfully",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      })
    } finally {
      setUpdatingStatus(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!itinerary) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Itinerary Not Found</h1>
          <p className="text-muted-foreground">The itinerary you're looking for doesn't exist.</p>
          <Button asChild>
            <Link href="/itineraries">Back to Itineraries</Link>
          </Button>
        </div>
      </div>
    )
  }

  const canConfirmTrip = itinerary.status === "draft" && itinerary.invoice?.status === "paid"

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/itineraries">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {itinerary.title || itinerary.trip_summary || "Itinerary"}
            </h1>
            <p className="text-muted-foreground">
              Created {formatDate(itinerary.created_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ItineraryStatusBadge status={itinerary.status} />
          {(itinerary.status === "draft" || itinerary.status === "trip_confirmed") && (
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(true)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Itinerary
            </Button>
          )}
          {canConfirmTrip && (
            <Button
              onClick={() => handleStatusChange("trip_confirmed")}
              disabled={updatingStatus}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Confirm Trip
            </Button>
          )}
          {itinerary.status === "draft" && (
            <Select
              value={itinerary.status}
              onValueChange={handleStatusChange}
              disabled={updatingStatus}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                {itinerary.invoice?.status === "paid" && (
                  <SelectItem value="trip_confirmed">Trip Confirmed</SelectItem>
                )}
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Trip Information */}
          <Card>
            <CardHeader>
              <CardTitle>Trip Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Trip Type</div>
                  <div className="font-medium">
                    {itinerary.trip_type ? (
                      <Badge variant="outline">{itinerary.trip_type}</Badge>
                    ) : (
                      "—"
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Legs</div>
                  <div className="font-medium">{itinerary.leg_count}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Passengers</div>
                  <div className="font-medium">{itinerary.total_pax}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Domestic Trip</div>
                  <div className="font-medium">
                    {itinerary.domestic_trip ? "Yes" : "No"}
                  </div>
                </div>
              </div>
              {itinerary.asap && (
                <Badge variant="destructive">ASAP - Urgent Trip</Badge>
              )}
              {itinerary.trip_summary && (
                <div>
                  <div className="text-sm text-muted-foreground">Summary</div>
                  <div className="font-medium">{itinerary.trip_summary}</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
            </CardHeader>
            <CardContent>
              {itinerary.contact ? (
                <div className="space-y-2">
                  <div className="font-medium">{itinerary.contact.full_name}</div>
                  <div className="text-sm text-muted-foreground">{itinerary.contact.email}</div>
                  {itinerary.contact.company && (
                    <div className="text-sm text-muted-foreground">{itinerary.contact.company}</div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No contact information</p>
              )}
            </CardContent>
          </Card>

          {/* Aircraft Information */}
          {itinerary.aircraft_tail_no && (
            <Card>
              <CardHeader>
                <CardTitle>Aircraft</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Plane className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{itinerary.aircraft_tail_no}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dates */}
          <Card>
            <CardHeader>
              <CardTitle>Dates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {itinerary.earliest_departure && (
                <div>
                  <div className="text-sm text-muted-foreground">Earliest Departure</div>
                  <div className="font-medium">{formatDate(itinerary.earliest_departure)}</div>
                </div>
              )}
              {itinerary.latest_return && (
                <div>
                  <div className="text-sm text-muted-foreground">Latest Return</div>
                  <div className="font-medium">{formatDate(itinerary.latest_return)}</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Related Information */}
          <Card>
            <CardHeader>
              <CardTitle>Related</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {itinerary.quote && (
                <div>
                  <div className="text-sm text-muted-foreground">Quote</div>
                  <Link
                    href={`/quotes/${itinerary.quote.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {itinerary.quote.title || "View Quote"}
                  </Link>
                </div>
              )}
              {itinerary.invoice && (
                <div>
                  <div className="text-sm text-muted-foreground">Invoice</div>
                  <Link
                    href={`/invoices/${itinerary.invoice.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {itinerary.invoice.number} - {itinerary.invoice.status}
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {(itinerary.notes || itinerary.special_requirements) && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {itinerary.notes && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">General Notes</div>
                    <p className="text-sm">{itinerary.notes}</p>
                  </div>
                )}
                {itinerary.special_requirements && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Special Requirements</div>
                    <p className="text-sm">{itinerary.special_requirements}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Flight Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Flight Details</CardTitle>
          <CardDescription>{itinerary.details.length} flight leg(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {itinerary.details.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No flight details available
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Leg</TableHead>
                  <TableHead>Origin</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Departure</TableHead>
                  <TableHead>Arrival</TableHead>
                  <TableHead>Passengers</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itinerary.details.map((detail) => (
                  <TableRow key={detail.seq}>
                    <TableCell className="font-medium">{detail.seq}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {detail.origin_code || detail.origin || "—"}
                        </div>
                        {detail.origin && detail.origin_code && (
                          <div className="text-sm text-muted-foreground">{detail.origin}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {detail.destination_code || detail.destination || "—"}
                        </div>
                        {detail.destination && detail.destination_code && (
                          <div className="text-sm text-muted-foreground">{detail.destination}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {detail.depart_dt && (
                        <div>
                          <div className="font-medium">{formatDate(detail.depart_dt)}</div>
                          {detail.depart_time && (
                            <div className="text-sm text-muted-foreground">{detail.depart_time}</div>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {detail.arrive_dt && (
                        <div>
                          <div className="font-medium">{formatDate(detail.arrive_dt)}</div>
                          {detail.arrive_time && (
                            <div className="text-sm text-muted-foreground">{detail.arrive_time}</div>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{detail.pax_count || "—"}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {detail.notes || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {itinerary && (
        <EditItineraryDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          itinerary={itinerary}
          onSuccess={() => {
            // Refresh itinerary data
            const fetchItinerary = async () => {
              try {
                const response = await fetch(`/api/itineraries/${id}`)
                if (response.ok) {
                  const { data } = await response.json()
                  setItinerary(data)
                }
              } catch (error) {
                console.error("Error refreshing itinerary:", error)
              }
            }
            fetchItinerary()
          }}
        />
      )}
    </div>
  )
}

