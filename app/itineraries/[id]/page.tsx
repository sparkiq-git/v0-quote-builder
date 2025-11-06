"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2, Calendar, Users, Plane, MapPin, Contact, FileText, ArrowLeft, Edit, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate } from "@/lib/utils/format"
import { ItineraryStatusBadge } from "@/components/itineraries/itinerary-status-badge"
import { EditItineraryDialog } from "@/components/itineraries/edit-itinerary-dialog"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Itinerary Not Found</h1>
          <p className="text-sm text-muted-foreground">The itinerary you're looking for doesn't exist.</p>
          <Button asChild>
            <Link href="/itineraries">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Itineraries
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  const canConfirmTrip = itinerary.status === "draft" && itinerary.invoice?.status === "paid"

  return (
    <div className="w-full flex justify-center px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="w-full lg:w-[75vw] space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/itineraries">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {itinerary.title || itinerary.trip_summary || "Itinerary"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1.5 flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5" />
                Created {formatDate(itinerary.created_at)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <ItineraryStatusBadge status={itinerary.status} />
            {(itinerary.status === "draft" || itinerary.status === "trip_confirmed") && (
              <Button variant="outline" onClick={() => setShowEditDialog(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
            {canConfirmTrip && (
              <Button onClick={() => handleStatusChange("trip_confirmed")} disabled={updatingStatus}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Confirm Trip
              </Button>
            )}
            {itinerary.status === "draft" && (
              <Select value={itinerary.status} onValueChange={handleStatusChange} disabled={updatingStatus}>
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

        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {/* Trip Summary Card with Trip Type inside */}
          <Card className="shadow-md border-border/50 hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="text-sm text-muted-foreground">Trip Summary</div>
              </div>
              <div className="space-y-3">
                {itinerary.trip_summary && (
                  <p className="text-sm leading-relaxed line-clamp-3" title={itinerary.trip_summary}>
                    {itinerary.trip_summary}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {itinerary.trip_type && (
                    <Badge variant="outline" className="text-sm">
                      {itinerary.trip_type}
                    </Badge>
                  )}
                  {itinerary.asap && (
                    <Badge variant="destructive" className="text-xs">
                      ASAP - Urgent
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Legs Card */}
          <Card className="shadow-md border-border/50 hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div className="text-sm text-muted-foreground">Flight Legs</div>
              </div>
              <div className="font-bold text-2xl text-primary">{itinerary.leg_count}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {itinerary.domestic_trip ? "Domestic" : "International"}
              </div>
            </CardContent>
          </Card>

          {/* Passengers Card */}
          <Card className="shadow-md border-border/50 hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div className="text-sm text-muted-foreground">Passengers</div>
              </div>
              <div className="font-bold text-2xl text-primary">{itinerary.total_pax}</div>
              <div className="text-xs text-muted-foreground mt-1">Total PAX</div>
            </CardContent>
          </Card>

          {/* Aircraft Card */}
          <Card className="shadow-md border-border/50 hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Plane className="h-5 w-5 text-primary" />
                </div>
                <div className="text-sm text-muted-foreground">Aircraft</div>
              </div>
              <div className="font-semibold text-lg truncate">{itinerary.aircraft_tail_no || "Not assigned"}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-3">
          {/* Flight Details spans 2 columns */}
          <Card className="lg:col-span-2 shadow-md border-border/50 flex flex-col">
            <CardHeader className="space-y-1">
              <CardTitle className="text-xl sm:text-2xl flex items-center gap-2">
                <Plane className="h-6 w-6 text-primary" />
                Flight Details
              </CardTitle>
              <CardDescription>{itinerary.details.length} flight leg(s)</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              {itinerary.details.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No flight details available</p>
              ) : (
                <div className="overflow-x-auto overflow-y-auto max-w-full max-h-[500px] border rounded-lg shadow-sm">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-[50px]">Leg</TableHead>
                        <TableHead className="min-w-[120px]">Origin</TableHead>
                        <TableHead className="min-w-[120px]">Destination</TableHead>
                        <TableHead className="min-w-[140px]">Departure</TableHead>
                        <TableHead className="min-w-[140px]">Arrival</TableHead>
                        <TableHead className="text-center">PAX</TableHead>
                        <TableHead className="min-w-[150px]">Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itinerary.details.map((detail) => (
                        <TableRow key={detail.seq} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="font-mono text-xs text-muted-foreground">{detail.seq}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{detail.origin_code || detail.origin || "—"}</div>
                              {detail.origin && detail.origin_code && (
                                <div className="text-xs text-muted-foreground truncate max-w-[100px]">
                                  {detail.origin}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{detail.destination_code || detail.destination || "—"}</div>
                              {detail.destination && detail.destination_code && (
                                <div className="text-xs text-muted-foreground truncate max-w-[100px]">
                                  {detail.destination}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {detail.depart_dt ? (
                              <div>
                                <div className="font-medium text-sm">{formatDate(detail.depart_dt)}</div>
                                {detail.depart_time && (
                                  <div className="text-xs text-muted-foreground">{detail.depart_time}</div>
                                )}
                              </div>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>
                            {detail.arrive_dt ? (
                              <div>
                                <div className="font-medium text-sm">{formatDate(detail.arrive_dt)}</div>
                                {detail.arrive_time && (
                                  <div className="text-xs text-muted-foreground">{detail.arrive_time}</div>
                                )}
                              </div>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="text-center font-medium">{detail.pax_count || "—"}</TableCell>
                          <TableCell className="max-w-xs">
                            <div className="text-sm truncate" title={detail.notes || ""}>
                              {detail.notes || "—"}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4 sm:space-y-6 flex flex-col">
            {/* Contact Information */}
            <Card className="shadow-md border-border/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Contact className="h-5 w-5 text-primary" />
                  Contact
                </CardTitle>
              </CardHeader>
              <CardContent>
                {itinerary.contact ? (
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                      <div className="font-semibold text-base mb-1">{itinerary.contact.full_name}</div>
                      <div className="text-sm text-muted-foreground break-all">{itinerary.contact.email}</div>
                      {itinerary.contact.company && (
                        <div className="text-sm text-muted-foreground mt-2 flex items-center gap-1.5">
                          <Contact className="h-3.5 w-3.5" />
                          {itinerary.contact.company}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No contact information</p>
                )}
              </CardContent>
            </Card>

            {/* Notes & Requirements */}
            {(itinerary.notes || itinerary.special_requirements) && (
              <Card className="shadow-md border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Notes & Requirements
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {itinerary.notes && (
                    <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
                      <div className="text-xs font-medium text-muted-foreground mb-2">General Notes</div>
                      <p className="text-sm whitespace-pre-line">{itinerary.notes}</p>
                    </div>
                  )}
                  {itinerary.special_requirements && (
                    <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg border border-amber-500/30">
                      <div className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-2">
                        Special Requirements
                      </div>
                      <p className="text-sm text-amber-900 dark:text-amber-100 whitespace-pre-line">
                        {itinerary.special_requirements}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Related Information */}
            <Card className="shadow-md border-border/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Related
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {itinerary.quote && (
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                    <div className="text-xs font-medium text-muted-foreground mb-1.5">Quote</div>
                    <Link
                      href={`/quotes/${itinerary.quote.id}`}
                      className="font-medium text-primary hover:underline flex items-center gap-1.5"
                    >
                      {itinerary.quote.title || "View Quote"}
                      <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
                    </Link>
                  </div>
                )}
                {itinerary.invoice && (
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                    <div className="text-xs font-medium text-muted-foreground mb-1.5">Invoice</div>
                    <Link
                      href={`/invoices/${itinerary.invoice.id}`}
                      className="font-medium text-primary hover:underline flex items-center gap-1.5"
                    >
                      {itinerary.invoice.number}
                      <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
                    </Link>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge
                        variant={itinerary.invoice.status === "paid" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {itinerary.invoice.status}
                      </Badge>
                      <span className="text-sm font-medium">
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: itinerary.invoice.currency || "USD",
                        }).format(itinerary.invoice.amount)}
                      </span>
                    </div>
                  </div>
                )}
                {!itinerary.quote && !itinerary.invoice && (
                  <p className="text-sm text-muted-foreground">No related documents</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

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
