"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, RotateCcw, MapPin, Activity } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

declare global {
  interface Window {
    L: any;
  }
}

const US_CENTER = [39.8, -98.6]; // [lat, lng]
const US_ZOOM = 4;

interface Route {
  id: string;
  customerName: string;
  status: string;
  createdAt: string;
  legs: Array<{
    origin: string;
    destination: string;
    originCoords: { lat: number; lng: number; name: string };
    destCoords: { lat: number; lng: number; name: string };
  }>;
}

export function RouteMap() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const routeLayers = useRef<any[]>([]);
  const airportMarkers = useRef<any[]>([]);

  const supabase = createClient();

  // ✅ Fetch 10 future leads with status new/opened
  useEffect(() => {
    const loadLeadRoutes = async () => {
      try {
        const now = new Date().toISOString();

        const { data, error } = await supabase
          .from("lead_detail")
          .select(`
            id,
            lead_id,
            origin,
            origin_code,
            destination,
            destination_code,
            depart_dt,
            origin_lat,
            origin_long,
            destination_lat,
            destination_long,
            lead:lead_id (
              id,
              customer_name,
              status,
              created_at
            )
          `)
          .gt("depart_dt", now)
          .in("lead.status", ["new", "opened"])
          .order("depart_dt", { ascending: true })
          .limit(10);

        if (error) throw error;

        const formatted: Route[] =
          data?.map((r) => ({
            id: r.lead_id,
            customerName: r.lead?.customer_name ?? "Unknown",
            status: r.lead?.status ?? "unknown",
            createdAt: r.lead?.created_at ?? "",
            legs: [
              {
                origin: r.origin,
                destination: r.destination,
                originCoords: {
                  lat: r.origin_lat,
                  lng: r.origin_long,
                  name: r.origin_code,
                },
                destCoords: {
                  lat: r.destination_lat,
                  lng: r.destination_long,
                  name: r.destination_code,
                },
              },
            ],
          })) ?? [];

        setRoutes(formatted);
      } catch (err) {
        console.error("Error loading lead routes:", err);
        setRoutes([]);
      }
    };

    loadLeadRoutes();
  }, [refreshKey, supabase]);

  // ✅ Initialize Leaflet map
  useEffect(() => {
    if (!mapContainer.current) return;

    const loadLeaflet = async () => {
      try {
        if (!window.L) {
          const link = document.createElement("link");
          link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
          link.rel = "stylesheet";
          document.head.appendChild(link);

          const script = document.createElement("script");
          script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
          script.onload = () => initializeMap();
          document.head.appendChild(script);
        } else {
          initializeMap();
        }
      } catch (error) {
        console.error("Failed to load Leaflet:", error);
        setMapError("Failed to load map library. Please check your internet connection.");
      }
    };

    const initializeMap = () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }

      try {
        map.current = window.L.map(mapContainer.current!, {
          center: US_CENTER,
          zoom: US_ZOOM,
          zoomControl: false,
          attributionControl: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          touchZoom: true,
          boxZoom: false,
        });

        window.L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
          attribution: "© OpenStreetMap contributors © CARTO",
          maxZoom: 18,
          subdomains: "abcd",
        }).addTo(map.current);

        setMapLoaded(true);
        setMapError(null);
      } catch (error) {
        console.error("Failed to initialize map:", error);
        setMapError("Failed to initialize map. Please refresh the page.");
      }
    };

    loadLeaflet();

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [refreshKey]);

  // ✅ Draw routes on the map
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing layers
    routeLayers.current.forEach((layer) => map.current.removeLayer(layer));
    airportMarkers.current.forEach((marker) => map.current.removeLayer(marker));
    routeLayers.current = [];
    airportMarkers.current = [];

    if (routes.length === 0) return;

    const processedAirports = new Set<string>();
    const allCoordinates: [number, number][] = [];

    routes.forEach((route) => {
      route.legs.forEach((leg) => {
        const originLatLng: [number, number] = [leg.originCoords.lat, leg.originCoords.lng];
        const destLatLng: [number, number] = [leg.destCoords.lat, leg.destCoords.lng];
        allCoordinates.push(originLatLng, destLatLng);

        const routeLine = window.L.polyline([originLatLng, destLatLng], {
          color: "#2563eb",
          weight: 1.5,
          opacity: 0.8,
          dashArray: "3, 2",
        }).addTo(map.current);

        // Popup info
        const routeInfo = `
          <div class="text-sm space-y-2">
            <div class="font-semibold text-base">${route.customerName}</div>
            <div><strong>Route:</strong> ${leg.origin} → ${leg.destination}</div>
            <div><strong>Status:</strong> ${route.status}</div>
            <div><strong>Departure:</strong> ${new Date(route.createdAt).toLocaleString()}</div>
          </div>
        `;
        routeLine.bindPopup(routeInfo);

        routeLayers.current.push(routeLine);

        // Add airport markers
        const addMarker = (coords: { lat: number; lng: number; name: string }, label: string) => {
          if (processedAirports.has(label)) return;
          const marker = window.L.marker([coords.lat, coords.lng], {
            icon: window.L.divIcon({
              html: `
                <div class="airport-pointer">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#1f2937" stroke="#fff" stroke-width="2"/>
                    <circle cx="12" cy="9" r="2.5" fill="#fff"/>
                  </svg>
                </div>
              `,
              className: "airport-pointer-container",
              iconSize: [24, 24],
              iconAnchor: [12, 24],
            }),
          }).addTo(map.current);
          marker.bindPopup(`<strong>${label}</strong><br>${coords.lat.toFixed(2)}, ${coords.lng.toFixed(2)}`);
          airportMarkers.current.push(marker);
          processedAirports.add(label);
        };

        addMarker(leg.originCoords, leg.origin);
        addMarker(leg.destCoords, leg.destination);
      });
    });

    // Fit map to all routes
    if (allCoordinates.length > 0) {
      const group = window.L.featureGroup([...routeLayers.current, ...airportMarkers.current]);
      map.current.fitBounds(group.getBounds(), { padding: [20, 20], maxZoom: 6 });
    }
  }, [routes, mapLoaded]);

  const handleZoomIn = () => map.current?.zoomIn();
  const handleZoomOut = () => map.current?.zoomOut();
  const handleRefresh = () => setRefreshKey((k) => k + 1);

  return (
    <>
      <style jsx global>{`
        .airport-pointer-container {
          background: none !important;
          border: none !important;
        }
        .airport-pointer {
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-10">
        <Card className="col-span-1 lg:col-span-10 relative overflow-hidden p-0">
          <div className="relative w-full h-[520px] bg-slate-50">
            {/* Info Banner */}
            <div className="absolute top-4 left-4 z-[1000] bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow">
              <span className="text-xs font-medium text-slate-700">
                Showing up to 10 <strong>future leads</strong> (status: new / opened)
              </span>
            </div>

            {/* Zoom Controls */}
            <div className="absolute top-20 right-4 z-[1000] flex flex-col gap-1 bg-white/10 rounded-lg p-1 shadow-lg border border-white/10">
              <Button variant="ghost" size="sm" onClick={handleZoomIn}>
                <Plus className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleZoomOut}>
                <Minus className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleRefresh}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>

            <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

            {mapError && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-3 bg-white/90 rounded-xl p-8 shadow-lg">
                  <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                    <MapPin className="h-8 w-8 text-red-500" />
                  </div>
                  <p className="text-slate-800 font-medium">Map Error</p>
                  <p className="text-xs text-slate-600">{mapError}</p>
                  <Button onClick={handleRefresh} size="sm" className="mt-4">
                    <RotateCcw className="mr-2 h-4 w-4" /> Try Again
                  </Button>
                </div>
              </div>
            )}

            {!mapError && routes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="text-center space-y-3 bg-white/90 rounded-xl p-8 shadow-lg">
                  <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center">
                    <MapPin className="h-8 w-8 text-slate-400" />
                  </div>
                  <p className="text-slate-600 font-medium">No routes to display</p>
                  <p className="text-xs text-slate-500 mt-1">No active leads with future departures.</p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
