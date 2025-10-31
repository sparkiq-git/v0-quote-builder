"use client";

import { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, RotateCcw, MapPin, Users, Plane } from "lucide-react";

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
  const [leadRoutes, setLeadRoutes] = useState<Route[]>([]);
  const [upcomingRoutes, setUpcomingRoutes] = useState<Route[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const routeLayers = useRef<any[]>([]);
  const airportMarkers = useRef<any[]>([]);

  // -------- Load data from Supabase --------
  useEffect(() => {
    const loadRoutes = async () => {
      if (typeof window === "undefined") return;

      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      // ✅ Load "New" leads only
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
          .eq("lead.status", "new") // ✅ Only NEW leads
          .order("depart_dt", { ascending: true });

        if (error) {
          console.error("Lead load error:", error);
          setLeadRoutes([]);
          return;
        }

        const formatted: Route[] = (data ?? [])
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

        setLeadRoutes(formatted);
        console.log("✅ New Leads loaded (drawable):", formatted.length);
      };

      // ✅ Load upcoming trips
      const loadUpcomingRoutes = async () => {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
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
          setUpcomingRoutes([]);
          return;
        }

        const formatted: Route[] = (data ?? [])
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

        setUpcomingRoutes(formatted);
        console.log("✈️ Upcoming trips loaded (drawable):", formatted.length);
      };

      await Promise.all([loadLeadRoutes(), loadUpcomingRoutes()]);
    };

    loadRoutes();
  }, [refreshKey]);

  // -------- Choose which routes to display --------
  useEffect(() => {
    setRoutes(activeFilter === "leads" ? leadRoutes : upcomingRoutes);
  }, [activeFilter, leadRoutes, upcomingRoutes]);

  // -------- Initialize Leaflet --------
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
      if ((mapContainer.current as any)?._leaflet_id)
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

  // -------- Draw routes and markers --------
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

        const color =
          activeFilter === "leads"
            ? "#2563eb"
            : "#16a34a";

        const routeLine = window.L.polyline([originLatLng, destLatLng], {
          color,
          weight: 1.5,
          opacity: 0.8,
          dashArray: "3, 2",
        }).addTo(map.current);

        const midLat = (leg.originCoords.lat + leg.destCoords.lat) / 2;
        const midLng = (leg.originCoords.lng + leg.destCoords.lng) / 2;

        const airplane = window.L.marker([midLat, midLng], {
          icon: window.L.divIcon({
            html: `
              <div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="${color}">
                  <path d="M2.5 19l19-7L2.5 5v5l14 2-14 2z" />
                </svg>
              </div>
            `,
            className: "bg-transparent",
            iconSize: [20, 20],
            iconAnchor: [10, 10],
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
      });
    });

    if (allCoords.length) {
      const group = window.L.featureGroup(routeLayers.current);
      map.current.fitBounds(group.getBounds(), { padding: [20, 20], maxZoom: 6 });
    }
  }, [routes, mapLoaded, activeFilter]);

  const handleZoomIn = () => map.current?.zoomIn();
  const handleZoomOut = () => map.current?.zoomOut();
  const handleRefresh = () => setRefreshKey((k) => k + 1);

  return (
    <Card className="relative flex-1 overflow-hidden h-full border border-gray-200 rounded-2xl shadow-sm">
      <div className="relative w-full h-full bg-slate-50 rounded-2xl overflow-hidden">
        {/* Filters */}
        <div className="absolute top-4 left-4 z-[1000] flex items-center gap-2 bg-white/10 rounded-lg p-2 shadow-lg border border-white/10">
          {(["leads", "upcoming"] as FilterType[]).map((filter) => {
            const isActive = activeFilter === filter;
            const cnt =
              filter === "leads" ? leadRoutes.length : upcomingRoutes.length;
            const label =
              filter === "leads" ? "New Leads" : "Upcoming Trips";
            const Icon = filter === "leads" ? Users : Plane;

            return (
              <Button
                key={filter}
                variant={isActive ? "default" : "ghost"}
                size="sm"
                className={`h-8 px-3 text-xs flex items-center gap-1 ${
                  isActive ? "shadow-sm" : "hover:bg-slate-300"
                }`}
                onClick={() => setActiveFilter(filter)}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
                <Badge
                  variant={isActive ? "secondary" : "outline"}
                  className="ml-1 h-4 px-1 text-[10px]"
                >
                  {cnt}
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

        {/* Map container */}
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
  );
}
