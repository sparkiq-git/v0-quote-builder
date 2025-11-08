"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
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
  UserCog,
  Info,
  Share2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate } from "@/lib/utils/format"
import { ItineraryStatusBadge } from "@/components/itineraries/itinerary-status-badge"
import { EditItineraryDialog } from "@/components/itineraries/edit-itinerary-dialog"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

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

interface ItineraryPassenger {
  id: string
  passenger_id: string
  passenger?: {
    id: string
    full_name: string | null
    email: string | null
    phone: string | null
    company: string | null
  } | null
}

interface ItineraryCrewMember {
  id: string
  role: string
  full_name: string | null
  notes: string | null
  confirmed: boolean
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

export default function ItineraryDetailPage({ id }: { id: string }) {
  const { toast } = useToast()
  const router = useRouter()
  const [itinerary, setItinerary] = useState<Itinerary | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [passengers, setPassengers] = useState<ItineraryPassenger[]>([])
  const [crew, setCrew] = useState<ItineraryCrewMember[]>([])
  const [loadingPassengers, setLoadingPassengers] = useState(false)
  const [loadingCrew, setLoadingCrew] = useState(false)
  const [publishing, setPublishing] = useState(false)

  const fetchItinerary = useCallback(async () => {
    if (!id) return
    setLoading(true)

    try {
      const response = await fetch(`/api/itineraries/${id}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
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
  }, [id, toast])

  const fetchPassengers = useCallback(async () => {
    if (!id) return
    setLoadingPassengers(true)

    try {
      const response = await fetch(`/api/itineraries/${id}/passengers`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to fetch passengers: ${response.status}`)
      }

      const { data } = await response.json()
      const mapped = (data?.passengers || []).map((p: any) => ({
        id: p.id,
        passenger_id: p.passenger_id,
        passenger: p.passenger ?? null,
      }))
      setPassengers(mapped)
    } catch (error: any) {
      console.error("Error fetching itinerary passengers:", error)
      toast({
        title: "Passenger data unavailable",
        description: error.message || "Could not load passengers for this itinerary.",
        variant: "destructive",
      })
    } finally {
      setLoadingPassengers(false)
    }
  }, [id, toast])

