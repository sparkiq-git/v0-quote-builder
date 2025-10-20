"use client"

import { useMemo, useState, useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Minus, MapPin, RotateCcw } from "lucide-react"
import { getAirportCoordinates } from "@/lib/data/airports"
import type { ItinerarySegment } from "@/lib/types"

interface ItineraryRouteMapProps {
  segments: ItinerarySegment[]
  customerName: string
  tripName: string
}

declare global {
  interface Window {
    L: any
  }
}

const US_CENTER = [39.8, -98.6] // [lat, lng] for Leaflet
const US_ZOOM = 4

export function ItineraryRouteMap({ segments, customerName, tripName }: ItineraryRouteMapProps) {
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const routeLayers = useRef<any[]>([])
  const airportMarkers = useRef<any[]>([])

  // Process segments for visualization
  const processedRoute = useMemo(() => {
    const processedLegs = segments.map((segment) => ({
      origin: segment.origin,
      destination: segment.destination,
      originCoords: getAirportCoordinates(segment.origin),
      destCoords: getAirportCoordinates(segment.destination),
      departureDate: segment.departureDate,
      departureTime: segment.departureTime,
    }))

    return {
      customerName,
      tripName,
      legs: processedLegs,
    }
  }, [segments, customerName, tripName])

  useEffect(() => {
    if (!mapContainer.current) return

    const loadLeaflet = async () => {
      try {
        console.log("[v0] Initializing itinerary map with refresh key:", refreshKey)

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
          zoomControl: false,
          attributionControl: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          touchZoom: true,
          boxZoom: false,
        })

        window.L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
          attribution: "© OpenStreetMap contributors © CARTO",
          maxZoom: 18,
          subdomains: "abcd",
        }).addTo(map.current)

        window.L.control
          .attribution({
            position: "bottomright",
            prefix: false,
          })
          .addTo(map.current)

        setMapLoaded(true)
        setMapError(null)
        console.log("[v0] Itinerary map initialized successfully")
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

    console.log("[v0] Updating itinerary route, legs count:", processedRoute.legs.length)

    // Clear existing layers
    routeLayers.current.forEach((layer) => {
      map.current.removeLayer(layer)
    })
    airportMarkers.current.forEach((marker) => {
      map.current.removeLayer(marker)
    })
    routeLayers.current = []
    airportMarkers.current = []

    if (processedRoute.legs.length === 0) return

    const processedAirports = new Set<string>()
    const allCoordinates: [number, number][] = []

    processedRoute.legs.forEach((leg, legIndex) => {
      if (leg.originCoords && leg.destCoords) {
        const originLatLng: [number, number] = [leg.originCoords.lat, leg.originCoords.lng]
        const destLatLng: [number, number] = [leg.destCoords.lat, leg.destCoords.lng]

        allCoordinates.push(originLatLng, destLatLng)

        // Create route line
        const routeLine = window.L.polyline([originLatLng, destLatLng], {
          color: "#2563eb",
          weight: 2,
          opacity: 0.8,
          dashArray: "3, 2",
        }).addTo(map.current)

        routeLine.on("click", () => {
          const departureInfo = leg.departureDate
            ? `<div class="text-gray-600"><strong>Departure:</strong> ${leg.departureDate} at ${leg.departureTime || "TBD"}</div>`
            : ""

          const routeInfo = `
            <div class="text-sm space-y-2">
              <div class="font-semibold text-base">${processedRoute.tripName}</div>
              <div class="text-gray-600">
                <strong>Customer:</strong> ${processedRoute.customerName}
              </div>
              <div class="text-gray-600">
                <strong>Leg ${legIndex + 1}:</strong> ${leg.origin} → ${leg.destination}
              </div>
              ${departureInfo}
            </div>
          `
          routeLine.bindPopup(routeInfo).openPopup()
        })

        routeLayers.current.push(routeLine)

        // Origin marker
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
              </div>
            `
            originMarker.bindPopup(airportInfo).openPopup()
          })

          airportMarkers.current.push(originMarker)
          processedAirports.add(leg.origin)
        }

        // Destination marker
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
              </div>
            `
            destMarker.bindPopup(airportInfo).openPopup()
          })

          airportMarkers.current.push(destMarker)
          processedAirports.add(leg.destination)
        }

        // Airplane icon at midpoint
        const midLat = (leg.originCoords.lat + leg.destCoords.lat) / 2
        const midLng = (leg.originCoords.lng + leg.destCoords.lng) / 2

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
          const distance = Math.round(
            Math.sqrt(
              Math.pow(leg.destCoords.lat - leg.originCoords.lat, 2) +
                Math.pow(leg.destCoords.lng - leg.originCoords.lng, 2),
            ) * 69,
          )

          const routeDetails = `
            <div class="text-sm space-y-2">
              <div class="font-semibold text-base">Flight Route</div>
              <div class="text-gray-600">
                <strong>Trip:</strong> ${processedRoute.tripName}
              </div>
              <div class="text-gray-600">
                <strong>Leg ${legIndex + 1}:</strong> ${leg.origin} → ${leg.destination}
              </div>
              <div class="text-gray-600">
                <strong>Distance:</strong> ~${distance} miles
              </div>
            </div>
          `
          airplane.bindPopup(routeDetails).openPopup()
        })

        routeLayers.current.push(airplane)
      }
    })

    // Fit map to show all routes
    if (allCoordinates.length > 0) {
      const group = window.L.featureGroup(routeLayers.current.concat(airportMarkers.current))
      map.current.fitBounds(group.getBounds(), {
        padding: [50, 50],
        maxZoom: 6,
      })
    }
  }, [processedRoute, mapLoaded])

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
    console.log("[v0] Refreshing itinerary map...")
    setMapLoaded(false)
    setMapError(null)
    setRefreshKey((prev) => prev + 1)
  }

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

      <Card className="relative overflow-hidden p-0">
        <div className="relative w-full h-[460px] bg-slate-50">
          <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-1 bg-white/10 rounded-lg p-1 shadow-lg border border-white/10">
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

          {!mapError && (
            <div className="absolute bottom-0 left-0 z-[1000] w-full bg-white/95 backdrop-blur-sm px-3 py-2 shadow-sm border border-white/20">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <div className={`w-2 h-2 rounded-full ${mapLoaded ? "bg-green-500 animate-pulse" : "bg-yellow-500"}`} />
                <span>{mapLoaded ? `Showing ${processedRoute.legs.length} flight leg(s)` : "Loading map..."}</span>
              </div>
            </div>
          )}
        </div>
      </Card>
    </>
  )
}
