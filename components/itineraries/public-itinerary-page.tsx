"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Loader2,
  Calendar,
  Users,
  Plane,
  MapPin,
  Contact,
  FileText,
  CheckCircle2,
  UserCog,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { formatDate } from "@/lib/utils/format"
import { useToast } from "@/hooks/use-toast"

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
}

interface PublicItineraryPageProps {
  token: string
  verifiedEmail?: string
}

export default function PublicItineraryPage({ token, verifiedEmail }: PublicItineraryPageProps) {
  const { toast } = useToast()
  const [itinerary, setItinerary] = useState<Itinerary | null>(null)
  const [passengers, setPassengers] = useState<ItineraryPassenger[]>([])
  const [crew, setCrew] = useState<ItineraryCrewMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchItinerary = async () => {
      if (!token) return

      setLoading(true)
      try {
        const response = await fetch(`/api/itineraries/public/${token}`)
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `Failed to fetch itinerary: ${response.status}`)
        }

        const { data } = await response.json()
        setItinerary(data.itinerary)
        setPassengers(data.passengers || [])
        setCrew(data.crew || [])
      } catch (err: any) {
        console.error("Error fetching public itinerary:", err)
        setError(err.message || "Failed to load itinerary")
        toast({
          title: "Error",
          description: err.message || "Failed to load itinerary",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchItinerary()
  }, [token, toast])

  const emailChip = useMemo(() => {
    if (!verifiedEmail) return null
    return (
      <div className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-medium border border-emerald-200 inline-flex items-center gap-2">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Access granted for <span className="font-semibold">{verifiedEmail}</span>
      </div>
    )
  }, [verifiedEmail])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !itinerary) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 px-4">
        <Card className="max-w-md w-full shadow-lg">
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold mb-2">Itinerary Not Available</h3>
              <p className="text-sm text-muted-foreground mb-6">
                {error || "The itinerary you're looking for doesn't exist or the link has expired."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="space-y-6">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="flex-1 min-w-0 space-y-2">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
                {itinerary.title || itinerary.trip_summary || "Itinerary"}
              </h1>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Created {formatDate(itinerary.created_at)}
              </p>
            </div>
            {emailChip}
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
                <CardDescription>{itinerary.details.length} flight leg(s)</CardDescription>
              </CardHeader>
              <CardContent>
                {itinerary.details.length === 0 ? (
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
                  {passengers.length === 0 ? "No passengers assigned" : `${passengers.length} assigned`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {passengers.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">No passengers assigned to this itinerary.</p>
                  </div>
                ) : (
                  <TooltipProvider>
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
                          <Tooltip key={assignment.id} delayDuration={200}>
                            <TooltipTrigger asChild>
                              <div className="flex flex-col items-center gap-2 group cursor-pointer">
                                <Avatar className="h-16 w-16 border-2 border-border group-hover:border-primary transition-all duration-300 group-hover:scale-110 shadow-sm group-hover:shadow-md">
                                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg group-hover:bg-primary/20">
                                    {initials}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors max-w-[70px] truncate text-center">
                                  {firstName}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent
                              side="bottom"
                              className="backdrop-blur-2xl bg-white/80 dark:bg-gray-900/80 border border-white/30 dark:border-gray-700/40 shadow-2xl max-w-[300px] p-5 rounded-2xl"
                            >
                              <div className="space-y-3">
                                <div className="font-semibold text-base text-gray-900 dark:text-gray-50">
                                  {passenger?.full_name || "Unknown passenger"}
                                </div>
                                <Separator className="bg-gray-300/60 dark:bg-gray-600/60" />
                                {passenger?.email && (
                                  <div className="text-sm text-gray-700 dark:text-gray-200 flex items-center gap-2">
                                    <Contact className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" />
                                    <span className="break-all">{passenger.email}</span>
                                  </div>
                                )}
                                {passenger?.phone && (
                                  <div className="text-sm text-gray-700 dark:text-gray-200">{passenger.phone}</div>
                                )}
                                {passenger?.company && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs mt-2 border-gray-400/40 dark:border-gray-500/40"
                                  >
                                    {passenger.company}
                                  </Badge>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        )
                      })}
                    </div>
                  </TooltipProvider>
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
                  <CardDescription>{crew.length === 0 ? "No crew assigned" : `${crew.length} assigned`}</CardDescription>
                </CardHeader>
                <CardContent>
                  {crew.length === 0 ? (
                    <div className="text-center py-6">
                      <UserCog className="h-10 w-10 mx-auto mb-2 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">No crew assigned</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {crew.map((member) => (
                        <div
                          key={member.id}
                          className="relative rounded-2xl backdrop-blur-2xl bg-gradient-to-br from-white/70 to-white/50 dark:from-gray-900/70 dark:to-gray-900/50 border border-white/40 dark:border-gray-700/40 p-2"
                        >
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex-1 min-w-0 space-y-1.5">
                              <div className="font-semibold text-base text-gray-900 dark:text-gray-50 line-clamp-1">
                                {member.full_name || "Crew member"}
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-widest font-semibold">
                                {member.role}
                              </div>
                            </div>
                            {member.confirmed && (
                              <Badge variant="default" className="text-xs shrink-0 shadow-sm">
                                Confirmed
                              </Badge>
                            )}
                          </div>
                          {member.notes && (
                            <div className="text-xs text-gray-600 dark:text-gray-400 italic line-clamp-2">
                              {member.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

