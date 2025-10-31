"use client";

import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, Clock, Plane } from "lucide-react";
import { useMockStore } from "@/lib/mock/store";
import { RouteMap } from "@/components/dashboard/route-map";
import DashboardMetrics from "@/components/dashboard/DashboardMetrics";
import { RecentActivities } from "@/components/dashboard/recent-activities";

"use client";

import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, Clock, Plane } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RouteMap } from "@/components/dashboard/route-map";
import DashboardMetrics from "@/components/dashboard/DashboardMetrics";
import { RecentActivities } from "@/components/dashboard/recent-activities";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const [leadCount, setLeadCount] = useState(0);
  const [quotesAwaitingResponse, setQuotesAwaitingResponse] = useState(0);
  const [unpaidQuotes, setUnpaidQuotes] = useState(0);
  const [upcomingDepartures, setUpcomingDepartures] = useState(0);
  const [todayLeads, setTodayLeads] = useState<any[]>([]);
  const [todayQuotes, setTodayQuotes] = useState<any[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => setIsClient(true), []);

  // === Load top metrics ===
  useEffect(() => {
    if (!isClient) return;
    let cancelled = false;

    const loadLeadCount = async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      const { count } = await supabase
        .from("lead")
        .select("*", { count: "exact", head: true })
        .in("status", ["opened", "new"]);

      if (!cancelled) setLeadCount(count ?? 0);
    };

    const loadMetrics = async () => {
      try {
        const res = await fetch("/api/metrics", { cache: "no-store" });
        const j = await res.json();
        if (!cancelled) {
          setQuotesAwaitingResponse(j.quotesAwaitingResponse ?? 0);
          setUnpaidQuotes(j.unpaidQuotes ?? 0);
          setUpcomingDepartures(j.upcomingDepartures ?? 0);
        }
      } catch (e) {
        console.error("Failed to load metrics:", e);
      }
    };

    loadLeadCount();
    loadMetrics();

    const id = setInterval(() => {
      loadLeadCount();
      loadMetrics();
    }, 15000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isClient]);

  // === Load today's new leads and quotes ===
  useEffect(() => {
    if (!isClient) return;
    const loadTodayData = async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);

      const [{ data: leads }, { data: quotes }] = await Promise.all([
        supabase
          .from("lead")
          .select("id, customer_name, status, created_at")
          .gte("created_at", start.toISOString())
          .lte("created_at", end.toISOString())
          .order("created_at", { ascending: false }),
        supabase
          .from("quote")
          .select("id, contact_name, status, total_amount, created_at, quote_number")
          .gte("created_at", start.toISOString())
          .lte("created_at", end.toISOString())
          .order("created_at", { ascending: false }),
      ]);

      setTodayLeads(leads ?? []);
      setTodayQuotes(quotes ?? []);
    };

    loadTodayData();
  }, [isClient]);

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
          <p className="text-xs text-muted-foreground mb-0 min-h-4 truncate">{description}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Welcome back!</h1>
        <p className="text-muted-foreground text-xs sm:text-base">
          Here’s what’s happening today.
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

      <DashboardMetrics />

      {/* === Map & Activities === */}
      <div className="grid gap-6 md:grid-cols-2 items-stretch">
        <div className="flex flex-col h-[460px]">
          <RouteMap />
        </div>
        <div className="flex flex-col h-[460px]">
          <RecentActivities />
        </div>
      </div>

      {/* === Today’s New Leads & Quotes === */}
      <div className="grid gap-6 md:grid-cols-2 items-stretch">
        {/* Today's New Leads */}
        <Card className="border border-gray-200 shadow-sm rounded-2xl flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Today’s New Leads</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-4 space-y-3 overflow-y-auto">
            {todayLeads.length === 0 ? (
              <p className="text-sm text-muted-foreground">No new leads today.</p>
            ) : (
              todayLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between border-b pb-2 last:border-none"
                >
                  <div>
                    <p className="font-medium text-sm">{lead.customer_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(lead.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {lead.status}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Today's New Quotes */}
        <Card className="border border-gray-200 shadow-sm rounded-2xl flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Today’s New Quotes</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-4 space-y-3 overflow-y-auto">
            {todayQuotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No new quotes today.</p>
            ) : (
              todayQuotes.map((quote) => (
                <div
                  key={quote.id}
                  className="flex items-center justify-between border-b pb-2 last:border-none"
                >
                  <div>
                    <p className="font-medium text-sm">
                      #{quote.quote_number ?? quote.id} — {quote.contact_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(quote.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      ${quote.total_amount?.toLocaleString() ?? "—"}
                    </p>
                    <Badge variant="secondary" className="text-[10px] uppercase">
                      {quote.status}
                    </Badge>
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
