"use client";
import { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { DollarSign, TrendingUp } from "lucide-react";

/**
 * DashboardMetrics
 * - Displays Cost Operator (sum for this month)
 * - Displays Price Commission (sum for this month)
 */
export default function DashboardMetrics() {
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
        const { data: quoteOptions, error } = await supabase
          .from("quote_option")
          .select("cost_operator, price_commission, created_at")
          .gte("created_at", firstDay.toISOString())
          .lte("created_at", lastDay.toISOString());

        if (error) {
          console.error("quote_option query error:", error);
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 justify-center">
        {[...Array(2)].map((_, i) => (
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
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 justify-center">
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
