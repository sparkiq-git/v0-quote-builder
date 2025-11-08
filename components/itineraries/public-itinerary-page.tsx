"use client"

import { Separator } from "@/components/ui/separator"

import type React from "react"

import { TooltipContent } from "@/components/ui/tooltip"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import {
  Loader2,
  Calendar,
  Users,
  Plane,
  Mail,
  CheckCircle2,
  Cloud,
  Thermometer,
  Wind,
  Waves,
  Info,
  FileText,
  Sun,
  Sparkles,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tooltip, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useToast } from "@/hooks/use-toast"
import { useDeviceDetection } from "@/hooks/use-device-detection"
import { formatDate, formatDateTime, formatTimeAgo, formatAirportDisplay, formatAirportCode } from "@/lib/utils/format"
import { cn } from "@/lib/utils"

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

interface WeatherSummary {
  stationId: string
  metar?: {
    rawText?: string
    observationTime?: string
    temperatureC?: number | null
    dewpointC?: number | null
    wind?: string | null
    visibility?: string | null
    altimeter?: string | null
    flightCategory?: string | null
  }
  taf?: {
    rawText?: string
    issueTime?: string
    validFrom?: string | null
    validTo?: string | null
    forecastSummary?: string[]
  }
}

const FALLBACK_GALLERY = [
  "https://images.unsplash.com/photo-1514996937319-344454492b37?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1464037866556-68121c9d1c72e?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1600&q=80",
]

const FALLBACK_DESTINATION_IMAGERY = [
  "https://images.unsplash.com/photo-1455906876003-298dd855662d?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1600&q=80",
]

function generateGallery(tailNumber?: string | null) {
  if (!tailNumber) return FALLBACK_GALLERY
  const hash = tailNumber.split("").reduce((acc, char, index) => acc + char.charCodeAt(0) * (index + 7), 0)
  const images: string[] = []
  for (let i = 0; i < FALLBACK_GALLERY.length; i++) {
    images.push(FALLBACK_GALLERY[(hash + i) % FALLBACK_GALLERY.length])
  }
  return images
}

function ElegantConnector() {
  return (
    <div className="relative w-full h-4 md:h-5 overflow-hidden select-none" aria-hidden="true">
      <span className="absolute top-1/2 -translate-y-1/2 left-[12%] right-[55%] h-[2px] bg-gray-200 rounded" />
      <span className="absolute top-1/2 -translate-y-1/2 left-[55%] right-[12%] h-[2px] bg-gray-200 rounded" />
      <svg
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        width="14"
        height="10"
        viewBox="0 0 14 10"
        fill="none"
        aria-hidden="true"
      >
        <path d="M1 5h6.5M7 2l4 3-4 3" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="absolute left-[7%] top-1/2 -translate-y-1/2 w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-gray-600" />
      <span className="absolute right-[7%] top-1/2 -translate-y-1/2 w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-gray-600" />
    </div>
  )
}

function airportLabel(code?: string) {
  if (!code) return ""
  switch (code) {
    case "MIA":
      return "Miami, FL"
    case "TEB":
      return "Teterboro, NJ"
    case "SFO":
      return "San Francisco, CA"
    case "BOS":
      return "Boston, MA"
    case "FXE":
      return "Fort Lauderdale Exec, FL"
    default:
      return code
  }
}

function TripInfoControl({
  date,
  passengers,
  origin,
  destination,
  dialogId,
}: {
  date: string
  passengers: number
  origin: string
  destination: string
  dialogId: string
}) {
  return (
    <>
      <div className="hidden md:inline-flex">
        <Popover modal={true}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex h-6 w-6 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300"
              aria-label="Trip details"
            >
              <Info className="h-3.5 w-3.5 text-gray-500" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="left" align="center" sideOffset={8} className="w-64 p-3 border bg-white shadow-sm">
            <div className="space-y-1 text-xs leading-5 font-light">
              <div>
                <span className="font-medium">Date:</span> {date}
              </div>
              <div>
                <span className="font-medium">Passengers:</span> {passengers}
              </div>
              <div>
                <span className="font-medium">Origin:</span> {airportLabel(origin)}
              </div>
              <div>
                <span className="font-medium">Destination:</span> {airportLabel(destination)}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="md:hidden">
        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300"
              aria-label="Trip details"
            >
              <Info className="h-3.5 w-3.5 text-gray-500" />
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[360px]" aria-describedby={dialogId}>
            <DialogHeader>
              <DialogTitle>Trip details</DialogTitle>
              <DialogDescription id={dialogId}>Overview for this leg.</DialogDescription>
            </DialogHeader>
            <div className="space-y-1 text-xs leading-5 font-light">
              <div>
                <span className="font-medium">Date:</span> {date}
              </div>
              <div>
                <span className="font-medium">Passengers:</span> {passengers}
              </div>
              <div>
                <span className="font-medium">Origin:</span> {airportLabel(origin)}
              </div>
              <div>
                <span className="font-medium">Destination:</span> {airportLabel(destination)}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  )
}

function LegRow({ leg, index }: { leg: any; index: number }) {
  const codeCls =
    "font-semibold leading-none tracking-tight uppercase whitespace-nowrap text-[clamp(0.95rem,1.6vw,1.05rem)]"

  return (
    <div className="px-2 py-1.5 grid items-center gap-x-2 gap-y-1 [grid-template-columns:max-content_1fr_max-content_auto]">
      <div className="col-span-4 row-start-1 text-xs text-gray-500 mt-0.5 font-light">
        {formatDate(leg.depart_dt)}{" "}
        {leg.depart_time ? <span className="text-gray-400">• {leg.depart_time}</span> : null}
        {typeof leg.pax_count === "number" ? (
          <span className="ml-2 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">
            {leg.pax_count} pax
          </span>
        ) : null}
      </div>
      <div className="col-start-1 row-start-2">
        <div className={codeCls}>{leg.origin_code || leg.origin}</div>
      </div>
      <div className="col-start-2 row-start-2 min-w-0">
        <ElegantConnector />
      </div>
      <div className="col-start-3 row-start-2 justify-self-end">
        <div className={codeCls}>{leg.destination_code || leg.destination}</div>
      </div>
      <div className="col-start-4 row-span-2 self-center justify-self-end pr-1 md:pr-2">
        <TripInfoControl
          date={formatDate(leg.depart_dt)}
          passengers={leg.pax_count || 0}
          origin={leg.origin_code || leg.origin}
          destination={leg.destination_code || leg.destination}
          dialogId={`leg-${index + 1}-trip-info`}
        />
      </div>
    </div>
  )
}

