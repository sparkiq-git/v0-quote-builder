"use client";
import { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Plane, DollarSign, TrendingUp } from "lucide-react";

/**
 * DashboardMetrics
 * - Displays Upcoming Trips (next 7 days)
 * - Displays Cost Operator (sum for this month)
 * - Displays Price Commission (sum for this month)
 */
export default function DashboardMetrics() {
  const [upcoming, setUpcoming] = useState(0);
  const [costOperator, setCostOperator] = useState(0);
  const [priceCommission, setPriceCommission] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMetrics = async () => {
      if (typeof window === "undefined") return;

      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      try {
        // --- Count upcoming trips (within next 7 days)
        const { count: upcomingDepartures, error: upcomingError } =
          await supabase
            .from("quote_detail")
            .select("*", { count: "exact", head: true })
            .gte("depart_dt", now.toISOString())
            .lte(
              "depart_dt",
              new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            );

        if (upcomingError) console.error(upcomingError);
        setUpcoming(upcomingDepartures ?? 0);

        // --- Sum cost_operator & price_commission from quote_option this month
        const { data: quoteOptions, error: quoteError } = await supabase
          .from("quote_option")
          .select("cost_operator, price_commission, created_at")
          .gte("created_at", firstDay.toISOString())
          .lte("created_at", lastDay.toISOString());

        if (quoteError) {
          console.error("quote_option query error:", quoteError);
        } else if (quoteOptions?.length) {
          const totalCost = quoteOptions.reduce(
            (sum, q) => sum + (parseFloat(q.cost_operator) || 0),
            0
          );
          const totalCommission = quoteOptions.reduce(
            (sum, q) => sum + (parseFloat(q.price_commission) || 0),
            0
          );
          setCostOperator(totalCost);
          setPriceCommission(totalCommission);
        }
      } catch (err) {
        console.error("loadMetrics error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadMetrics();
  }, []);

  // --- Reusable Metric Card (matches top dashboard cards)
  function MetricCard({
    title,
    icon: Icon,
    value,
    color = "text-slate-800",
    description,
  }: {
    title: string;
    icon: any;
    value: number | string;
    color?: string;
    description?: string;
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
          <div className={`text-2xl font-bold leading-none ${color}`}>
            {value}
          </div>
          {description && (
            <p className="text-xs text-muted-foreground mb-0 truncate">
              {description}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Card
            key={i}
            className="h-full flex flex-col border border-gray-200 animate-pulse"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <div className="h-4 bg-muted rounded w-16" />
              <div className="h-6 bg-muted rounded w-12" />
            </CardHeader>
            <CardContent className="grid gap-1 flex-1">
              <div className="h-6 bg-muted rounded w-8" />
              <div className="h-3 bg-muted rounded w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      <MetricCard
        title="Upcoming Trips"
        icon={Plane}
        value={upcoming}
        color="text-slate-800"
        description="Departures in next 7 days"
      />
      <MetricCard
        title="Cost Operator (This Month)"
        icon={DollarSign}
        value={`$${costOperator.toLocaleString(undefined, {
          minimumFractionDigits: 2,
        })}`}
        color="text-blue-600"
        description="Sum of operator costs this month"
      />
      <MetricCard
        title="Price Commission (This Month)"
        icon={TrendingUp}
        value={`$${priceCommission.toLocaleString(undefined, {
          minimumFractionDigits: 2,
        })}`}
        color="text-amber-600"
        description="Sum of price commissions this month"
      />
    </div>
  );
}
