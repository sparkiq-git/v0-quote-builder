"use client";

import { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, RotateCcw, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

declare global {
  interface Window {
    L: any;
  }
}

const US_CENTER: [number, number] = [39.8, -98.6];
const US_ZOOM = 4;

type FilterType = "leads" | "upcoming";

type RouteLeg = {
  origin: string;
  destination: string;
  originCoords: { lat: number; lng: number; name: string };
  destCoords: { lat: number; lng: number; name: string };
  departDt: string;
};

type Route = {
  id: string;
  customerName: string;
  contactEmail?: string;
  status: string;
  createdAt: string;
  legs: RouteLeg[];
};

export function RouteMap() {
  const [activeFilter, setActiveFilter] = useState<FilterType>("leads");
  const [routes, setRoutes] = useState<Route[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const routeLayers = useRef<any[]>([]);
  const airportMarkers = useRef<any[]>([]);

  const supabase = createClient();

  // === Load routes depending on active filter ===
  useEffect(() => {
    const loadLeadRoutes = async () => {
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
        .in("lead.status", ["new", "opened"])
        .order("depart_dt", { ascending: true });

      if (error) {
        console.error("Lead load error:", error);
        setRoutes([]);
        return;
      }

      const formatted = (data ?? [])
        .filter(
          (r) =>
            r.origin_lat &&
            r.origin_long &&
            r.destination_lat &&
            r.destination_long
        )
        .map((r) => ({
          id: String(r.lead_id),
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
              departDt: r.depart_dt,
            },
          ],
        }));

      setRoutes(formatted);
      console.log("✅ Leads loaded:", formatted.length);
    };

    const loadUpcomingRoutes = async () => {
      const now = new Date();
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // Next 7 days
      end.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from("quote_detail")
        .select(`
          id,
          quote_id,
          origin,
          origin_code,
          destination,
          destination_code,
          depart_dt,
          origin_lat,
          origin_long,
          destination_lat,
          destination_long,
          quote:quote_id (
            id,
            contact_name,
            contact_email,
            status,
            created_at
          )
        `)
        .gte("depart_dt", start.toISOString())
        .lte("depart_dt", end.toISOString())
        .order("depart_dt", { ascending: true });

      if (error) {
        console.error("Upcoming load error:", error);
        setRoutes([]);
        return;
      }

      const formatted = (data ?? [])
        .filter(
          (r) =>
            r.origin_lat &&
            r.origin_long &&
            r.destination_lat &&
            r.destination_long
        )
        .map((r) => ({
          id: String(r.quote_id),
          customerName: r.quote?.contact_name ?? "Unknown",
          contactEmail: r.quote?.contact_email ?? "",
          status: r.quote?.status ?? "unknown",
          createdAt: r.quote?.created_at ?? "",
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
              departDt: r.depart_dt,
            },
          ],
        }));

      setRoutes(formatted);
      console.log("✈️ Upcoming trips loaded:", formatted.length);
    };

    if (activeFilter === "leads") loadLeadRoutes();
    else loadUpcomingRoutes();
  }, [activeFilter, refreshKey, supabase]);

  // === Initialize Leaflet ===
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
        } else initializeMap();
      } catch {
        setMapError("Failed to load map library. Please check your connection.");
      }
    };

    const initializeMap = () => {
      if (map.current) {
        map.current.off();
        map.current.remove();
        map.current = null;
      }
      if (mapContainer.current?._leaflet_id)
        delete (mapContainer.current as any)._leaflet_id;

      try {
        map.current = window.L.map(mapContainer.current!, {
          center: US_CENTER,
          zoom: US_ZOOM,
          zoomControl: false,
          attributionControl: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          touchZoom: false,
        });

        window.L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
          {
            attribution: "© OpenStreetMap contributors © CARTO",
            maxZoom: 18,
            subdomains: "abcd",
          }
        ).addTo(map.current);

        setMapLoaded(true);
      } catch (err) {
        console.error("Map init error:", err);
        setMapError("Failed to initialize map instance.");
      }
    };

    loadLeaflet();

    return () => {
      if (map.current) {
        map.current.off();
        map.current.remove();
        map.current = null;
      }
    };
  }, [refreshKey]);

  // === Draw routes and markers ===
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    routeLayers.current.forEach((l) => map.current.removeLayer(l));
    airportMarkers.current.forEach((m) => map.current.removeLayer(m));
    routeLayers.current = [];
    airportMarkers.current = [];

    if (!routes.length) return;

    const allCoords: [number, number][] = [];

    routes.forEach((route) => {
      route.legs.forEach((leg) => {
        const originLatLng: [number, number] = [
          leg.originCoords.lat,
          leg.originCoords.lng,
        ];
        const destLatLng: [number, number] = [
          leg.destCoords.lat,
          leg.destCoords.lng,
        ];

        allCoords.push(originLatLng, destLatLng);

        // Route line
        const routeLine = window.L.polyline([originLatLng, destLatLng], {
          color: activeFilter === "leads" ? "#2563eb" : "#16a34a",
          weight: 1.5,
          opacity: 0.8,
          dashArray: "3, 2",
        }).addTo(map.current);

        // Airplane marker
        const midLat = (leg.originCoords.lat + leg.destCoords.lat) / 2;
        const midLng = (leg.originCoords.lng + leg.destCoords.lng) / 2;
        const angle =
          (Math.atan2(
            leg.destCoords.lat - leg.originCoords.lat,
            leg.destCoords.lng - leg.originCoords.lng
          ) *
            180) /
          Math.PI;

        const airplane = window.L.marker([midLat, midLng], {
          icon: window.L.divIcon({
            html: `
              <div style="transform: rotate(${angle + 90}deg);">
                <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                  <circle cx="16" cy="16" r="10" fill="none" stroke="#374151" stroke-width="2"/>
                  <path d="M16 8c-.5 0-1 .2-1 .5V12l-4 2.5v1l4-1.25V18l-1 .75V20l1.75-.5L17.25 20v-1.25L16.25 18v-3.75l4 1.25v-1L16.25 12V8.5c0-.3-.5-.5-1-.5z" fill="#374151" transform="translate(0, 1)"/>
                </svg>
              </div>
            `,
            className: "bg-transparent",
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          }),
        }).addTo(map.current);

        airplane.bindPopup(`
          <div class="text-sm space-y-2">
            <div class="font-semibold text-base">${route.customerName}</div>
            ${route.contactEmail ? `<div>${route.contactEmail}</div>` : ""}
            <div><strong>Route:</strong> ${leg.origin} → ${leg.destination}</div>
            <div><strong>Status:</strong> ${route.status}</div>
            <div><strong>Departure:</strong> ${new Date(
              leg.departDt
            ).toLocaleString()}</div>
          </div>
        `);

        routeLayers.current.push(routeLine, airplane);

        // Airport markers (transparent)
        const makeMarker = (coords: {
          lat: number;
          lng: number;
          name: string;
        }) =>
          window.L.marker([coords.lat, coords.lng], {
            icon: window.L.divIcon({
              html: `
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#1f2937" stroke="#ffffff" stroke-width="1.5"/>
                  <circle cx="12" cy="9" r="2.5" fill="#ffffff"/>
                </svg>
              `,
              className: "bg-transparent",
              iconSize: [22, 22],
              iconAnchor: [11, 22],
            }),
          }).addTo(map.current);

        makeMarker(leg.originCoords);
        makeMarker(leg.destCoords);
      });
    });

    if (allCoords.length) {
      const group = window.L.featureGroup(routeLayers.current);
      map.current.fitBounds(group.getBounds(), { padding: [20, 20], maxZoom: 6 });
    }
  }, [routes, mapLoaded, activeFilter]);

  // === Zoom / refresh ===
  const handleZoomIn = () => map.current?.zoomIn();
  const handleZoomOut = () => map.current?.zoomOut();
  const handleRefresh = () => setRefreshKey((k) => k + 1);

  return (
    <div className="grid gap-4 grid-cols-1">
      <Card className="relative overflow-hidden p-0">
        <div className="relative w-full h-[520px] bg-slate-50">
          {/* Filters */}
          <div className="absolute top-4 left-4 z-[1000] flex items-center gap-2 bg-white/10 rounded-lg p-2 shadow-lg border border-white/10">
            {(["leads", "upcoming"] as FilterType[]).map((filter) => {
              const isActive = activeFilter === filter;
              return (
                <Button
                  key={filter}
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  className={`h-8 px-3 text-xs ${
                    isActive ? "shadow-sm" : "hover:bg-slate-300"
                  }`}
                  onClick={() => setActiveFilter(filter)}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  <Badge
                    variant={isActive ? "secondary" : "outline"}
                    className="ml-2 h-4 px-1 text-[10px]"
                  >
                    {routes.length}
                  </Badge>
                </Button>
              );
            })}
          </div>

          {/* Zoom / Refresh */}
          <div className="absolute top-20 right-4 z-[1000] flex flex-col gap-1 bg-white/80 rounded-lg p-1 shadow-lg border border-gray-200">
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
        </div>
      </Card>
    </div>
  );
}