  const fetchCrew = useCallback(async () => {
    if (!id) return
    setLoadingCrew(true)

    try {
      const response = await fetch(`/api/itineraries/${id}/crew`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to fetch crew: ${response.status}`)
      }

      const { data } = await response.json()
      const mapped = (data?.crew || []).map((member: any) => ({
        id: member.id,
        role: member.role,
        full_name: member.full_name ?? null,
        notes: member.notes ?? null,
        confirmed: Boolean(member.confirmed),
      }))
      setCrew(mapped)
    } catch (error: any) {
      console.error("Error fetching itinerary crew:", error)
      toast({
        title: "Crew data unavailable",
        description: error.message || "Could not load crew for this itinerary.",
        variant: "destructive",
      })
    } finally {
      setLoadingCrew(false)
    }
  }, [id, toast])

  useEffect(() => {
    if (!id) return
    fetchItinerary()
    fetchPassengers()
    fetchCrew()
  }, [id, fetchItinerary, fetchPassengers, fetchCrew])

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

  const handlePublish = async () => {
    if (!itinerary) return

    setPublishing(true)
    try {
      const response = await fetch(`/api/itineraries/${id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to publish itinerary")
      }

      const data = await response.json()

      const fragments: string[] = []
      if (typeof data.published === "number") {
        fragments.push(`Sent itinerary links to ${data.published} recipient${data.published === 1 ? "" : "s"}.`)
      }
      if (typeof data.deduped === "number" && data.deduped > 0) {
        fragments.push(`${data.deduped} recipient${data.deduped === 1 ? " was" : "s were"} already notified recently.`)
      }
      if (typeof data.failed === "number" && data.failed > 0) {
        fragments.push(`${data.failed} recipient${data.failed === 1 ? "" : "s"} failed; check the console for details.`)
      }

      toast({
        title: data.failed > 0 && data.published === 0 ? "Publish Completed with Errors" : "Itinerary Published",
        description: fragments.join(" "),
        variant: data.failed > 0 && data.published === 0 ? "destructive" : "default",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to publish itinerary",
        variant: "destructive",
      })
    } finally {
      setPublishing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!itinerary) {
    return (
      <div className="w-full flex justify-center px-4 sm:px-6 lg:px-8 py-8">
        <div className="w-full max-w-[1400px]">
          <Card className="shadow-lg max-w-2xl mx-auto">
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-semibold mb-2">Itinerary Not Found</h3>
                <p className="text-sm text-muted-foreground mb-6">The itinerary you're looking for doesn't exist.</p>
                <Button asChild>
                  <Link href="/itineraries">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Itineraries
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const canConfirmTrip = itinerary.status === "draft" && itinerary.invoice?.status === "paid"

  return (
    <div className="w-full flex justify-center px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="w-full max-w-[1400px] space-y-8">
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" asChild className="shrink-0 mt-1">
              <Link href="/itineraries">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex-1 min-w-0 space-y-2">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                {itinerary.title || itinerary.trip_summary || "Itinerary"}
              </h1>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Created {formatDate(itinerary.created_at)}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <ItineraryStatusBadge status={itinerary.status} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {(itinerary.status === "draft" || itinerary.status === "trip_confirmed") && (
                <Button variant="outline" size="default" onClick={() => setShowEditDialog(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
              {(itinerary.status === "draft" || itinerary.status === "trip_confirmed") && (
                <Button variant="outline" size="default" onClick={handlePublish} disabled={publishing}>
                  {publishing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Share2 className="h-4 w-4 mr-2" />
                      Publish
                    </>
                  )}
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
                  <SelectTrigger className="w-[160px]">
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
        </div>

        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-md border-border/60 hover:shadow-lg hover:border-primary/30 transition-all">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="text-sm font-semibold text-muted-foreground">Trip Summary</div>
              </div>
              <div className="space-y-3">
                {itinerary.trip_summary && (
                  <p className="text-sm leading-relaxed line-clamp-3 text-foreground" title={itinerary.trip_summary}>
                    {itinerary.trip_summary}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {itinerary.trip_type && (
                    <Badge variant="outline" className="text-xs font-medium">
                      {itinerary.trip_type}
                    </Badge>
                  )}
                  {itinerary.asap && (
                    <Badge variant="destructive" className="text-xs font-medium">
                      ASAP
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md border-border/60 hover:shadow-lg hover:border-primary/30 transition-all">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div className="text-sm font-semibold text-muted-foreground">Flight Legs</div>
              </div>
              <div className="font-bold text-3xl text-primary">{itinerary.leg_count}</div>
              <div className="text-xs text-muted-foreground mt-2 font-medium">
                {itinerary.domestic_trip ? "Domestic" : "International"}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md border-border/60 hover:shadow-lg hover:border-primary/30 transition-all">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div className="text-sm font-semibold text-muted-foreground">Passengers</div>
              </div>
              <div className="font-bold text-3xl text-primary">{itinerary.total_pax}</div>
              <div className="text-xs text-muted-foreground mt-2 font-medium">Total PAX</div>
            </CardContent>
          </Card>

          <Card className="shadow-md border-border/60 hover:shadow-lg hover:border-primary/30 transition-all">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <Plane className="h-5 w-5 text-primary" />
                </div>
                <div className="text-sm font-semibold text-muted-foreground">Aircraft</div>
              </div>
              <div className="font-semibold text-xl truncate text-foreground">
                {itinerary.aircraft_tail_no || "Not assigned"}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-12">
          <div className="lg:col-span-8 space-y-6">
            <Card className="shadow-md border-border/60">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Plane className="h-5 w-5 text-primary" />
                  Flight Details
                </CardTitle>
                <CardDescription>{itinerary.details?.length || 0} flight leg(s)</CardDescription>
              </CardHeader>
              <CardContent>
                {!itinerary.details || itinerary.details.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No flight details available</p>
                ) : (
                  <div className="overflow-x-auto border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-[50px]">Leg</TableHead>
                          <TableHead className="min-w-[120px]">Origin</TableHead>
                          <TableHead className="min-w-[120px]">Destination</TableHead>
                          <TableHead className="min-w-[140px]">Departure</TableHead>
                          <TableHead className="min-w-[140px]">Arrival</TableHead>
                          <TableHead className="text-center w-[60px]">PAX</TableHead>
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
                                <div className="font-medium">
                                  {detail.destination_code || detail.destination || "—"}
                                </div>
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

            <Card className="shadow-md border-border/60">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Passengers
                </CardTitle>
                <CardDescription>
                  {loadingPassengers ? "Loading passenger roster..." : `${passengers.length} assigned`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingPassengers ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading passengers...
                  </div>
                ) : passengers.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">No passengers assigned to this itinerary.</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-6">
                    {passengers.map((assignment) => {
                      const passenger = assignment.passenger
                      const initials =
                        passenger?.full_name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase() || "?"
                      const firstName = passenger?.full_name?.split(" ")[0] || "Unknown"

                      return (
                        <div key={assignment.id} className="flex flex-col items-center gap-2 group">
                          <Avatar className="h-16 w-16 border-2 border-border group-hover:border-primary transition-all duration-300 group-hover:scale-110 shadow-sm group-hover:shadow-md">
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg group-hover:bg-primary/20">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors max-w-[70px] truncate text-center">
                            {firstName}
                          </span>
                          {passenger?.email && <span className="text-xs text-muted-foreground">{passenger.email}</span>}
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-md border-border/60">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Important Dates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  {itinerary.earliest_departure && (
                    <div className="p-4 rounded-lg bg-muted/30 border border-border/40">
                      <div className="text-xs font-medium text-muted-foreground mb-2">Earliest Departure</div>
                      <div className="font-medium text-lg">{formatDate(itinerary.earliest_departure)}</div>
                    </div>
                  )}
                  {itinerary.latest_return && (
                    <div className="p-4 rounded-lg bg-muted/30 border border-border/40">
                      <div className="text-xs font-medium text-muted-foreground mb-2">Latest Return</div>
                      <div className="font-medium text-lg">{formatDate(itinerary.latest_return)}</div>
                    </div>
                  )}
                </div>
                {!itinerary.earliest_departure && !itinerary.latest_return && (
                  <p className="text-sm text-muted-foreground text-center py-4">No dates specified</p>
                )}
              </CardContent>
            </Card>

            {(itinerary.notes || itinerary.special_requirements) && (
              <Card className="shadow-md border-border/60">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Notes & Requirements
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {itinerary.notes && (
                    <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
                      <div className="text-xs font-semibold text-muted-foreground mb-2">General Notes</div>
                      <p className="text-sm leading-relaxed whitespace-pre-line">{itinerary.notes}</p>
                    </div>
                  )}
                  {itinerary.special_requirements && (
                    <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg border border-amber-500/30">
                      <div className="text-xs font-semibold text-amber-800 dark:text-amber-200 mb-2">
                        Special Requirements
                      </div>
                      <p className="text-sm leading-relaxed text-amber-900 dark:text-amber-100 whitespace-pre-line">
                        {itinerary.special_requirements}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-6 space-y-6">
              <Card className="shadow-md border-border/60">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Contact className="h-5 w-5 text-primary" />
                    Contact
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {itinerary.contact ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {itinerary.contact.full_name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-base truncate">{itinerary.contact.full_name}</div>
                          {itinerary.contact.company && (
                            <Badge variant="outline" className="text-xs mt-1">
                              {itinerary.contact.company}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Separator />
                      <div className="space-y-2 text-sm">
                        <div className="text-muted-foreground break-all">{itinerary.contact.email}</div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-6">No contact information</p>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-md border-border/60 overflow-hidden">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <UserCog className="h-5 w-5 text-primary" />
                    Crew
                  </CardTitle>
                  <CardDescription>{loadingCrew ? "Loading..." : `${crew.length} assigned`}</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingCrew ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading crew...
                    </div>
                  ) : crew.length === 0 ? (
                    <div className="text-center py-6">
                      <UserCog className="h-10 w-10 mx-auto mb-2 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">No crew assigned</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {crew.map((member) => (
                        <div
                          key={member.id}
                          className="rounded-lg bg-muted/30 border border-border/40 p-3 hover:shadow-md hover:border-primary/30 transition-all"
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="font-semibold text-sm">{member.full_name || "Crew member"}</div>
                              <div className="text-xs text-muted-foreground uppercase tracking-wide">{member.role}</div>
                            </div>
                            {member.confirmed && (
                              <Badge variant="default" className="text-xs shrink-0">
                                Confirmed
                              </Badge>
                            )}
                          </div>
                          {member.notes && <div className="text-xs text-muted-foreground italic">{member.notes}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-md border-border/60 bg-gradient-to-br from-primary/5 via-primary/3 to-primary/5">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Info className="h-5 w-5 text-primary" />
                    Trip Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-background/70 border border-border/40">
                    <span className="text-sm font-semibold text-muted-foreground">Trip Type</span>
                    <span className="text-sm font-bold text-foreground">
                      {itinerary.domestic_trip ? "Domestic" : "International"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-background/70 border border-border/40">
                    <span className="text-sm font-semibold text-muted-foreground">Total Legs</span>
                    <span className="text-sm font-bold text-foreground">{itinerary.leg_count}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-background/70 border border-border/40">
                    <span className="text-sm font-semibold text-muted-foreground">Currency</span>
                    <span className="text-sm font-bold text-foreground">{itinerary.currency || "USD"}</span>
                  </div>
                  {itinerary.asap && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="text-xs font-semibold">
                          URGENT
                        </Badge>
                        <span className="text-sm font-semibold text-destructive">ASAP Trip</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-md border-border/60">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Related
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {itinerary.quote && (
                    <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                      <div className="text-xs font-semibold text-muted-foreground mb-2">Quote</div>
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
                    <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                      <div className="text-xs font-semibold text-muted-foreground mb-2">Invoice</div>
                      <Link
                        href={`/invoices/${itinerary.invoice.id}`}
                        className="font-medium text-primary hover:underline flex items-center gap-1.5 mb-3"
                      >
                        {itinerary.invoice.number}
                        <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
                      </Link>
                      <div className="flex items-center gap-2">
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
                    <p className="text-sm text-muted-foreground text-center py-4">No related documents</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {itinerary && (
          <EditItineraryDialog
            open={showEditDialog}
            onOpenChange={setShowEditDialog}
            itinerary={itinerary}
            onSuccess={() => {
              fetchItinerary()
              fetchPassengers()
              fetchCrew()
            }}
          />
        )}
      </div>
    </div>
  )
}
