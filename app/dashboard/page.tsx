"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, Clock, Plane, Mail, Phone, Calendar } from "lucide-react";
import { RouteMap } from "@/components/dashboard/route-map";
import DashboardMetrics from "@/components/dashboard/DashboardMetrics";
import { RecentActivities } from "@/components/dashboard/recent-activities";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  const [leadCount, setLeadCount] = useState(0);
  const [quotesAwaitingResponse, setQuotesAwaitingResponse] = useState(0);
  const [unpaidQuotes, setUnpaidQuotes] = useState(0);
  const [upcomingDepartures, setUpcomingDepartures] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const [todayLeads, setTodayLeads] = useState<any[]>([]);
  const [todayQuotes, setTodayQuotes] = useState<any[]>([]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // === Load Lead Count ===
  useEffect(() => {
    if (!isClient) return;
    let cancelled = false;

    const loadLeadCount = async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      const { count, error } = await supabase
        .from("lead")
        .select("*", { count: "exact", head: true })
        .in("status", ["opened", "new"]);

      if (!cancelled) {
        if (error) {
          console.error("Lead count error:", error);
          setLeadCount(0);
        } else {
          setLeadCount(count ?? 0);
        }
      }
    };

    loadLeadCount();
    const id = setInterval(loadLeadCount, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isClient]);

  // === Load Metrics ===
  useEffect(() => {
    if (!isClient) return;
    let cancelled = false;

    const loadMetrics = async () => {
      try {
        const res = await fetch("/api/metrics", { cache: "no-store" });
        if (!res.ok) throw new Error(`metrics ${res.status}`);
        const j = await res.json();
        if (cancelled) return;
        setQuotesAwaitingResponse(j.quotesAwaitingResponse ?? 0);
        setUnpaidQuotes(j.unpaidQuotes ?? 0);
        setUpcomingDepartures(j.upcomingDepartures ?? 0);
      } catch (e) {
        if (!cancelled) console.error("Failed to load metrics:", e);
      }
    };

    loadMetrics();
    const id = setInterval(loadMetrics, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isClient]);

  // === Load today's NEW Leads and DRAFT Quotes ===
  useEffect(() => {
    if (!isClient) return;

    const loadTodayData = async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);

      try {
        const [{ data: leads }, { data: quotes }] = await Promise.all([
          // 🟩 Leads with status "new" today
          supabase
            .from("lead")
            .select(
              `
              id,
              customer_name,
              customer_email,
              customer_phone,
              status,
              trip_type,
              trip_summary,
              earliest_departure,
              created_at
              `
            )
            .eq("status", "new")
            .gte("created_at", start.toISOString())
            .lte("created_at", end.toISOString())
            .order("created_at", { ascending: false }),

          // 🟦 Quotes with status "draft" today
          supabase
            .from("quote")
            .select(
              "id, contact_name, status, created_at, title, trip_summary, trip_type, total_pax"
            )
            .eq("status", "draft")
            .gte("created_at", start.toISOString())
            .lte("created_at", end.toISOString())
            .order("created_at", { ascending: false }),
        ]);

        setTodayLeads(leads ?? []);
        setTodayQuotes(quotes ?? []);
      } catch (error) {
        console.error("Error loading today's data:", error);
      }
    };

    loadTodayData();
  }, [isClient]);

  // === Metric Card ===
  function MetricCard({
    title,
    icon: Icon,
    currentValue,
    description,
  }: {
    title: string;
    icon: any;
    currentValue: number | string;
    description: string;
  }) {
    return (
      <Card className="col-span-1 h-full flex flex-col hover:shadow-md transition-shadow border border-gray-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-rows-[auto_auto] gap-1 flex-1">
          <div className="text-2xl font-bold leading-none">{currentValue}</div>
          <p className="text-xs text-muted-foreground mb-0 min-h-4 truncate">
            {description}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Welcome back!
        </h1>
        <p className="text-muted-foreground text-xs sm:text-base">
          Here's what's happening today.
        </p>
      </div>

      {/* === Top Metric Cards === */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Leads"
          icon={Users}
          currentValue={leadCount}
          description="Pending conversion to quote"
        />
        <MetricCard
          title="Quotes"
          icon={FileText}
          currentValue={quotesAwaitingResponse}
          description="Awaiting client response"
        />
        <MetricCard
          title="Unpaid"
          icon={Clock}
          currentValue={unpaidQuotes}
          description="Awaiting payment"
        />
        <MetricCard
          title="Upcoming Trips"
          icon={Plane}
          currentValue={upcomingDepartures}
          description="Departures in next 7 days"
        />
      </div>

      {/* === Monthly Metrics === */}
      <DashboardMetrics />

      {/* === RouteMap + Recent Activities === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-[min(60vh,500px)]">
          <RouteMap />
        </div>
        <div className="h-[min(60vh,500px)] overflow-y-auto">
          <RecentActivities />
        </div>
      </div>

      {/* === Today's New Leads and Draft Quotes === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Leads */}
        <Card className="border border-gray-200 shadow-sm rounded-2xl flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Today’s New Leads 
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[400px]">
            {todayLeads.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No new leads today.
              </p>
            ) : (
              todayLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex flex-col border-b pb-3 last:border-none"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{lead.customer_name}</p>
                    <Badge variant="secondary" className="text-[10px] uppercase">
                      {lead.status}
                    </Badge>
                  </div>

                  {lead.customer_email && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Mail className="w-3 h-3" /> {lead.customer_email}
                    </p>
                  )}

                  {lead.customer_phone && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {lead.customer_phone}
                    </p>
                  )}

                  {lead.trip_summary && (
                    <p className="text-xs text-muted-foreground mt-1">
                      <span className="font-semibold">Route:</span>{" "}
                      {lead.trip_summary}
                    </p>
                  )}

                  {lead.trip_type && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-semibold">Trip Type:</span>{" "}
                      {lead.trip_type}
                    </p>
                  )}

                  {lead.earliest_departure && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />{" "}
                      {new Date(lead.earliest_departure).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  )}

                  <p className="text-xs text-muted-foreground mt-1">
                    Created at:{" "}
                    {new Date(lead.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Quotes */}
        <Card className="border border-gray-200 shadow-sm rounded-2xl flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Today’s New Quotes 
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[400px]">
            {todayQuotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No draft quotes today.
              </p>
            ) : (
              todayQuotes.map((quote) => (
                <div
                  key={quote.id}
                  className="flex flex-col border-b pb-2 last:border-none"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">
                      {quote.title || `Quote ${quote.id.slice(0, 6)}`} —{" "}
                      {quote.contact_name}
                    </p>
                    <Badge variant="secondary" className="text-[10px] uppercase">
                      {quote.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {quote.trip_summary || "No trip summary"}
                  </div>
                  <div className="text-xs text-muted-foreground flex justify-between mt-1">
                    <span>
                      Pax: {quote.total_pax ?? "—"} |{" "}
                      {quote.trip_type ?? "one-way"}
                    </span>
                    <span>
                      {new Date(quote.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