export default function PublicItineraryPage({ token, verifiedEmail }: PublicItineraryPageProps) {
  const { toast } = useToast()
  const deviceInfo = useDeviceDetection()
  const [itinerary, setItinerary] = useState<Itinerary | null>(null)
  const [passengers, setPassengers] = useState<ItineraryPassenger[]>([])
  const [crew, setCrew] = useState<ItineraryCrewMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [weather, setWeather] = useState<Record<string, WeatherSummary>>({})
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [weatherError, setWeatherError] = useState<string | null>(null)
  const [tenantLogoUrl, setTenantLogoUrl] = useState<string | null>(null)
  const [heroIndex, setHeroIndex] = useState(0) // Added setHeroIndex

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

  useEffect(() => {
    if (!itinerary || itinerary.details.length === 0) return

    const airportCodes = Array.from(
      new Set(
        itinerary.details
          .flatMap((detail) => [detail.origin_code, detail.destination_code])
          .filter((code): code is string => typeof code === "string" && code.trim().length === 4)
          .map((code) => code.toUpperCase()),
      ),
    )

    if (airportCodes.length === 0) return

    const fetchWeather = async () => {
      setWeatherLoading(true)
      setWeatherError(null)
      try {
        const response = await fetch(`/api/weather/summary?ids=${airportCodes.join(",")}`)
        if (!response.ok) {
          const body = await response.json().catch(() => ({}))
          throw new Error(body.error || `Weather request failed: ${response.status}`)
        }
        const { data } = await response.json()
        setWeather(data || {})
      } catch (err: any) {
        console.error("Weather fetch error:", err)
        setWeatherError(err.message || "Unable to retrieve aviation weather right now.")
      } finally {
        setWeatherLoading(false)
      }
    }

    fetchWeather()
  }, [itinerary])

  useEffect(() => {
    const gallery = generateGallery(itinerary?.aircraft_tail_no)
    if (gallery.length <= 1) return
    const timer = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % gallery.length)
    }, 7000)
    return () => clearInterval(timer)
  }, [itinerary?.aircraft_tail_no])

  useEffect(() => {
    const loadLogo = async () => {
      try {
        if (!itinerary?.id) return
        const res = await fetch(
          `/api/tenant-logo?tenantId=${encodeURIComponent(process.env.NEXT_PUBLIC_TENANT_ID || "")}`,
        )
        if (!res.ok) return
        const json = await res.json()
        if (json?.logoUrl) setTenantLogoUrl(json.logoUrl)
      } catch (e) {
        // silent fail
      }
    }
    if (itinerary) loadLogo()
  }, [itinerary])

  const emailChip = useMemo(() => {
    if (!verifiedEmail) return null
    return (
      <div className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium border border-emerald-200 inline-flex items-center gap-2 shadow-sm">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Access verified for <span className="font-semibold">{verifiedEmail}</span>
      </div>
    )
  }, [verifiedEmail])

  const galleryImages = useMemo(() => generateGallery(itinerary?.aircraft_tail_no), [itinerary?.aircraft_tail_no])

  const tripStart = itinerary?.details?.[0]?.depart_dt || itinerary?.earliest_departure
  const tripEnd = itinerary?.details?.[itinerary.details.length - 1]?.arrive_dt || itinerary?.latest_return

  const destinationImagery = useMemo(() => {
    const codes = itinerary?.details
      ?.map((detail) => detail.destination_code || detail.destination)
      .filter((code): code is string => Boolean(code))

    if (!codes || codes.length === 0) return FALLBACK_DESTINATION_IMAGERY

    const uniqueCodes = Array.from(new Set(codes))
    const derivedImages: string[] = []

    uniqueCodes.forEach((code, index) => {
      derivedImages.push(FALLBACK_DESTINATION_IMAGERY[index % FALLBACK_DESTINATION_IMAGERY.length])
    })

    return derivedImages
  }, [itinerary?.details])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="flex flex-col items-center gap-4">
          <span className="inline-flex h-20 w-20 animate-spin rounded-full border-[6px] border-gray-300 border-t-gray-900"></span>
          <p className="text-sm font-medium text-gray-700">Loading your itinerary...</p>
        </div>
      </div>
    )
  }

  if (error || !itinerary) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 px-4">
        <Card className="max-w-md w-full shadow-2xl border-0 bg-white/90 backdrop-blur">
          <CardContent className="pt-10 pb-12 px-10 text-center space-y-4">
            <Plane className="h-10 w-10 mx-auto text-gray-600" />
            <h3 className="text-2xl font-semibold tracking-tight text-gray-900">Itinerary unavailable</h3>
            <p className="text-sm text-gray-600">
              {error || "We couldn't locate this itinerary. It may have been updated or the secure link has expired."}
            </p>
            <p className="text-xs text-gray-500">Please reach out to your concierge for a fresh link or assistance.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getLayoutClasses = () => {
    switch (deviceInfo.type) {
      case "mobile":
        return {
          container: "min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100",
          content: "p-2 sm:p-3 space-y-2 sm:space-y-3",
        }
      case "tablet":
        return {
          container: "min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100",
          content: "p-3 sm:p-4 md:p-5 space-y-3 sm:space-y-4 md:space-y-5",
        }
      case "desktop":
      case "large-desktop":
        return {
          container: "min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100",
          content: "p-4 sm:p-5 lg:p-6 space-y-4 sm:space-y-5 lg:space-y-6",
        }
      default:
        return {
          container: "min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100",
          content: "p-3 sm:p-4 space-y-3 sm:space-y-4",
        }
    }
  }

  const layoutClasses = getLayoutClasses()

  return (
    <div className={layoutClasses.container}>
      <div className={cn("mx-auto max-w-7xl", layoutClasses.content)}>
        {/* MOBILE & TABLET VIEW */}
        <div className={deviceInfo.type === "mobile" || deviceInfo.type === "tablet" ? "block" : "hidden"}>
          <div className="space-y-3 sm:space-y-4">
            {/* Header Card */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="pt-6">
                {/* Logo */}
                <div className="flex items-center gap-2 mb-4">
                  <img src={tenantLogoUrl || "/images/aero-iq-logo.png"} alt="Brand" className="h-12 w-auto" />
                </div>

                {/* Title and Status */}
                <div className="space-y-2">
                  {verifiedEmail && (
                    <div className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium border border-emerald-200 inline-flex items-center gap-2 shadow-sm mb-2">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {verifiedEmail}
                    </div>
                  )}
                  <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">
                    {itinerary.title || itinerary.trip_summary || "Your Private Journey"}
                  </h1>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {itinerary.trip_summary || "A bespoke travel experience curated exclusively for you."}
                  </p>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-600" />
                      <div>
                        <p className="text-xs text-gray-500">Created</p>
                        <p className="text-sm font-medium text-gray-900">{formatDate(itinerary.created_at)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                    <div className="flex items-center gap-2">
                      <Plane className="h-4 w-4 text-gray-600" />
                      <div>
                        <p className="text-xs text-gray-500">Legs</p>
                        <p className="text-sm font-medium text-gray-900">{itinerary.leg_count}</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-600" />
                      <div>
                        <p className="text-xs text-gray-500">Passengers</p>
                        <p className="text-sm font-medium text-gray-900">{itinerary.total_pax}</p>
                      </div>
                    </div>
                  </div>
                  {itinerary.aircraft_tail_no && (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <div className="flex items-center gap-2">
                        <Plane className="h-4 w-4 text-gray-600" />
                        <div>
                          <p className="text-xs text-gray-500">Tail</p>
                          <p className="text-sm font-medium text-gray-900">{itinerary.aircraft_tail_no}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Flight Timeline */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="divide-y divide-gray-200">
                  <p className="font-semibold text-sm py-1.5 text-gray-900">Flight Timeline</p>
                  {itinerary.details.map((leg, index) => (
                    <LegRow key={leg.id} leg={leg} index={index} />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Passengers */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="h-5 w-5 text-gray-600" />
                  Passengers
                </CardTitle>
                <CardDescription className="text-gray-600">Verified guests for this journey</CardDescription>
              </CardHeader>
              <CardContent>
                {passengers.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                    <Users className="mx-auto mb-3 h-8 w-8 text-gray-400" />
                    <p className="text-sm text-gray-600">Passenger roster will be finalized closer to departure.</p>
                  </div>
                ) : (
                  <TooltipProvider>
                    <div className="flex flex-wrap gap-4">
                      {passengers.map((assignment) => {
                        const passenger = assignment.passenger
                        const name = passenger?.full_name || "Guest"
                        const initials =
                          name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase() || "G"

                        return (
                          <Tooltip key={assignment.id} delayDuration={150}>
                            <TooltipTrigger asChild>
                              <div className="group flex flex-col items-center gap-2">
                                <div className="relative">
                                  <Avatar className="h-16 w-16 border-2 border-gray-300 transition duration-300 group-hover:-translate-y-1 group-hover:border-gray-600 group-hover:shadow-xl">
                                    <AvatarImage
                                      src={`/.jpg?key=zwd9b&key=rpfta&key=07jpd&height=64&width=64&query=${encodeURIComponent(name)}`}
                                      alt={name}
                                    />
                                    <AvatarFallback className="bg-gray-100 text-gray-700 text-lg font-semibold">
                                      {initials}
                                    </AvatarFallback>
                                  </Avatar>
                                </div>
                                <span className="text-xs font-medium text-gray-700">{name.split(" ")[0]}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs border border-gray-200 bg-white/95 backdrop-blur-xl text-gray-900 shadow-xl">
                              <div className="space-y-2">
                                <p className="text-sm font-semibold">{name}</p>
                                {passenger?.email && (
                                  <p className="text-xs text-gray-600 break-all">{passenger.email}</p>
                                )}
                                {passenger?.phone && <p className="text-xs text-gray-500">{passenger.phone}</p>}
                                {passenger?.company && (
                                  <Badge className="bg-gray-100 text-gray-700 border border-gray-300">
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

            {/* Crew */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Plane className="h-5 w-5 text-gray-600" />
                  Crew
                </CardTitle>
                <CardDescription className="text-gray-600">Your flight team</CardDescription>
              </CardHeader>
              <CardContent>
                {crew.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                    <Plane className="mx-auto mb-3 h-8 w-8 text-gray-400" />
                    <p className="text-sm text-gray-600">Crew assignments will be posted shortly.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {crew.map((member) => (
                      <div key={member.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{member.full_name || "Crew member"}</p>
                            <p className="text-xs uppercase tracking-wider text-gray-500 mt-1">{member.role}</p>
                          </div>
                          {member.confirmed ? (
                            <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-300">
                              Confirmed
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-gray-300 text-gray-600">
                              Pending
                            </Badge>
                          )}
                        </div>
                        {member.notes && (
                          <p className="mt-3 rounded-lg bg-white p-3 text-xs text-gray-600 leading-relaxed border border-gray-200">
                            {member.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contact */}
            {itinerary.contact && (
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-gray-900">Primary Contact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar className="h-10 w-10 border border-gray-300">
                        <AvatarFallback className="bg-gray-200 text-gray-700 font-semibold">
                          {itinerary.contact.full_name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{itinerary.contact.full_name}</p>
                        {itinerary.contact.company && (
                          <p className="text-xs text-gray-600">{itinerary.contact.company}</p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <span className="text-xs text-gray-600">{itinerary.contact.email}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full border-gray-300 text-gray-700 hover:bg-gray-100 bg-transparent"
                  >
                    Contact Concierge
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Weather */}
            {Object.keys(weather).length > 0 && (
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Cloud className="h-5 w-5 text-gray-600" />
                    Weather
                  </CardTitle>
                  <CardDescription className="text-gray-600">Current conditions at your airports</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(weather).map(([code, summary]) => (
                      <div key={code} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-semibold text-gray-900">{formatAirportCode(code)}</p>
                          <Badge className="bg-gray-200 text-gray-700 border border-gray-300">
                            {summary.metar?.flightCategory || "N/A"}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <Thermometer className="h-3.5 w-3.5 text-gray-500" />
                            <span className="text-gray-600">
                              {summary.metar?.temperatureC != null
                                ? `${Math.round(summary.metar.temperatureC)}°C`
                                : "—"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Wind className="h-3.5 w-3.5 text-gray-500" />
                            <span className="text-gray-600">{summary.metar?.wind || "Calm"}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {(itinerary.notes || itinerary.special_requirements) && (
              <div className="space-y-3">
                {itinerary.notes && (
                  <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold text-gray-900">Trip Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{itinerary.notes}</p>
                    </CardContent>
                  </Card>
                )}
                {itinerary.special_requirements && (
                  <Card className="shadow-lg border-0 bg-amber-50 border-amber-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold text-amber-900">Special Requirements</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-amber-800 leading-relaxed whitespace-pre-wrap">
                        {itinerary.special_requirements}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>

        {/* DESKTOP VIEW */}
        <div className={deviceInfo.type === "desktop" || deviceInfo.type === "large-desktop" ? "block" : "hidden"}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Header */}
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardContent className="pt-8">
                  <div className="flex items-center gap-2 mb-6">
                    <img src={tenantLogoUrl || "/images/aero-iq-logo.png"} alt="Brand" className="h-14 w-auto" />
                  </div>

                  <div className="space-y-4">
                    {verifiedEmail && (
                      <div className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium border border-emerald-200 inline-flex items-center gap-2 shadow-sm">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {verifiedEmail}
                      </div>
                    )}
                    <h1 className="text-4xl font-semibold tracking-tight text-gray-900">
                      {itinerary.title || itinerary.trip_summary || "Your Private Journey"}
                    </h1>
                    <p className="text-base text-gray-600 leading-relaxed max-w-3xl">
                      {itinerary.trip_summary || "A bespoke travel experience curated exclusively for you."}
                    </p>
                  </div>

                  <div className="grid grid-cols-4 gap-4 mt-6">
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <Calendar className="h-5 w-5 text-gray-600 mb-2" />
                      <p className="text-xs text-gray-500">Created</p>
                      <p className="text-sm font-medium text-gray-900">{formatDate(itinerary.created_at)}</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <Plane className="h-5 w-5 text-gray-600 mb-2" />
                      <p className="text-xs text-gray-500">Legs</p>
                      <p className="text-sm font-medium text-gray-900">{itinerary.leg_count}</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <Users className="h-5 w-5 text-gray-600 mb-2" />
                      <p className="text-xs text-gray-500">Passengers</p>
                      <p className="text-sm font-medium text-gray-900">{itinerary.total_pax}</p>
                    </div>
                    {itinerary.aircraft_tail_no && (
                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                        <Plane className="h-5 w-5 text-gray-600 mb-2" />
                        <p className="text-xs text-gray-500">Tail</p>
                        <p className="text-sm font-medium text-gray-900">{itinerary.aircraft_tail_no}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Flight Timeline */}
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="border-b border-gray-200 bg-gray-50">
                  <CardTitle className="text-lg font-semibold text-gray-900">Flight Timeline</CardTitle>
                  <CardDescription className="text-gray-600">Your complete journey schedule</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="divide-y divide-gray-200">
                    {itinerary.details.map((leg, index) => (
                      <LegRow key={leg.id} leg={leg} index={index} />
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Passengers */}
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Users className="h-5 w-5 text-gray-600" />
                    Passengers
                  </CardTitle>
                  <CardDescription className="text-gray-600">Verified guests for this journey</CardDescription>
                </CardHeader>
                <CardContent>
                  {passengers.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
                      <Users className="mx-auto mb-3 h-9 w-9 text-gray-400" />
                      <p className="text-sm text-gray-600">Passenger roster will be finalized closer to departure.</p>
                    </div>
                  ) : (
                    <TooltipProvider>
                      <div className="flex flex-wrap gap-6">
                        {passengers.map((assignment) => {
                          const passenger = assignment.passenger
                          const name = passenger?.full_name || "Guest"
                          const initials =
                            name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase() || "G"

                          return (
                            <Tooltip key={assignment.id} delayDuration={150}>
                              <TooltipTrigger asChild>
                                <div className="group flex flex-col items-center gap-2">
                                  <div className="relative">
                                    <Avatar className="h-20 w-20 border-2 border-gray-300 transition duration-300 group-hover:-translate-y-1 group-hover:border-gray-600 group-hover:shadow-xl">
                                      <AvatarImage
                                        src={`/.jpg?key=go3q0&key=0y51d&key=9b2na&height=80&width=80&query=${encodeURIComponent(name)}`}
                                        alt={name}
                                      />
                                      <AvatarFallback className="bg-gray-100 text-gray-700 text-xl font-semibold">
                                        {initials}
                                      </AvatarFallback>
                                    </Avatar>
                                  </div>
                                  <span className="text-sm font-medium text-gray-700">{name.split(" ")[0]}</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs border border-gray-200 bg-white/95 backdrop-blur-xl text-gray-900 shadow-xl">
                                <div className="space-y-2">
                                  <p className="text-sm font-semibold">{name}</p>
                                  {passenger?.email && (
                                    <p className="text-xs text-gray-600 break-all">{passenger.email}</p>
                                  )}
                                  {passenger?.phone && <p className="text-xs text-gray-500">{passenger.phone}</p>}
                                  {passenger?.company && (
                                    <Badge className="bg-gray-100 text-gray-700 border border-gray-300">
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

              {/* Notes */}
              {(itinerary.notes || itinerary.special_requirements) && (
                <div className="grid gap-6 lg:grid-cols-2">
                  {itinerary.notes && (
                    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold text-gray-900">Trip Notes</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{itinerary.notes}</p>
                      </CardContent>
                    </Card>
                  )}
                  {itinerary.special_requirements && (
                    <Card className="shadow-lg border-0 bg-amber-50 border-amber-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold text-amber-900">Special Requirements</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-amber-800 leading-relaxed whitespace-pre-wrap">
                          {itinerary.special_requirements}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-6">
              {/* Crew */}
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Plane className="h-5 w-5 text-gray-600" />
                    Crew
                  </CardTitle>
                  <CardDescription className="text-gray-600">Your flight team</CardDescription>
                </CardHeader>
                <CardContent>
                  {crew.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                      <Plane className="mx-auto mb-3 h-8 w-8 text-gray-400" />
                      <p className="text-sm text-gray-600">Crew assignments will be posted shortly.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {crew.map((member) => (
                        <div key={member.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{member.full_name || "Crew member"}</p>
                              <p className="text-xs uppercase tracking-wider text-gray-500 mt-1">{member.role}</p>
                            </div>
                            {member.confirmed ? (
                              <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-300">
                                Confirmed
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-gray-300 text-gray-600">
                                Pending
                              </Badge>
                            )}
                          </div>
                          {member.notes && (
                            <p className="mt-3 rounded-lg bg-white p-3 text-xs text-gray-600 leading-relaxed border border-gray-200">
                              {member.notes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Contact */}
              {itinerary.contact && (
                <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-900">Primary Contact</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="h-10 w-10 border border-gray-300">
                          <AvatarFallback className="bg-gray-200 text-gray-700 font-semibold">
                            {itinerary.contact.full_name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{itinerary.contact.full_name}</p>
                          {itinerary.contact.company && (
                            <p className="text-xs text-gray-600">{itinerary.contact.company}</p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-500" />
                          <span className="text-xs text-gray-600">{itinerary.contact.email}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full border-gray-300 text-gray-700 hover:bg-gray-100 bg-transparent"
                    >
                      Contact Concierge
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Weather */}
              {Object.keys(weather).length > 0 && (
                <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <Cloud className="h-4 w-4 text-gray-600" />
                      Weather
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(weather).map(([code, summary]) => (
                        <div key={code} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-gray-900">{formatAirportCode(code)}</p>
                            <Badge className="bg-gray-200 text-gray-700 border border-gray-300 text-xs">
                              {summary.metar?.flightCategory || "N/A"}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex items-center gap-1.5">
                              <Thermometer className="h-3 w-3 text-gray-500" />
                              <span className="text-gray-600">
                                {summary.metar?.temperatureC != null
                                  ? `${Math.round(summary.metar.temperatureC)}°C`
                                  : "—"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Wind className="h-3 w-3 text-gray-500" />
                              <span className="text-gray-600">{summary.metar?.wind || "Calm"}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function HeroSection({
  itinerary,
  galleryImages,
  heroIndex,
  emailChip,
}: {
  itinerary: Itinerary
  galleryImages: string[]
  heroIndex: number
  emailChip: React.ReactNode
}) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/70 via-slate-900/40 to-slate-900/80 shadow-2xl backdrop-blur">
      <div
        className="absolute inset-0 opacity-70 transition-opacity duration-700"
        style={{
          backgroundImage: `url(${galleryImages[heroIndex]})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-slate-900/80 to-slate-950/90" />

      <div className="relative grid gap-8 lg:grid-cols-[1.15fr_0.85fr] p-8 sm:p-10 lg:p-12">
        <div className="space-y-6">
          <Badge className="bg-emerald-500/10 text-emerald-200 border border-emerald-500/30 backdrop-blur-sm">
            Journey Preview
          </Badge>
          <div className="space-y-4">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-white">
              {itinerary.title || itinerary.trip_summary || "Your private escape awaits"}
            </h1>
            <p className="max-w-2xl text-base sm:text-lg text-slate-200 leading-relaxed">
              {itinerary.trip_summary ||
                "A bespoke travel experience curated exclusively for you. Explore the journey, review the crew, and preview real-time aviation weather before departure."}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {emailChip}
            {itinerary.trip_type && (
              <Badge className="bg-white/10 text-white border-white/20 uppercase tracking-wide">
                {itinerary.trip_type}
              </Badge>
            )}
            {itinerary.asap && (
              <Badge variant="destructive" className="uppercase tracking-wide">
                Priority Mission
              </Badge>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <HeroMetric icon={Calendar} label="Created" value={formatDate(itinerary.created_at)} />
            <HeroMetric icon={Plane} label="Flight Legs" value={`${itinerary.leg_count} legs`} />
            <HeroMetric icon={Users} label="Guests" value={`${itinerary.total_pax} passengers`} />
            {itinerary.earliest_departure && (
              <HeroMetric
                icon={Sun}
                label="First Wheels Up"
                value={formatDateTime(itinerary.earliest_departure)}
                subtle
              />
            )}
            {itinerary.latest_return && (
              <HeroMetric
                icon={MoonIcon}
                label="Final Touchdown"
                value={formatDateTime(itinerary.latest_return)}
                subtle
              />
            )}
            {itinerary.aircraft_tail_no && (
              <HeroMetric icon={Sparkles} label="Assigned Tail" value={itinerary.aircraft_tail_no} subtle />
            )}
          </div>
        </div>

        <div className="relative">
          <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur p-6 space-y-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-300" />
              Journey Snapshot
            </h2>

            <div className="grid gap-4 text-sm text-slate-200">
              {itinerary.details.slice(0, 2).map((detail) => (
                <JourneyHighlight key={detail.id} detail={detail} />
              ))}
              {itinerary.details.length > 2 && (
                <p className="text-xs text-slate-400">
                  + {itinerary.details.length - 2} additional leg{itinerary.details.length - 2 === 1 ? "" : "s"} curated
                  for you
                </p>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4 text-sm text-slate-200">
              <p className="font-medium text-white/90 mb-2">Concierge Note</p>
              <p className="text-sm leading-relaxed text-slate-300">
                Review the itinerary details below and reach out anytime for adjustments. We’ll monitor weather, crew,
                and passenger logistics up to departure.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function HeroMetric({
  icon: Icon,
  label,
  value,
  subtle,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  subtle?: boolean
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg",
        subtle ? "border-white/5 bg-white/5 backdrop-blur" : "border-white/10 bg-white/10 backdrop-blur-lg",
      )}
    >
      <div className="flex items-center gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-900/70 border border-white/10">
          <Icon className="h-4 w-4 text-emerald-300" />
        </span>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
          <p className="text-sm font-medium text-white">{value}</p>
        </div>
      </div>
    </div>
  )
}

function MoonIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M21 12.79A9 9 0 0 1 11.21 3a7 7 0 1 0 9.79 9.79Z"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function JourneyHighlight({ detail }: { detail: ItineraryDetail }) {
  const route =
    detail.origin_code && detail.destination_code
      ? `${formatAirportCode(detail.origin_code)} → ${formatAirportCode(detail.destination_code)}`
      : detail.origin || detail.destination
        ? `${detail.origin || "TBD"} → ${detail.destination || "TBD"}`
        : "Route to be assigned"

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <p className="text-xs uppercase tracking-[0.25em] text-emerald-300 mb-1.5">Leg {detail.seq}</p>
      <p className="text-sm font-medium text-white">{route}</p>
      <p className="text-xs text-slate-300 mt-1">
        {detail.depart_dt ? formatDateTime(detail.depart_dt) : "Schedule pending"} &bull; {detail.pax_count ?? "—"}{" "}
        passengers
      </p>
    </div>
  )
}

function GallerySection({
  galleryImages,
  destinationImagery,
}: {
  galleryImages: string[]
  destinationImagery: string[]
}) {
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Visual Moodboard</h2>
          <p className="text-sm text-slate-300">
            Aircraft inspiration paired with destination glimpses curated for your itinerary.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="relative h-72 sm:h-96 overflow-hidden rounded-3xl border border-white/10 shadow-xl">
            <Carousel images={galleryImages} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {galleryImages.slice(1, 3).map((img, index) => (
              <DrapedImage key={img} src={img} className={index === 0 ? "-rotate-1" : "rotate-1"} />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          {destinationImagery.slice(0, 3).map((img, index) => (
            <DestinationCard key={img} src={img} featured={index === 0} />
          ))}
        </div>
      </div>
    </section>
  )
}

function Carousel({ images }: { images: string[] }) {
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (images.length <= 1) return
    const timer = setInterval(() => {
      setActive((current) => (current + 1) % images.length)
    }, 6500)
    return () => clearInterval(timer)
  }, [images])

  return (
    <div className="relative h-full w-full">
      {images.map((image, index) => (
        <div
          key={`${image}-${index}`}
          className={cn(
            "absolute inset-0 transition-opacity duration-700 ease-out",
            index === active ? "opacity-100" : "opacity-0",
          )}
        >
          <Image
            src={image || "/placeholder.svg"}
            alt="Aircraft inspiration"
            fill
            className="object-cover"
            priority={index === 0}
            sizes="(max-width: 1024px) 100vw, 66vw"
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/50 via-slate-950/20 to-transparent" />
        </div>
      ))}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {images.map((_, index) => (
          <button
            key={index}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              index === active ? "w-6 bg-white" : "w-3 bg-white/40 hover:bg-white/70",
            )}
            onClick={() => setActive(index)}
            aria-label={`Show image ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}

function DrapedImage({ src, className }: { src: string; className?: string }) {
  return (
    <div
      className={cn(
        "relative h-48 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 shadow-xl",
        className,
      )}
    >
      <Image
        src={src || "/placeholder.svg"}
        alt="Aircraft detail"
        fill
        className="object-cover"
        sizes="(max-width: 640px) 100vw, 50vw"
      />
      <div className="absolute inset-0 bg-gradient-to-tr from-black/30 via-transparent to-black/10" />
    </div>
  )
}

function DestinationCard({ src, featured }: { src: string; featured?: boolean }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 shadow-lg",
        featured ? "h-56" : "h-36",
      )}
    >
      <Image
        src={src || "/placeholder.svg"}
        alt="Destination inspiration"
        fill
        className="object-cover"
        sizes="(max-width: 1024px) 100vw, 33vw"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/10 to-black/60" />
      <div className="absolute bottom-4 left-4">
        <p className="text-xs uppercase tracking-[0.4em] text-emerald-200 mb-1">Destination</p>
        <p className="text-sm font-medium text-white">Curated Experience</p>
      </div>
    </div>
  )
}

function ExperienceGrid({
  itinerary,
  passengers,
  crew,
}: {
  itinerary: Itinerary
  passengers: ItineraryPassenger[]
  crew: ItineraryCrewMember[]
}) {
  return (
    <section className="grid gap-6 lg:grid-cols-[2fr_1.2fr]">
      <PassengerManifest passengers={passengers} />
      <CrewManifest crew={crew} contact={itinerary.contact} />
    </section>
  )
}

function PassengerManifest({ passengers }: { passengers: ItineraryPassenger[] }) {
  return (
    <Card className="border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl">
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="text-xl font-semibold text-white flex items-center gap-2">
          <Users className="h-5 w-5 text-emerald-300" />
          Passenger Manifest
        </CardTitle>
        <CardDescription className="text-slate-300">
          Verified guests for this itinerary. Hover to reveal contact details.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {passengers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-10 text-center">
            <Users className="mx-auto mb-3 h-9 w-9 text-white/50" />
            <p className="text-sm text-slate-300">Passenger roster will be finalized closer to departure.</p>
          </div>
        ) : (
          <TooltipProvider>
            <div className="flex flex-wrap gap-6">
              {passengers.map((assignment) => {
                const passenger = assignment.passenger
                const name = passenger?.full_name || "Guest"
                const initials =
                  name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase() || "G"

                return (
                  <Tooltip key={assignment.id} delayDuration={150}>
                    <TooltipTrigger asChild>
                      <div className="group flex flex-col items-center gap-2">
                        <div className="relative">
                          <Avatar className="h-16 w-16 border-2 border-emerald-400/40 transition duration-300 group-hover:-translate-y-1 group-hover:border-emerald-300 group-hover:shadow-[0_25px_45px_rgba(16,185,129,0.25)]">
                            <AvatarFallback className="bg-emerald-500/10 text-emerald-200 text-lg font-semibold">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl opacity-0 transition group-hover:opacity-100" />
                        </div>
                        <span className="text-xs font-medium text-slate-200">{name.split(" ")[0]}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs border border-white/10 bg-slate-900/90 text-slate-50">
                      <div className="space-y-2">
                        <p className="text-sm font-semibold">{name}</p>
                        {passenger?.email && <p className="text-xs text-slate-300 break-all">{passenger.email}</p>}
                        {passenger?.phone && <p className="text-xs text-slate-400">{passenger.phone}</p>}
                        {passenger?.company && (
                          <Badge className="bg-emerald-500/15 text-emerald-200 border border-emerald-500/40">
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
  )
}

function CrewManifest({ crew, contact }: { crew: ItineraryCrewMember[]; contact?: Itinerary["contact"] }) {
  return (
    <div className="space-y-6">
      <Card className="border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl">
        <CardHeader className="space-y-1 pb-2">
          <CardTitle className="text-xl font-semibold text-white flex items-center gap-2">
            <Plane className="h-5 w-5 text-emerald-300" />
            Crew Lineup
          </CardTitle>
          <CardDescription className="text-slate-300">
            Experts leading your journey. Confirmations update in real-time.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {crew.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-10 text-center">
              <Plane className="mx-auto mb-3 h-9 w-9 text-white/50" />
              <p className="text-sm text-slate-300">Crew assignments will be posted shortly.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {crew.map((member) => (
                <div
                  key={member.id}
                  className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/8 via-white/5 to-white/10 p-4 shadow-inner"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">{member.full_name || "Crew member"}</p>
                      <p className="text-xs uppercase tracking-[0.3em] text-emerald-300 mt-1">{member.role}</p>
                    </div>
                    {member.confirmed ? (
                      <Badge className="bg-emerald-500/15 text-emerald-200 border border-emerald-500/40">
                        Confirmed
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-white/20 text-white/70">
                        Pending
                      </Badge>
                    )}
                  </div>
                  {member.notes && (
                    <p className="mt-3 rounded-lg bg-slate-900/60 p-3 text-xs text-slate-300 leading-relaxed">
                      {member.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-white">Primary Contact</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          {contact ? (
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border border-white/15">
                  <AvatarFallback className="bg-emerald-500/15 text-emerald-200 font-semibold">
                    {contact.full_name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-white">{contact.full_name}</p>
                  {contact.company && <p className="text-xs text-slate-300">{contact.company}</p>}
                </div>
              </div>
              <Separator className="my-4 bg-white/10" />
              <p className="text-xs text-slate-300 break-all">{contact.email}</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-slate-300">
              Contact details will be shared closer to departure.
            </div>
          )}
          <Button
            variant="outline"
            className="w-full border-emerald-500/50 text-emerald-200 hover:bg-emerald-500/20 hover:text-white bg-transparent"
          >
            Request Concierge Call
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function TimelineSection({ details }: { details: ItineraryDetail[] }) {
  if (details.length === 0) return null

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl">
      <div className="border-b border-white/10 px-8 py-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Flight Timeline</h2>
          <p className="text-sm text-slate-300">Key waypoints, local times, and passenger considerations.</p>
        </div>
        <Badge className="bg-white/15 text-white border-white/20">
          {details.length} Leg{details.length === 1 ? "" : "s"}
        </Badge>
      </div>

      <div className="divide-y divide-white/10">
        {details.map((detail, index) => {
          const isLast = index === details.length - 1
          const originDisplay = detail.origin_code
            ? formatAirportDisplay(detail.origin_code, detail.origin || undefined)
            : detail.origin || "Origin TBA"
          const destinationDisplay = detail.destination_code
            ? formatAirportDisplay(detail.destination_code, detail.destination || undefined)
            : detail.destination || "Destination TBA"

          return (
            <div key={detail.id} className="px-8 py-6">
              <div className="grid gap-6 lg:grid-cols-[240px_1fr_220px]">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.35em] text-emerald-200">Leg {detail.seq}</p>
                  <p className="text-sm font-medium text-white">{originDisplay}</p>
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-gradient-to-r from-emerald-400 via-emerald-300 to-transparent" />
                    <Plane className="h-3.5 w-3.5 text-emerald-300" />
                    <div className="h-px flex-1 bg-gradient-to-l from-emerald-400 via-emerald-300 to-transparent" />
                  </div>
                  <p className="text-sm font-medium text-white">{destinationDisplay}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <TimelineCard
                    icon={Calendar}
                    label="Departure"
                    value={detail.depart_dt ? formatDateTime(detail.depart_dt) : "Pending"}
                    supporting={detail.depart_time || undefined}
                  />
                  <TimelineCard
                    icon={ClockIcon}
                    label="Arrival"
                    value={detail.arrive_dt ? formatDateTime(detail.arrive_dt) : "Pending"}
                    supporting={detail.arrive_time || undefined}
                  />
                  <TimelineCard
                    icon={Users}
                    label="Passenger Count"
                    value={detail.pax_count != null ? `${detail.pax_count} guests` : "Finalize soon"}
                    subtle
                  />
                  <TimelineCard
                    icon={FileText}
                    label="Crew Notes"
                    value={detail.notes || "Reviewed and cleared."}
                    subtle
                  />
                </div>
                <div className="flex flex-col justify-between">
                  <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-sm text-slate-300 leading-relaxed">
                    <p>
                      <span className="font-medium text-white">Local time advisory:</span>{" "}
                      {detail.depart_dt ? formatTimeAgo(detail.depart_dt) : "schedule pending"} from departure. Our team
                      tracks ops updates every hour.
                    </p>
                  </div>
                  {!isLast && (
                    <p className="mt-4 text-xs text-slate-500">
                      Ground handling confirmed • Customs coordination ready • Crew rest windows verified
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function TimelineCard({
  icon: Icon,
  label,
  value,
  supporting,
  subtle,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  supporting?: string
  subtle?: boolean
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        subtle ? "border-white/8 bg-white/5" : "border-white/12 bg-slate-900/55 shadow-inner",
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-400/30">
          <Icon className="h-4 w-4 text-emerald-300" />
        </span>
        <div>
          <p className="text-xs uppercase tracking-[0.32em] text-emerald-200">{label}</p>
          <p className="mt-2 text-sm font-medium text-white leading-snug">{value}</p>
          {supporting && <p className="text-xs text-slate-400 mt-1">{supporting}</p>}
        </div>
      </div>
    </div>
  )
}

function ClockIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={1.5} />
      <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function WeatherSection({
  itinerary,
  weather,
  loading,
  error,
}: {
  itinerary: Itinerary
  weather: Record<string, WeatherSummary>
  loading: boolean
  error: string | null
}) {
  const airports = useMemo(() => {
    return Array.from(
      new Set(
        itinerary.details
          .flatMap((detail) => [
            detail.origin_code ? detail.origin_code.toUpperCase() : null,
            detail.destination_code ? detail.destination_code.toUpperCase() : null,
          ])
          .filter((code): code is string => Boolean(code)),
      ),
    )
  }, [itinerary.details])

  if (airports.length === 0) return null

  return (
    <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-900/85 backdrop-blur-xl shadow-2xl">
      <div className="border-b border-white/10 px-8 py-6 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Cloud className="h-5 w-5 text-emerald-300" />
          <h2 className="text-xl font-semibold text-white">Aviation Weather Outlook</h2>
        </div>
        <p className="text-sm text-slate-300">
          Live METAR and TAF briefing sourced from AviationWeather.gov for your departure and arrival aerodromes.
        </p>
        <p className="text-xs text-slate-500">
          Data courtesy of the{" "}
          <a
            href="https://aviationweather.gov/data/api/#api"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-200 underline-offset-2 hover:underline"
          >
            Aviation Weather Center data API
          </a>
          .
        </p>
      </div>

      <div className="px-8 py-6">
        {loading ? (
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-300" />
            Retrieving latest conditions...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error} We’ll continue monitoring on your behalf.
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {airports.map((code) => (
              <WeatherCard key={code} code={code} summary={weather[code]} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function WeatherCard({ code, summary }: { code: string; summary?: WeatherSummary }) {
  const metar = summary?.metar
  const taf = summary?.taf

  const temperature =
    metar?.temperatureC != null
      ? `${Math.round(metar.temperatureC)}ºC / ${Math.round((metar.temperatureC * 9) / 5 + 32)}ºF`
      : null
  const dewpoint = metar?.dewpointC != null ? `${Math.round(metar.dewpointC)}ºC` : null
  const flightCategory = metar?.flightCategory || "N/A"

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-inner space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">Airport</p>
          <p className="text-lg font-semibold text-white">{formatAirportCode(code)}</p>
        </div>
        <Badge className="bg-white/10 text-white border-white/20">{flightCategory}</Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <WeatherMetric icon={Thermometer} label="Temperature" value={temperature || "—"} />
        <WeatherMetric icon={Wind} label="Wind" value={metar?.wind || "Calm"} />
        <WeatherMetric icon={Waves} label="Visibility" value={metar?.visibility || "—"} />
        <WeatherMetric icon={GaugeIcon} label="Altimeter" value={metar?.altimeter || "—"} />
        <WeatherMetric icon={DropletIcon} label="Dew Point" value={dewpoint || "—"} subtle />
        <WeatherMetric
          icon={ClockIcon}
          label="Observed"
          value={metar?.observationTime ? formatTimeAgo(metar.observationTime) : "Pending"}
          subtle
        />
      </div>

      {metar?.rawText && (
        <div className="rounded-xl border border-white/10 bg-black/40 p-3">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-400 mb-1.5">Raw METAR</p>
          <p className="text-xs font-mono text-slate-200">{metar.rawText}</p>
        </div>
      )}

      {taf?.rawText && (
        <div className="rounded-xl border border-white/10 bg-black/35 p-3 space-y-2">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-400">TAF Snapshot</p>
          <p className="text-xs text-slate-300 leading-relaxed">
            {taf.forecastSummary?.slice(0, 2).join(" • ") || taf.rawText}
          </p>
          <details className="group">
            <summary className="text-xs text-emerald-300 cursor-pointer hover:text-emerald-200">
              View full forecast
            </summary>
            <pre className="mt-2 whitespace-pre-wrap text-[11px] text-slate-300 font-mono leading-relaxed">
              {taf.rawText}
            </pre>
          </details>
        </div>
      )}
    </div>
  )
}

function WeatherMetric({
  icon: Icon,
  label,
  value,
  subtle,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  subtle?: boolean
}) {
  return (
    <div className={cn("rounded-xl border p-3", subtle ? "border-white/5 bg-white/3" : "border-white/8 bg-white/6")}>
      <div className="flex items-center gap-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-400/30">
          <Icon className="h-4 w-4 text-emerald-200" />
        </span>
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">{label}</p>
          <p className="text-sm font-medium text-white mt-1">{value}</p>
        </div>
      </div>
    </div>
  )
}

function GaugeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M12 21a9 9 0 1 0-9-9"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="m12 12 6.5-4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle
        cx="12"
        cy="12"
        r="2"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M3 21h6" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 17h4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function DropletIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M12 21a7 7 0 0 0 7-7c0-5-7-11-7-11s-7 6-7 11a7 7 0 0 0 7 7Z"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function NotesSection({ itinerary }: { itinerary: Itinerary }) {
  if (!itinerary.notes && !itinerary.special_requirements) return null

  return (
    <section className="grid gap-6 lg:grid-cols-2">
      {itinerary.notes && (
        <Card className="border-white/10 bg-gradient-to-br from-emerald-600/15 via-emerald-500/5 to-slate-900/60 backdrop-blur-xl shadow-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-white">Mission Notes</CardTitle>
            <CardDescription className="text-slate-200">
              Highlights, preferences, and concierge reminders for this journey.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-sm leading-relaxed text-slate-100 whitespace-pre-wrap">{itinerary.notes}</p>
          </CardContent>
        </Card>
      )}

      {itinerary.special_requirements && (
        <Card className="border-white/10 bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-slate-900/60 backdrop-blur-xl shadow-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-white">Special Requirements</CardTitle>
            <CardDescription className="text-slate-100">
              Critical accommodations or requests for crew and ground teams.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-sm leading-relaxed text-slate-100 whitespace-pre-wrap">
              {itinerary.special_requirements}
            </p>
          </CardContent>
        </Card>
      )}
    </section>
  )
}

function ConciergeFooter({ contact }: { contact?: Itinerary["contact"] }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-gradient-to-r from-emerald-600/20 via-emerald-500/10 to-blue-500/15 backdrop-blur-xl shadow-2xl p-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.4em] text-emerald-200">Concierge Desk</p>
        <h3 className="text-2xl font-semibold text-white">Need to refine the experience?</h3>
        <p className="text-sm text-emerald-100">
          Our team is on standby for manifest updates, culinary preferences, ground transfers, and real-time weather
          monitoring.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {contact?.email && (
          <Button asChild className="bg-white text-slate-900 hover:bg-slate-100 shadow-lg">
            <a href={`mailto:${contact.email}`}>Email {contact.full_name.split(" ")[0]}</a>
          </Button>
        )}
        <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 bg-transparent">
          Arrange a call
        </Button>
      </div>
    </section>
  )
}
