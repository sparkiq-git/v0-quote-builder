"use client"

import { useMemo, useState, useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Minus, Users, FileText, Activity, MapPin, RotateCcw } from "lucide-react"
import { useMockStore } from "@/lib/mock/store"
import { formatTimeAgo } from "@/lib/utils/format"
import { getAirportCoordinates } from "@/lib/data/airports"
import type { Event, Leg } from "@/lib/types"

type FilterType = "leads" | "quotes" | "unpaid" | "paid" | "upcoming"

interface RouteData {
  id: string
  type: FilterType
  legs: Leg[]
  customerName: string
  status: string
  createdAt: string
}

declare global {
  interface Window {
    L: any
  }
}

const US_CENTER = [39.8, -98.6] // [lat, lng] for Leaflet
const US_ZOOM = 4

export function RouteMap() {
  const [activeFilter, setActiveFilter] = useState<FilterType>("leads")
  const [hoveredRoute, setHoveredRoute] = useState<string | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const routeLayers = useRef<any[]>([])
  const airportMarkers = useRef<any[]>([])
  const { state } = useMockStore()

  // Process data for each filter type
  const filterData = useMemo(() => {
    const leads = state.leads
      .filter((lead) => lead.status === "pending" || lead.status === "new")
      .map((lead) => ({
        id: lead.id,
        type: "leads" as FilterType,
        legs: lead.legs,
        customerName: lead.customer.name,
        status: "Lead",
        createdAt: lead.createdAt,
      }))

    const quotes = state.quotes
      .filter((quote) => quote.status === "pending_acceptance")
      .map((quote) => ({
        id: quote.id,
        type: "quotes" as FilterType,
        legs: quote.legs,
        customerName: quote.customer.name,
        status: "Quote",
        createdAt: quote.createdAt,
      }))

    const unpaid = state.quotes
      .filter((quote) => quote.status === "awaiting_payment")
      .map((quote) => ({
        id: quote.id,
        type: "unpaid" as FilterType,
        legs: quote.legs,
        customerName: quote.customer.name,
        status: "Unpaid",
        createdAt: quote.createdAt,
      }))

    const paid = state.quotes
      .filter((quote) => quote.status === "paid")
      .map((quote) => ({
        id: quote.id,
        type: "paid" as FilterType,
        legs: quote.legs,
        customerName: quote.customer.name,
        status: "Paid",
        createdAt: quote.createdAt,
      }))

    const upcoming = state.quotes
      .filter((quote) => {
        if (quote.status !== "paid") return false
        const now = new Date()
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
        return quote.legs.some((leg) => {
          const departureDate = new Date(leg.departureDate)
          return departureDate >= now && departureDate <= nextWeek
        })
      })
      .map((quote) => ({
        id: quote.id,
        type: "upcoming" as FilterType,
        legs: quote.legs,
        customerName: quote.customer.name,
        status: "Upcoming",
        createdAt: quote.createdAt,
      }))

    return { leads, quotes, unpaid, paid, upcoming }
  }, [state.leads, state.quotes])

  // Get routes for active filter (max 10, most recent first)
  const activeRoutes = useMemo(() => {
    const routes = filterData[activeFilter]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)

    // Process routes for visualization
    const processedRoutes: Array<{
      id: string
      customerName: string
      status: string
      legs: Array<{
        origin: string
        destination: string
        originCoords?: { lat: number; lng: number; name: string }
        destCoords?: { lat: number; lng: number; name: string }
      }>
    }> = []

    routes.forEach((route) => {
      const processedLegs = route.legs.map((leg) => ({
        origin: leg.origin,
        destination: leg.destination,
        originCoords: getAirportCoordinates(leg.origin),
        destCoords: getAirportCoordinates(leg.destination),
      }))

      processedRoutes.push({
        id: route.id,
        customerName: route.customerName,
        status: route.status,
        legs: processedLegs,
      })
    })

    return processedRoutes
  }, [activeFilter, filterData])

  useEffect(() => {
    if (!mapContainer.current) return

    const loadLeaflet = async () => {
      try {
        console.log("[v0] Initializing map with refresh key:", refreshKey)

        if (!window.L) {
          // Load Leaflet CSS and JS
          const link = document.createElement("link")
          link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          link.rel = "stylesheet"
          link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          link.crossOrigin = ""
          document.head.appendChild(link)

          const script = document.createElement("script")
          script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
          script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
          script.crossOrigin = ""
          script.onload = () => initializeMap()
          document.head.appendChild(script)
        } else {
          initializeMap()
        }
      } catch (error) {
        console.error("Failed to load Leaflet:", error)
        setMapError("Failed to load map library. Please check your internet connection.")
      }
    }

    const initializeMap = () => {
      if (map.current) {
        console.log("[v0] Removing existing map instance")
        map.current.remove()
        map.current = null
      }

      try {
        console.log("[v0] Creating new map instance")
        map.current = window.L.map(mapContainer.current!, {
          center: US_CENTER,
          zoom: US_ZOOM,
          zoomControl: false, // We'll use custom controls
          attributionControl: false,
          scrollWheelZoom: false, // Disable scroll wheel zoom
          doubleClickZoom: false, // Disable double-click zoom
          touchZoom: true, // Keep touch zoom for mobile
          boxZoom: false, // Disable box zoom
        })

        window.L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
          attribution: "© OpenStreetMap contributors © CARTO",
          maxZoom: 18,
          subdomains: "abcd",
        }).addTo(map.current)

        // Add custom attribution
        window.L.control
          .attribution({
            position: "bottomright",
            prefix: false,
          })
          .addTo(map.current)

        setMapLoaded(true)
        setMapError(null)
        console.log("[v0] Map initialized successfully")
      } catch (error) {
        console.error("Failed to initialize Leaflet:", error)
        setMapError("Failed to initialize map. Please refresh the page.")
      }
    }

    loadLeaflet()

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [refreshKey])

  useEffect(() => {
    if (!map.current || !mapLoaded) return

    console.log("[v0] Updating routes, active routes count:", activeRoutes.length)

    // Clear existing layers
    routeLayers.current.forEach((layer) => {
      map.current.removeLayer(layer)
    })
    airportMarkers.current.forEach((marker) => {
      map.current.removeLayer(marker)
    })
    routeLayers.current = []
    airportMarkers.current = []

    if (activeRoutes.length === 0) return

    const primaryColor = "#2563eb" // Single blue color for all routes

    const processedAirports = new Set<string>()
    const allCoordinates: [number, number][] = []

    activeRoutes.forEach((route, routeIndex) => {
      const color = "black"

      route.legs.forEach((leg) => {
        if (leg.originCoords && leg.destCoords) {
          const originLatLng: [number, number] = [leg.originCoords.lat, leg.originCoords.lng]
          const destLatLng: [number, number] = [leg.destCoords.lat, leg.destCoords.lng]

          allCoordinates.push(originLatLng, destLatLng)

          // Create route line with custom styling
          const routeLine = window.L.polyline([originLatLng, destLatLng], {
            color: color,
            weight: 1.5,
            opacity: 0.7,
            dashArray: "3, 2",
            className: `route-${route.id}`,
          }).addTo(map.current)

          routeLine.on("click", () => {
            const routeInfo = `
              <div class="text-sm space-y-2">
                <div class="font-semibold text-base">${route.customerName}</div>
                <div class="text-gray-600">
                  <strong>Route:</strong> ${leg.origin} → ${leg.destination}
                </div>
                <div class="text-gray-600">
                  <strong>Status:</strong> <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">${route.status}</span>
                </div>
                <div class="text-gray-600">
                  <strong>Customer:</strong> ${route.customerName}
                </div>
                <div class="text-gray-600">
                  <strong>Route ID:</strong> ${route.id}
                </div>
              </div>
            `
            routeLine.bindPopup(routeInfo).openPopup()
          })

          // Add hover effects
          routeLine.on("mouseover", () => {
            routeLine.setStyle({ weight: 2, opacity: 0.9 })
          })

          routeLine.on("mouseout", () => {
            routeLine.setStyle({ weight: 1.5, opacity: 0.7 })
          })

          routeLayers.current.push(routeLine)

          if (!processedAirports.has(leg.origin)) {
            const originMarker = window.L.marker(originLatLng, {
              icon: window.L.divIcon({
                html: `
                  <div class="airport-pointer">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#1f2937" stroke="#ffffff" strokeWidth="2"/>
                      <circle cx="12" cy="9" r="2.5" fill="#ffffff"/>
                    </svg>
                  </div>
                `,
                className: "airport-pointer-container",
                iconSize: [24, 32],
                iconAnchor: [12, 32],
              }),
            }).addTo(map.current)

            originMarker.on("click", () => {
              const airportInfo = `
                <div class="text-sm space-y-2">
                  <div class="font-semibold text-base">${leg.origin}</div>
                  <div class="text-gray-600">
                    <strong>Airport:</strong> ${leg.originCoords.name}
                  </div>
                  <div class="text-gray-600">
                    <strong>Coordinates:</strong> ${leg.originCoords.lat.toFixed(4)}, ${leg.originCoords.lng.toFixed(4)}
                  </div>
                  <div class="text-gray-600">
                    <strong>Routes from here:</strong> ${activeRoutes.filter((r) => r.legs.some((l) => l.origin === leg.origin)).length}
                  </div>
                </div>
              `
              originMarker.bindPopup(airportInfo).openPopup()
            })

            airportMarkers.current.push(originMarker)
            processedAirports.add(leg.origin)
          }

          if (!processedAirports.has(leg.destination)) {
            const destMarker = window.L.marker(destLatLng, {
              icon: window.L.divIcon({
                html: `
                  <div class="airport-pointer">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#1f2937" stroke="#ffffff" strokeWidth="2"/>
                      <circle cx="12" cy="9" r="2.5" fill="#ffffff"/>
                    </svg>
                  </div>
                `,
                className: "airport-pointer-container",
                iconSize: [24, 32],
                iconAnchor: [12, 32],
              }),
            }).addTo(map.current)

            destMarker.on("click", () => {
              const airportInfo = `
                <div class="text-sm space-y-2">
                  <div class="font-semibold text-base">${leg.destination}</div>
                  <div class="text-gray-600">
                    <strong>Airport:</strong> ${leg.destCoords.name}
                  </div>
                  <div class="text-gray-600">
                    <strong>Coordinates:</strong> ${leg.destCoords.lat.toFixed(4)}, ${leg.destCoords.lng.toFixed(4)}
                  </div>
                  <div class="text-gray-600">
                    <strong>Routes to here:</strong> ${activeRoutes.filter((r) => r.legs.some((l) => l.destination === leg.destination)).length}
                  </div>
                </div>
              `
              destMarker.bindPopup(airportInfo).openPopup()
            })

            airportMarkers.current.push(destMarker)
            processedAirports.add(leg.destination)
          }

          const midLat = (leg.originCoords.lat + leg.destCoords.lat) / 2
          const midLng = (leg.originCoords.lng + leg.destCoords.lng) / 2

          // Calculate rotation angle for airplane icon
          const angle =
            (Math.atan2(leg.destCoords.lat - leg.originCoords.lat, leg.destCoords.lng - leg.originCoords.lng) * 180) /
            Math.PI

          const airplane = window.L.marker([midLat, midLng], {
            icon: window.L.divIcon({
              html: `
                <div class="airplane-icon" style="transform: rotate(${angle + 90}deg);">
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="16" cy="16" r="10" fill="#ffffff" stroke="#374151" strokeWidth="2"/>
                    <path d="M16 8c-.5 0-1 .2-1 .5V12l-4 2.5v1l4-1.25V18l-1 .75V20l1.75-.5L17.25 20v-1.25L16.25 18v-3.75l4 1.25v-1L16.25 12V8.5c0-.3-.5-.5-1-.5z" fill="#374151" transform="translate(0, 1)"/>
                  </svg>
                </div>
              `,
              className: "airplane-icon-container",
              iconSize: [32, 32],
              iconAnchor: [16, 16],
            }),
          }).addTo(map.current)

          airplane.on("click", () => {
            const routeDetails = `
              <div class="text-sm space-y-2">
                <div class="font-semibold text-base">Flight Route</div>
                <div class="text-gray-600">
                  <strong>Customer:</strong> ${route.customerName}
                </div>
                <div class="text-gray-600">
                  <strong>Route:</strong> ${leg.origin} → ${leg.destination}
                </div>
                <div class="text-gray-600">
                  <strong>Status:</strong> <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">${route.status}</span>
                </div>
                <div class="text-gray-600">
                  <strong>Distance:</strong> ~${Math.round(
                    Math.sqrt(
                      Math.pow(leg.destCoords.lat - leg.originCoords.lat, 2) +
                        Math.pow(leg.destCoords.lng - leg.originCoords.lng, 2),
                    ) * 69,
                  )} miles
                </div>
                <div class="text-gray-600">
                  <strong>Route ID:</strong> ${route.id}
                </div>
              </div>
            `
            airplane.bindPopup(routeDetails).openPopup()
          })

          routeLayers.current.push(airplane)
        }
      })
    })

    // Fit map to show all routes
    if (allCoordinates.length > 0) {
      const group = window.L.featureGroup(routeLayers.current.concat(airportMarkers.current))
      map.current.fitBounds(group.getBounds(), {
        padding: [20, 20],
        maxZoom: 6,
      })
    }
  }, [activeRoutes, mapLoaded])

  // Recent events for sidebar
  const recentEvents = useMemo(() => {
    return state.events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5)
  }, [state.events])

  const handleZoomIn = () => {
    if (map.current) {
      map.current.zoomIn()
    }
  }

  const handleZoomOut = () => {
    if (map.current) {
      map.current.zoomOut()
    }
  }

  const handleRefresh = () => {
    console.log("[v0] Refreshing map...")
    setMapLoaded(false)
    setMapError(null)
    setRefreshKey((prev) => prev + 1)
  }

  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter)
  }

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "quote_viewed":
        return <FileText className="h-3 w-3" />
      case "option_selected":
        return <FileText className="h-3 w-3" />
      case "lead_created":
        return <Users className="h-3 w-3" />
      default:
        return <Activity className="h-3 w-3" />
    }
  }

  const getEventDescription = (event: Event) => {
    const quote = event.quoteId ? state.quotes.find((q) => q.id === event.quoteId) : null
    const lead = event.leadId ? state.leads.find((l) => l.id === event.leadId) : null

    switch (event.type) {
      case "quote_viewed":
        return quote ? `Quote viewed by ${quote.customer.name}` : "Quote viewed"
      case "option_selected":
        return quote ? `Option selected by ${quote.customer.name}` : "Option selected"
      case "lead_created":
        return lead ? `New lead from ${lead.customer.name}` : "New lead created"
      default:
        return "Activity occurred"
    }
  }

  const activeCount = filterData[activeFilter].length

  return (
    <>
      <style jsx global>{`
        .airport-pointer-container {
          background: none !important;
          border: none !important;
        }
        .airport-pointer {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .airplane-icon-container {
          background: none !important;
          border: none !important;
        }
        .airplane-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s ease;
        }
        .airplane-icon:hover {
          transform: scale(1.1) rotate(var(--rotation, 0deg)) !important;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 8px;
        }
        .leaflet-popup-content {
          margin: 12px 16px;
          line-height: 1.4;
        }
      `}</style>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-10">
        {/* Map Card */}
        <Card className="col-span-1 lg:col-span-7 relative overflow-hidden p-0">
          {/* Full-bleed map area */}
          <div className="relative w-full h-[460px] lg:h-[520px] bg-slate-50">
            {/* Filter Controls */}
            <div className="absolute top-4 left-4 z-[1000] flex items-center gap-2 bg-white/10  rounded-lg p-2 shadow-lg border border-white/10">
              {(["leads", "quotes", "unpaid", "paid", "upcoming"] as FilterType[]).map((filter) => {
                const count = Math.min(10, filterData[filter].length)
                const isActive = activeFilter === filter
                return (
                  <Button
                    key={filter}
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    className={`h-8 px-3 text-xs transition-all duration-200 ${
                      isActive ? "shadow-sm" : "hover:bg-slate-300"
                    }`}
                    onClick={() => handleFilterChange(filter)}
                    aria-label={`Filter: ${filter}`}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                    <Badge
                      variant={isActive ? "secondary" : "outline"}
                      className="ml-2 h-4 px-1 text-[10px] transition-colors duration-200"
                    >
                      {count}
                    </Badge>
                  </Button>
                )
              })}
            </div>

            {/* Zoom Controls */}
            <div className="absolute top-20 right-4 z-[1000] flex flex-col gap-1 bg-white/10 rounded-lg p-1 shadow-lg border border-white/10">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-slate-300 transition-colors duration-200"
                onClick={handleZoomIn}
                aria-label="Zoom in"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-slate-300 transition-colors duration-200"
                onClick={handleZoomOut}
                aria-label="Zoom out"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-slate-300 transition-colors duration-200"
                onClick={handleRefresh}
                aria-label="Refresh map"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>

            <div
              ref={mapContainer}
              className="absolute inset-0 w-full h-full"
              style={{ display: mapError ? "none" : "block" }}
            />

            {mapError && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="text-center space-y-3 bg-white/90 backdrop-blur-sm rounded-xl p-8 shadow-lg border border-white/20 max-w-md">
                  <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                    <MapPin className="h-8 w-8 text-red-500" />
                  </div>
                  <div>
                    <p className="text-slate-800 font-medium">Map Error</p>
                    <p className="text-xs text-slate-600 mt-2">{mapError}</p>
                  </div>
                  <Button onClick={handleRefresh} size="sm" className="mt-4">
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Try Again
                  </Button>
                </div>
              </div>
            )}

            {/* Route info overlay */}
            {!mapError && activeRoutes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="text-center space-y-3 bg-white/90 backdrop-blur-sm rounded-xl p-8 shadow-lg border border-white/20 animate-in fade-in duration-500">
                  <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center">
                    <MapPin className="h-8 w-8 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-slate-600 font-medium">No routes to display</p>
                    <p className="text-xs text-slate-500 mt-1">Routes will appear when you have {activeFilter}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Status indicator */}
            {!mapError && (
              <div className="absolute bottom-0 left-0 z-[1000] w-full bg-white/95 backdrop-blur-sm px-3 py-2 shadow-sm border border-white/20">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <div
                    className={`w-2 h-2 rounded-full ${mapLoaded ? "bg-green-500 animate-pulse" : "bg-yellow-500"}`}
                  ></div>
                  <span>{mapLoaded ? `Showing ${activeRoutes.length} ${activeFilter}` : "Loading map..."}</span>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Recent Activity Sidebar */}
        <Card className="col-span-1 lg:col-span-3">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
            <div className="space-y-4 max-h-[420px] overflow-y-auto">
              {recentEvents.length > 0 ? (
                recentEvents.map((event, index) => (
                  <div
                    key={event.id}
                    className="flex items-start space-x-3 animate-in slide-in-from-right duration-300"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted flex-shrink-0 mt-0.5">
                      {getEventIcon(event.type)}
                    </div>
                    <div className="flex-1 space-y-1 min-w-0">
                      <p className="text-sm font-medium leading-none truncate">{getEventDescription(event)}</p>
                      <p className="text-xs text-muted-foreground">{formatTimeAgo(event.timestamp)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <Activity className="mx-auto h-8 w-8 text-muted-foreground" />
                  <h4 className="mt-2 text-sm font-semibold">No activity yet</h4>
                  <p className="mt-1 text-xs text-muted-foreground">Activity will appear as you use the system.</p>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </>
  )
}
