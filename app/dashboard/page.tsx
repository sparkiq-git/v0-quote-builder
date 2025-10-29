"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Users, FileText, Clock, Plus, Plane, DollarSign } from "lucide-react";
import { useMockStore } from "@/lib/mock/store";
import { formatTimeAgo } from "@/lib/utils/format";
import { RouteMap } from "@/components/dashboard/route-map";
import InvoiceChart from "@/components/dashboard/InvoiceChart";

/* ---------------------------------- page ---------------------------------- */
export default function DashboardPage() {
  // Counts shown in MetricCards
  const [leadCount, setLeadCount] = useState(0);
  const [quotesAwaitingResponse, setQuotesAwaitingResponse] = useState(0);
  const [unpaidQuotes, setUnpaidQuotes] = useState(0);
  const [upcomingDepartures, setUpcomingDepartures] = useState(0);
  const [commission, setCommission] = useState(0);
  const [paidInvoicesCount, setPaidInvoicesCount] = useState(0);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // === Load LEADS (status IN ['opened','new'])
  useEffect(() => {
    if (!isClient) return;
    
    let cancelled = false;
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();

    const loadLeadCount = async () => {
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

  // === Load Quotes/Unpaid/Upcoming from API + Monthly Commission
  useEffect(() => {
    if (!isClient) return;
    
    let cancelled = false;
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();

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

    const loadCommission = async () => {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const { data, error } = await supabase
        .from("invoice")
        .select("amount, status, issued_at")
        .eq("status", "paid")
        .gte("issued_at", firstDay.toISOString())
        .lte("issued_at", lastDay.toISOString());

      if (!error && data?.length) {
        const total = data.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
        setCommission(total);
        setPaidInvoicesCount(data.length);
      }
    };

    loadMetrics();
    loadCommission();
    const id = setInterval(() => {
      loadMetrics();
      loadCommission();
    }, 15000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isClient]);

  // Mock store (unchanged)
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
    () => state.quotes.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 3),
    [state.quotes]
  );

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "new":
        return "default";
      case "converted":
        return "secondary";
      case "pending_acceptance":
        return "outline";
      case "accepted_by_requester":
      case "accepted":
        return "default";
      case "declined":
        return "destructive";
      case "expired":
        return "secondary";
      default:
        return "outline";
    }
  };

  /* ------------------------------- Loading UI ------------------------------- */
  if (loading) {
    return (
      <div className="space-y-6 sm:space-y-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Welcome back!</h1>
        <p className="text-muted-foreground text-sm sm:text-base">Loading your dashboard...</p>

        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="col-span-1 h-full flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                <div className="h-4 bg-muted rounded animate-pulse w-16" />
                <div className="h-6 bg-muted rounded animate-pulse w-12" />
              </CardHeader>
              <CardContent className="grid grid-rows-[auto_auto] gap-1 flex-1">
                <div className="h-6 bg-muted rounded animate-pulse w-8" />
                <div className="h-3 bg-muted rounded animate-pulse w-24" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="h-96">
          <CardContent className="h-full flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="h-8 w-8 bg-muted rounded animate-pulse mx-auto" />
              <p className="text-muted-foreground text-sm">Loading route map...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ----------------------------- Metric Card UI ----------------------------- */
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
          <p className="text-xs text-muted-foreground mb-0 min-h-4 truncate">{description}</p>
        </CardContent>
      </Card>
    );
  }

  /* ---------------------------------- Render ---------------------------------- */
  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Welcome back!</h1>
        <p className="text-muted-foreground text-xs sm:text-base">Here's what's happening today.</p>
      </div>

      {/* Metric cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard title="Leads" icon={Users} currentValue={leadCount} description="Pending conversion to quote" />
        <MetricCard
          title="Quotes"
          icon={FileText}
          currentValue={quotesAwaitingResponse}
          description="Awaiting client response"
        />
        <MetricCard title="Unpaid" icon={Clock} currentValue={unpaidQuotes} description="Awaiting payment" />
        <MetricCard
          title="Upcoming"
          icon={Plane}
          currentValue={upcomingDepartures}
          description="Departures in next 7 days"
        />
        <MetricCard
          title="Commission"
          icon={DollarSign}
          currentValue={`$${commission.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          description={`${paidInvoicesCount} paid invoices this month`}
        />
      </div>

      {/* Chart + Map */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
        <div className="xl:col-span-2 order-1 xl:order-none">
          <InvoiceChart />
        </div>
        <div className="order-2 xl:order-none">
          <RouteMap />
        </div>
      </div>

      {/* Recent Leads / Quotes (unchanged) */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
        {/* Recent Leads */}
        <Card className="col-span-1 lg:col-span-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-lg">Recent Leads</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Latest customer inquiries</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {/* ... existing lead list ... */}
          </CardContent>
        </Card>

        {/* Recent Quotes */}
        <Card className="col-span-1 lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Recent Quotes</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Latest quotes generated</CardDescription>
          </CardHeader>
          <CardContent>
            {/* ... existing quote list ... */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
