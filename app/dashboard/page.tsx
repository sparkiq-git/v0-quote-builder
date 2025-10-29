"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, FileText, Clock, Plane } from "lucide-react";
import { useMockStore } from "@/lib/mock/store";
import { RouteMap } from "@/components/dashboard/route-map";
import InvoiceChart from "@/components/dashboard/InvoiceChart";
import DashboardMetrics from "@/components/dashboard/DashboardMetrics";

export default function DashboardPage() {
  const [leadCount, setLeadCount] = useState(0);
  const [quotesAwaitingResponse, setQuotesAwaitingResponse] = useState(0);
  const [unpaidQuotes, setUnpaidQuotes] = useState(0);
  const [upcomingDepartures, setUpcomingDepartures] = useState(0);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // === Load LEADS
  useEffect(() => {
    if (!isClient) return;
    let cancelled = false;

    const loadLeadCount = async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      try {
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
      } catch (e) {
        if (!cancelled) {
          console.error("Lead count exception:", e);
          setLeadCount(0);
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

  // === Load Metrics (Quotes, Unpaid, Upcoming)
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

  const { state, getMetrics, loading } = useMockStore();
  const metrics = getMetrics();

  const recentLeads = useMemo(
    () =>
      state.leads
        .filter((l) => l.status !== "deleted")
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
        .slice(0, 3),
    [state.leads]
  );

  const recentQuotes = useMemo(
    () =>
      state.quotes
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
        .slice(0, 3),
    [state.quotes]
  );

  if (loading) {
    return (
      <div className="space-y-6 sm:space-y-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Welcome back!
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Loading your dashboard...
        </p>
      </div>
    );
  }

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
      <Card className="col-span-1 h-full flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Icon className="h-4 w-4" />
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

      {/* === Top Metric Cards (Commission REMOVED) === */}
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
          title="Upcoming"
          icon={Plane}
          currentValue={upcomingDepartures}
          description="Departures in next 7 days"
        />
      </div>

      {/* === Additional Monthly Metrics Section === */}
      <DashboardMetrics />

      {/* === Chart + Map === */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
        <div className="xl:col-span-2 order-1 xl:order-none">
          <InvoiceChart />
        </div>
        <div className="order-2 xl:order-none">
          <RouteMap />
        </div>
      </div>
    </div>
  );
}
