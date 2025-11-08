"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Calendar, MapPin, Users, Plane, FileText } from "lucide-react"
import { formatDate } from "@/lib/utils/format"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface PublicItineraryPageProps {
  token: string
}

export default function PublicItineraryPage({ token }: PublicItineraryPageProps) {
  const [itinerary, setItinerary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPublicItinerary = async () => {
      try {
        const response = await fetch(`/api/itineraries/public/${token}`)
        if (!response.ok) {
          throw new Error("Failed to load itinerary")
        }
        const { data } = await response.json()
        setItinerary(data)
      } catch (err: any) {
        setError(err.message || "Failed to load itinerary")
      } finally {
        setLoading(false)
      }
    }

    fetchPublicItinerary()
  }, [token])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !itinerary) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold mb-2">Itinerary Not Found</h3>
              <p className="text-sm text-muted-foreground">{error || "This itinerary link may have expired."}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{itinerary.title || "Your Trip Itinerary"}</CardTitle>
            <CardDescription>{itinerary.trip_summary}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Legs</div>
                  <div className="font-semibold">{itinerary.leg_count}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Passengers</div>
                  <div className="font-semibold">{itinerary.total_pax}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Plane className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Aircraft</div>
                  <div className="font-semibold">{itinerary.aircraft_tail_no || "TBD"}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Status</div>
                  <Badge variant="secondary">{itinerary.status.replace("_", " ")}</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {itinerary.details && itinerary.details.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Flight Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Leg</TableHead>
                      <TableHead>Origin</TableHead>
                      <TableHead>Destination</TableHead>
                      <TableHead>Departure</TableHead>
                      <TableHead>Arrival</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itinerary.details.map((detail: any) => (
                      <TableRow key={detail.seq}>
                        <TableCell>{detail.seq}</TableCell>
                        <TableCell>{detail.origin_code || detail.origin || "—"}</TableCell>
                        <TableCell>{detail.destination_code || detail.destination || "—"}</TableCell>
                        <TableCell>
                          {detail.depart_dt ? (
                            <div>
                              <div>{formatDate(detail.depart_dt)}</div>
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
                              <div>{formatDate(detail.arrive_dt)}</div>
                              {detail.arrive_time && (
                                <div className="text-xs text-muted-foreground">{detail.arrive_time}</div>
                              )}
                            </div>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
