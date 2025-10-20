"use client"

import { use, useState, useRef, useEffect } from "react"
import { useMockStore } from "@/lib/mock/store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Download, Mail, MapPin, Clock, Users, Phone, Cloud, FileText, Edit } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatDate } from "@/lib/utils/format"
import { toast } from "sonner"
import Image from "next/image"
import { ItineraryRouteMap } from "@/components/itineraries/itinerary-route-map"

interface PageProps {
  params: Promise<{ hash: string }> | { hash: string }
}

declare global {
  interface Window {
    L: any
    html2canvas: any
    jspdf: any
  }
}

export default function ItineraryDetailPage(props: PageProps) {
  // Handle both Promise and plain object params
  const resolvedParams = props.params instanceof Promise ? use(props.params) : props.params
  const { hash } = resolvedParams

  const { state, getItineraryByHash, dispatch } = useMockStore()
  const [isEditing, setIsEditing] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editForm, setEditForm] = useState<any>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const printRef = useRef<HTMLDivElement>(null)

  const itinerary = getItineraryByHash(hash)

  useEffect(() => {
    if (showEditDialog && itinerary) {
      setEditForm({
        tripName: itinerary.tripName,
        customer: {
          name: itinerary.customer.name,
          email: itinerary.customer.email,
          phone: itinerary.customer.phone,
          company: itinerary.customer.company,
        },
        segments: itinerary.segments.map((seg) => ({
          id: seg.id,
          origin: seg.origin,
          destination: seg.destination,
          departureDate: seg.departureDate,
          departureTime: seg.departureTime,
          arrivalTime: seg.arrivalTime,
          passengers: seg.passengers,
          notes: seg.notes || "",
        })),
        operationalNotes: itinerary.workflowData?.preItineraryData?.operationalNotes || "",
      })
    }
  }, [showEditDialog, itinerary])

  useEffect(() => {
    if (itinerary) {
      console.log("[v0] ===== ITINERARY PAGE LOADED =====")
      console.log("[v0] Itinerary ID:", itinerary.id)
      console.log("[v0] Itinerary hash:", itinerary.publicHash)
      console.log("[v0] Itinerary crew field:", itinerary.crew)
      console.log("[v0] Itinerary crewWithLegs field:", itinerary.crewWithLegs)
      console.log("[v0] Itinerary allPassengers field:", itinerary.allPassengers)
      console.log("[v0] Crew count:", itinerary.crew?.length || 0)
      console.log("[v0] CrewWithLegs count:", itinerary.crewWithLegs?.length || 0)
      console.log("[v0] AllPassengers count:", itinerary.allPassengers?.length || 0)
      console.log("[v0] Full itinerary object:", JSON.stringify(itinerary, null, 2))
      console.log("[v0] ===================================")
    } else {
      console.log("[v0] Itinerary not found for hash:", hash)
    }
  }, [itinerary, hash])

  if (!itinerary) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Itinerary Not Found</h2>
              <p className="text-muted-foreground">The itinerary you're looking for doesn't exist.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleDownloadPDF = async () => {
    try {
      // Load libraries if not already loaded
      if (!window.html2canvas) {
        const html2canvasScript = document.createElement("script")
        html2canvasScript.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"
        document.head.appendChild(html2canvasScript)
        await new Promise((resolve) => (html2canvasScript.onload = resolve))
      }

      if (!window.jspdf) {
        const jspdfScript = document.createElement("script")
        jspdfScript.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
        document.head.appendChild(jspdfScript)
        await new Promise((resolve) => (jspdfScript.onload = resolve))
      }

      toast.info("Generating PDF...")

      const element = printRef.current
      if (!element) return

      const tempStyle = document.createElement("style")
      tempStyle.id = "pdf-color-override"
      tempStyle.textContent = `
        #pdf-container * {
          color: rgb(0, 0, 0) !important;
          background-color: rgb(255, 255, 255) !important;
          border-color: rgb(229, 231, 235) !important;
        }
        #pdf-container .bg-primary {
          background-color: rgb(37, 99, 235) !important;
        }
        #pdf-container .bg-primary * {
          color: rgb(255, 255, 255) !important;
        }
        #pdf-container .text-primary {
          color: rgb(37, 99, 235) !important;
        }
        #pdf-container .bg-muted,
        #pdf-container .bg-muted\\/50 {
          background-color: rgb(243, 244, 246) !important;
        }
        #pdf-container .text-muted-foreground {
          color: rgb(107, 114, 128) !important;
        }
        #pdf-container .border {
          border-color: rgb(229, 231, 235) !important;
        }
        #pdf-container .bg-secondary {
          background-color: rgb(243, 244, 246) !important;
        }
      `
      document.head.appendChild(tempStyle)

      // Add temporary ID to the element for targeting
      const originalId = element.id
      element.id = "pdf-container"

      const canvas = await window.html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      })

      document.head.removeChild(tempStyle)
      element.id = originalId

      const imgData = canvas.toDataURL("image/png")
      const pdf = new window.jspdf.jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      })

      const imgWidth = 210 // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight)
      pdf.save(`itinerary-${itinerary.publicHash}.pdf`)

      toast.success("PDF downloaded successfully!")
    } catch (error) {
      console.error("Failed to generate PDF:", error)
      toast.error(`Failed to generate PDF: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  const handleShareEmail = () => {
    const subject = encodeURIComponent(`Itinerary: ${itinerary.tripName}`)
    const body = encodeURIComponent(
      `View your itinerary here: ${window.location.origin}/itineraries/${itinerary.publicHash}`,
    )
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  const handleEdit = () => {
    setShowEditDialog(true)
  }

  const handleSaveEdit = () => {
    if (!editForm) return

    try {
      // Update itinerary with edited data
      dispatch({
        type: "UPDATE_ITINERARY",
        payload: {
          id: itinerary.id,
          updates: {
            tripName: editForm.tripName,
            customer: {
              ...itinerary.customer,
              ...editForm.customer,
            },
            segments: itinerary.segments.map((seg) => {
              const editedSeg = editForm.segments.find((s: any) => s.id === seg.id)
              if (editedSeg) {
                return {
                  ...seg,
                  origin: editedSeg.origin,
                  destination: editedSeg.destination,
                  departureDate: editedSeg.departureDate,
                  departureTime: editedSeg.departureTime,
                  arrivalTime: editedSeg.arrivalTime,
                  passengers: editedSeg.passengers,
                  notes: editedSeg.notes,
                }
              }
              return seg
            }),
            workflowData: {
              ...itinerary.workflowData,
              preItineraryData: {
                ...itinerary.workflowData?.preItineraryData,
                operationalNotes: editForm.operationalNotes,
              },
            },
          },
        },
      })

      toast.success("Itinerary updated successfully!")
      setShowEditDialog(false)
    } catch (error) {
      console.error("Failed to update itinerary:", error)
      toast.error("Failed to update itinerary")
    }
  }

  const preItineraryData = itinerary.workflowData?.preItineraryData

  const displayCrew = itinerary.crewWithLegs || itinerary.crew || []

  return (
    <div className="min-h-screen bg-background">
      {/* Header Actions */}
      <div className="bg-background border-b sticky top-0 z-10">
        <div className="max-w-[800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-bold">{itinerary.tripName}</h1>
            </div>
            <div className="text-sm flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button variant="outline" size="sm" onClick={handleShareEmail}>
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
              <Button variant="default" size="sm" onClick={handleDownloadPDF}>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - PDF Container */}
      <div className="max-w-[800px] mx-auto px-6 py-8" ref={printRef}>
        <div className="space-y-4">
          {/* Client Information */}
          <Card>
            <CardContent>
              <div className="space-y-1">
                <div>
                  <p className="text-base font-medium">{itinerary.customer.name}</p>
                </div>

                <div className="mb-2">
                  <p className="text-xs font-medium">
                    {itinerary.customer.email} / {itinerary.customer.phone}
                  </p>
                </div>
              </div>

              {/* Flight Schedule */}

              <Card>
                <CardContent>
                  <div className="space-y-4">
                    {itinerary.segments.map((segment, index) => (
                      <div
                        key={segment.id}
                        className="text-xs flex items-start gap-4 pb-4 border-b last:border-0 last:pb-0"
                      >
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="font-semibold text-primary">{index + 1}</span>
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold">
                              {segment.origin} → {segment.destination}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <p className="text-muted-foreground">Departure</p>
                              <p className="font-medium">
                                {segment.departureDate ? formatDate(segment.departureDate) : "Date TBD"} at{" "}
                                {segment.departureTime || "Time TBD"}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Arrival</p>
                              <p className="font-medium">
                                {segment.arrivalDate ? formatDate(segment.arrivalDate) : "Date TBD"} at{" "}
                                {segment.arrivalTime || "Time TBD"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            {/* Selected Flight Crew */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">Selected Flight Crew</CardTitle>
              </CardHeader>
              <CardContent>
                {displayCrew && displayCrew.length > 0 ? (
                  <div className="text-xs space-y-4">
                    {displayCrew.map((crew) => {
                      const crewSegments = itinerary.segments.filter((segment) =>
                        crew.assignedLegIds?.includes(segment.legId || segment.id),
                      )

                      return (
                        <div key={crew.id} className="flex items-start gap-4 pb-4 border-b last:border-0 last:pb-0">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={crew.avatar || "/placeholder.svg"} alt={crew.name} />
                            <AvatarFallback>
                              {crew.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-xs font-semibold">{crew.name}</p>
                              <Badge variant="secondary">{crew.role}</Badge>
                            </div>

                            <div className="grid grid-cols-2 text-xs">
                              <div>
                                <p className="text-muted-foreground">Experience</p>
                                <p className="font-medium">{crew.yearsOfExperience} years</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Flight Hours</p>
                                <p className="font-medium">{crew.totalFlightHours?.toLocaleString()} hrs</p>
                              </div>
                            </div>

                            {crewSegments.length > 0 && (
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">Assigned to</p>
                                <div className="flex flex-wrap gap-1">
                                  {crewSegments.map((segment, segIndex) => (
                                    <Badge key={segment.id} variant="outline" className="text-xs">
                                      Leg {segIndex + 1}: {segment.origin} → {segment.destination}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="text-xs text-muted-foreground space-y-1">
                              <p className="flex items-center gap-2">
                                <Phone className="h-3 w-3" />
                                {crew.phone}
                              </p>
                              <p className="flex items-center gap-2">
                                <Mail className="h-3 w-3" />
                                {crew.email}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    No crew members assigned yet. Please complete the Pre-Itinerary Data Entry to add crew.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Aircraft Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center">
                  {itinerary.aircraft.model.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {itinerary.aircraft.model.images && itinerary.aircraft.model.images.length > 0 && (
                  <div className="space-y-2">
                    {/* Main Image */}
                    <div className="relative w-full h-48 rounded-lg overflow-hidden">
                      <Image
                        src={itinerary.aircraft.model.images[selectedImageIndex] || "/placeholder.svg"}
                        alt={itinerary.aircraft.model.name}
                        fill
                        className="object-cover"
                      />
                    </div>

                    {/* Thumbnail Gallery - only show if there are multiple images */}
                    {itinerary.aircraft.model.images.length > 1 && (
                      <div className="flex gap-2">
                        {itinerary.aircraft.model.images.slice(0, 3).map((image, index) => (
                          <button
                            key={index}
                            onClick={() => setSelectedImageIndex(index)}
                            className={`relative w-16 h-16 rounded-md overflow-hidden border-2 transition-all ${
                              selectedImageIndex === index
                                ? "border-primary ring-2 ring-primary/20"
                                : "border-transparent hover:border-muted-foreground/20"
                            }`}
                          >
                            <Image
                              src={image || "/placeholder.svg"}
                              alt={`${itinerary.aircraft.model.name} view ${index + 1}`}
                              fill
                              className="object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Manufacturer</p>
                    <p className="text-xs font-medium">{itinerary.aircraft.model.manufacturer}</p>
                  </div>
                  
                  <div>
                    <p className="text-xs text-muted-foreground">Passengers</p>
                    <p className="text-xs font-medium">{itinerary.aircraft.model.defaultCapacity} passengers</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Speed</p>
                    <p className="text-xs font-medium">{itinerary.aircraft.model.defaultSpeedKnots} knots</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Range</p>
                    <p className="text-xs font-medium">{itinerary.aircraft.model.defaultRangeNm} nm</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Fixed Base Operators (FBOs) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">Fixed Base Operators (FBOs)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {itinerary.segments.map((segment, index) => (
                  <div key={segment.id} className="space-y-3 pb-4 border-b last:border-0 last:pb-0">
                    <div className="text-sm font-semibold">
                      Leg {index + 1}: {segment.origin} → {segment.destination}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Origin FBO</p>
                        {segment.fboOrigin ? (
                          <div className="space-y-1">
                            <p className="text-xs font-medium">{segment.fboOrigin.name}</p>
                            <p className="text-xs text-muted-foreground">{segment.fboOrigin.airportName}</p>
                            {segment.fboOrigin.phone && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {segment.fboOrigin.phone}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs font-medium text-muted-foreground">To be determined</p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Destination FBO</p>
                        {segment.fboDestination ? (
                          <div className="space-y-1">
                            <p className="text-xs font-medium">{segment.fboDestination.name}</p>
                            <p className="text-xs text-muted-foreground">{segment.fboDestination.airportName}</p>
                            {segment.fboDestination.phone && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {segment.fboDestination.phone}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs font-medium text-muted-foreground">To be determined</p>
                        )}
                      </div>
                    </div>
                    {segment.weatherForecast && (
                      <div className="bg-muted/50 rounded-lg p-3 mt-2">
                        <div className="flex items-center gap-2 mb-2">
                          <Cloud className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs font-medium">Weather Forecast</span>
                        </div>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          {typeof segment.weatherForecast === "string" ? (
                            <p>{segment.weatherForecast}</p>
                          ) : (
                            <>
                              {segment.weatherForecast.origin && (
                                <p>
                                  <span className="font-medium">{segment.origin}:</span>{" "}
                                  {segment.weatherForecast.origin}
                                </p>
                              )}
                              {segment.weatherForecast.destination && (
                                <p>
                                  <span className="font-medium">{segment.destination}:</span>{" "}
                                  {segment.weatherForecast.destination}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Passengers with Flight Legs */}
          {itinerary.allPassengers && itinerary.allPassengers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Passengers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {itinerary.allPassengers.map((passenger, pIndex) => {
                    // Simplified to just show leg assignments without detailed flight info
                    const passengerSegments = itinerary.segments.filter((segment) =>
                      passenger.assignedLegIds?.includes(segment.legId || segment.id),
                    )

                    return (
                      <Card key={pIndex} className="border-2">
                        <CardContent>
                          {/* Passenger Name */}
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <Users className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold">{passenger.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {passengerSegments.length} {passengerSegments.length === 1 ? "leg" : "legs"}
                              </p>
                            </div>
                          </div>

                          {/* Simplified flight legs display - just show route without dates/times */}
                          {passengerSegments.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground">Assigned to</p>
                              <div className="flex flex-wrap gap-2">
                                {passengerSegments.map((segment, segIndex) => (
                                  <Badge key={segment.id} variant="secondary" className="text-xs">
                                    Leg {segIndex + 1}: {segment.origin} → {segment.destination}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Passenger Requirements */}
                          {(passenger.hasSpecialRequests ||
                            passenger.hasDietaryRestrictions ||
                            passenger.hasAccessibilityNeeds) && (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground">Requirements</p>
                              <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 space-y-2">
                                {passenger.hasSpecialRequests && passenger.specialRequests && (
                                  <div className="flex items-start gap-2">
                                    <FileText className="h-3 w-3 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <p className="text-xs font-medium text-blue-900 dark:text-blue-100">
                                        Special Requests
                                      </p>
                                      <p className="text-xs text-blue-700 dark:text-blue-300">
                                        {passenger.specialRequests}
                                      </p>
                                    </div>
                                  </div>
                                )}
                                {passenger.hasDietaryRestrictions && passenger.dietaryRestrictions && (
                                  <div className="flex items-start gap-2">
                                    <FileText className="h-3 w-3 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <p className="text-xs font-medium text-blue-900 dark:text-blue-100">
                                        Dietary Restrictions
                                      </p>
                                      <p className="text-xs text-blue-700 dark:text-blue-300">
                                        {passenger.dietaryRestrictions}
                                      </p>
                                    </div>
                                  </div>
                                )}
                                {passenger.hasAccessibilityNeeds && passenger.accessibilityNeeds && (
                                  <div className="flex items-start gap-2">
                                    <FileText className="h-3 w-3 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <p className="text-xs font-medium text-blue-900 dark:text-blue-100">
                                        Accessibility Needs
                                      </p>
                                      <p className="text-xs text-blue-700 dark:text-blue-300">
                                        {passenger.accessibilityNeeds}
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Route Map */}

          <ItineraryRouteMap
            segments={itinerary.segments}
            customerName={itinerary.customer.name}
            tripName={itinerary.tripName}
          />

          {/* Operational Notes */}
          {preItineraryData?.operationalNotes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">Operational Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs whitespace-pre-wrap">{preItineraryData.operationalNotes}</p>
              </CardContent>
            </Card>
          )}

          {/* Need Assistance Section */}
          <Card>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Need Assistance? If you have any questions or need to make changes to your itinerary, please contact us:
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Phone className="h-2 w-2 text-muted-foreground" />
                  <span className="text-xs font-medium">+1 (555) 123-4567</span>
               
                  <Mail className="h-2 w-2 text-muted-foreground" />
                  <span className="text-xs font-medium">support@eliteaviation.com</span>
                
                  <Clock className="h-2 w-2 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Available 24/7</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Itinerary</DialogTitle>
            <DialogDescription>Make changes to the itinerary details below.</DialogDescription>
          </DialogHeader>

          {editForm && (
            <div className="space-y-6">
              {/* Trip Name */}
              <div className="space-y-2">
                <Label htmlFor="tripName">Trip Name</Label>
                <Input
                  id="tripName"
                  value={editForm.tripName}
                  onChange={(e) => setEditForm({ ...editForm, tripName: e.target.value })}
                />
              </div>

              {/* Customer Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Customer Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customerName">Name</Label>
                    <Input
                      id="customerName"
                      value={editForm.customer.name}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          customer: { ...editForm.customer, name: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerCompany">Company</Label>
                    <Input
                      id="customerCompany"
                      value={editForm.customer.company}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          customer: { ...editForm.customer, company: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerEmail">Email</Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      value={editForm.customer.email}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          customer: { ...editForm.customer, email: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerPhone">Phone</Label>
                    <Input
                      id="customerPhone"
                      value={editForm.customer.phone}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          customer: { ...editForm.customer, phone: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Flight Segments */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Flight Segments</h3>
                {editForm.segments.map((segment: any, index: number) => (
                  <Card key={segment.id}>
                    <CardHeader>
                      <CardTitle className="text-base">Segment {index + 1}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`origin-${index}`}>Origin</Label>
                          <Input
                            id={`origin-${index}`}
                            value={segment.origin}
                            onChange={(e) => {
                              const newSegments = [...editForm.segments]
                              newSegments[index].origin = e.target.value.toUpperCase()
                              setEditForm({ ...editForm, segments: newSegments })
                            }}
                            placeholder="ICAO Code"
                            maxLength={4}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`destination-${index}`}>Destination</Label>
                          <Input
                            id={`destination-${index}`}
                            value={segment.destination}
                            onChange={(e) => {
                              const newSegments = [...editForm.segments]
                              newSegments[index].destination = e.target.value.toUpperCase()
                              setEditForm({ ...editForm, segments: newSegments })
                            }}
                            placeholder="ICAO Code"
                            maxLength={4}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`departureDate-${index}`}>Departure Date</Label>
                          <Input
                            id={`departureDate-${index}`}
                            type="date"
                            value={segment.departureDate}
                            onChange={(e) => {
                              const newSegments = [...editForm.segments]
                              newSegments[index].departureDate = e.target.value
                              setEditForm({ ...editForm, segments: newSegments })
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`departureTime-${index}`}>Departure Time</Label>
                          <Input
                            id={`departureTime-${index}`}
                            type="time"
                            value={segment.departureTime}
                            onChange={(e) => {
                              const newSegments = [...editForm.segments]
                              newSegments[index].departureTime = e.target.value
                              setEditForm({ ...editForm, segments: newSegments })
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`arrivalTime-${index}`}>Arrival Time</Label>
                          <Input
                            id={`arrivalTime-${index}`}
                            type="time"
                            value={segment.arrivalTime}
                            onChange={(e) => {
                              const newSegments = [...editForm.segments]
                              newSegments[index].arrivalTime = e.target.value
                              setEditForm({ ...editForm, segments: newSegments })
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`passengers-${index}`}>Passengers</Label>
                          <Input
                            id={`passengers-${index}`}
                            type="number"
                            min="1"
                            value={segment.passengers}
                            onChange={(e) => {
                              const newSegments = [...editForm.segments]
                              newSegments[index].passengers = Number.parseInt(e.target.value) || 1
                              setEditForm({ ...editForm, segments: newSegments })
                            }}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`notes-${index}`}>Notes</Label>
                        <Textarea
                          id={`notes-${index}`}
                          value={segment.notes}
                          onChange={(e) => {
                            const newSegments = [...editForm.segments]
                            newSegments[index].notes = e.target.value
                            setEditForm({ ...editForm, segments: newSegments })
                          }}
                          placeholder="Add any notes for this segment..."
                          rows={2}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Operational Notes */}
              <div className="space-y-2">
                <Label htmlFor="operationalNotes">Operational Notes</Label>
                <Textarea
                  id="operationalNotes"
                  value={editForm.operationalNotes}
                  onChange={(e) => setEditForm({ ...editForm, operationalNotes: e.target.value })}
                  placeholder="Add any operational notes..."
                  rows={4}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit}>Save Changes</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
        }
        .airport-label {
          background: none !important;
          border: none !important;
        }
      `}</style>
    </div>
  )
}
