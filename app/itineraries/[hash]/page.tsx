"use client"

import { useState } from "react"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Plane,
  Clock,
  Users,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Download,
  Share2,
  Wifi,
  Coffee,
  Car,
  Building2,
  Globe,
  CheckCircle2,
  AlertCircle,
  Info,
} from "lucide-react"
import { useMockStore } from "@/lib/mock/store"
import { formatDate } from "@/lib/utils/format"

interface ItineraryPageProps {
  params: {
    hash: string
  }
}

export default function ItineraryPage({ params }: ItineraryPageProps) {
  const { getItineraryByHash } = useMockStore()
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  const itinerary = getItineraryByHash(params.hash)

  if (!itinerary) {
    notFound()
  }

  const getAmenityIcon = (amenity: string) => {
    const amenityLower = amenity.toLowerCase()
    if (amenityLower.includes("wifi")) return <Wifi className="h-4 w-4" />
    if (amenityLower.includes("coffee") || amenityLower.includes("catering") || amenityLower.includes("refreshment"))
      return <Coffee className="h-4 w-4" />
    if (amenityLower.includes("transport") || amenityLower.includes("ground")) return <Car className="h-4 w-4" />
    if (amenityLower.includes("bar") || amenityLower.includes("entertainment")) return <Building2 className="h-4 w-4" />
    return <CheckCircle2 className="h-4 w-4" />
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "confirmed":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case "pending":
        return <Clock className="h-5 w-5 text-yellow-600" />
      case "cancelled":
        return <AlertCircle className="h-5 w-5 text-red-600" />
      default:
        return <Info className="h-5 w-5 text-blue-600" />
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                {getStatusIcon(itinerary.status)}
                <h1 className="text-3xl font-bold text-card-foreground">{itinerary.tripName}</h1>
              </div>
              <p className="text-muted-foreground">
                {itinerary.customer.name} • {itinerary.customer.company}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm">
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Flight Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Flight Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {itinerary.segments.map((segment, index) => (
                <div key={segment.id} className="relative">
                  {index > 0 && <div className="absolute left-6 -top-3 w-0.5 h-6 bg-border"></div>}
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                      {segment.segmentNumber}
                    </div>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                      <div>
                        <div className="font-semibold text-lg">
                          {segment.origin} → {segment.destination}
                        </div>
                        <div className="text-sm text-muted-foreground">{formatDate(segment.departureDate)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{segment.departureTime}</span>
                        {segment.arrivalTime !== "TBD" && (
                          <>
                            <span className="text-muted-foreground">→</span>
                            <span className="font-medium">{segment.arrivalTime}</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{segment.passengers} passengers</span>
                      </div>
                      <div className="text-right">
                        {segment.blockTime !== "TBD" && <Badge variant="secondary">{segment.blockTime}</Badge>}
                      </div>
                    </div>
                  </div>
                  {segment.notes && (
                    <div className="ml-16 mt-2 text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                      {segment.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Aircraft Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plane className="h-5 w-5" />
                Aircraft Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Aircraft Images */}
              {itinerary.images.length > 0 && (
                <div className="space-y-4">
                  <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                    <img
                      src={itinerary.images[selectedImageIndex]?.url || "/placeholder.svg"}
                      alt={itinerary.images[selectedImageIndex]?.caption || "Aircraft"}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {itinerary.images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto">
                      {itinerary.images.map((image, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedImageIndex(index)}
                          className={`flex-shrink-0 w-20 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                            selectedImageIndex === index ? "border-primary" : "border-border"
                          }`}
                        >
                          <img
                            src={image.url || "/placeholder.svg"}
                            alt={image.caption || `Aircraft ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Aircraft Specifications */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-lg">{itinerary.aircraft.model.name}</h4>
                  <p className="text-muted-foreground">{itinerary.aircraft.model.manufacturer}</p>
                  {itinerary.aircraft.tail && (
                    <p className="text-sm text-muted-foreground">Tail Number: {itinerary.aircraft.tail.tailNumber}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Range:</span>
                    <span className="ml-2 font-medium">{itinerary.aircraft.specifications.range} nm</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Cruise Speed:</span>
                    <span className="ml-2 font-medium">{itinerary.aircraft.specifications.cruiseSpeed} kts</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Capacity:</span>
                    <span className="ml-2 font-medium">{itinerary.aircraft.specifications.seatingConfiguration}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Baggage:</span>
                    <span className="ml-2 font-medium">{itinerary.aircraft.specifications.baggageCapacity}</span>
                  </div>
                </div>

                {/* Amenities */}
                {itinerary.amenities.length > 0 && (
                  <div>
                    <h5 className="font-medium mb-2">Amenities</h5>
                    <div className="flex flex-wrap gap-2">
                      {itinerary.amenities.map((amenity, index) => (
                        <Badge key={index} variant="outline" className="flex items-center gap-1">
                          {getAmenityIcon(amenity)}
                          {amenity}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Crew Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Flight Crew
              </CardTitle>
            </CardHeader>
            <CardContent>
              {itinerary.visibility.showCrewContacts ? (
                <div className="space-y-4">
                  {itinerary.crew.map((crewMember) => (
                    <div key={crewMember.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={crewMember.avatar || "/placeholder.svg"} alt={crewMember.name} />
                        <AvatarFallback>
                          {crewMember.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="font-semibold">{crewMember.name}</div>
                        <div className="text-sm text-muted-foreground mb-1">{crewMember.role}</div>
                        <div className="text-xs text-muted-foreground mb-2">{crewMember.experience}</div>
                        <div className="flex flex-col gap-1 text-sm">
                          <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3" />
                            <a href={`tel:${crewMember.phone}`} className="text-primary hover:underline">
                              {crewMember.phone}
                            </a>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3" />
                            <a href={`mailto:${crewMember.email}`} className="text-primary hover:underline">
                              {crewMember.email}
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h4 className="font-semibold mb-2">Crew Details Coming Soon</h4>
                  <p className="text-sm text-muted-foreground">
                    Crew contact information will be available closer to your departure date.
                  </p>
                  {itinerary.visibility.showCrewContactsAfter && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Available after {formatDate(itinerary.visibility.showCrewContactsAfter)}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* FBO Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Fixed Base Operators (FBOs)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {itinerary.segments.map((segment) => (
                <div key={segment.id} className="space-y-4">
                  <h4 className="font-semibold text-lg">
                    {segment.origin} → {segment.destination}
                  </h4>

                  {/* Origin FBO */}
                  {segment.fboOrigin && (
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span className="font-medium">Departure: {segment.fboOrigin.name}</span>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>{segment.fboOrigin.airportName}</p>
                        <p>{segment.fboOrigin.address}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            <a href={`tel:${segment.fboOrigin.phone}`} className="text-primary hover:underline">
                              {segment.fboOrigin.phone}
                            </a>
                          </div>
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            <a href={`mailto:${segment.fboOrigin.email}`} className="text-primary hover:underline">
                              {segment.fboOrigin.email}
                            </a>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {segment.fboOrigin.services.map((service, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {service}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Destination FBO */}
                  {segment.fboDestination && (
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="h-4 w-4 text-secondary" />
                        <span className="font-medium">Arrival: {segment.fboDestination.name}</span>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>{segment.fboDestination.airportName}</p>
                        <p>{segment.fboDestination.address}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            <a href={`tel:${segment.fboDestination.phone}`} className="text-primary hover:underline">
                              {segment.fboDestination.phone}
                            </a>
                          </div>
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            <a href={`mailto:${segment.fboDestination.email}`} className="text-primary hover:underline">
                              {segment.fboDestination.email}
                            </a>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {segment.fboDestination.services.map((service, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {service}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Additional Information */}
        {(itinerary.restrictions.operational.length > 0 ||
          itinerary.restrictions.customs.length > 0 ||
          itinerary.specialNotes.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Important Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {itinerary.restrictions.operational.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 text-yellow-700">Operational Restrictions</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {itinerary.restrictions.operational.map((restriction, index) => (
                      <li key={index}>{restriction}</li>
                    ))}
                  </ul>
                </div>
              )}

              {itinerary.restrictions.customs.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 text-blue-700">Customs & Documentation</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {itinerary.restrictions.customs.map((restriction, index) => (
                      <li key={index}>{restriction}</li>
                    ))}
                  </ul>
                </div>
              )}

              {itinerary.specialNotes.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 text-green-700">Special Notes</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {itinerary.specialNotes.map((note, index) => (
                      <li key={index}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Need Assistance?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button className="flex-1">
                <Phone className="mr-2 h-4 w-4" />
                Call Support
              </Button>
              <Button variant="outline" className="flex-1 bg-transparent">
                <Mail className="mr-2 h-4 w-4" />
                Email Support
              </Button>
              <Button variant="outline" className="flex-1 bg-transparent">
                <Globe className="mr-2 h-4 w-4" />
                Visit Website
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
