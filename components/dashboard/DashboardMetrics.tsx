"use client";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

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

  useEffect(() => {
    const loadMetrics = async () => {
      if (typeof window === "undefined") return;

      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // --- Count upcoming trips (within next 7 days)
      const { count: upcomingDepartures, error: upcomingError } = await supabase
        .from("quote_detail")
        .select("*", { count: "exact", head: true })
        .gte("depart_dt", now.toISOString())
        .lte(
          "depart_dt",
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        );

      if (!upcomingError) {
        setUpcoming(upcomingDepartures ?? 0);
      } else {
        console.error("Upcoming trips error:", upcomingError);
      }

      // --- Sum cost_operator & price_commission from quote_option this month
      const { data: quoteOptions, error: quoteError } = await supabase
        .from("quote_option")
        .select("cost_operator, price_commission, created_at")
        .gte("created_at", firstDay.toISOString())
        .lte("created_at", lastDay.toISOString());

      if (!quoteError && quoteOptions?.length) {
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
      } else if (quoteError) {
        console.error("quote_option query error:", quoteError);
      }
    };

    loadMetrics();
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {/* Upcoming Trips */}
      <Card className="shadow-sm border border-gray-200">
        <CardHeader>
          <CardTitle className="text-sm text-gray-500">Upcoming Trips</CardTitle>
          <CardContent className="pt-2">
            <p className="text-3xl font-bold text-slate-800">{upcoming}</p>
          </CardContent>
        </CardHeader>
      </Card>

      {/* Cost Operator (This Month) */}
      <Card className="shadow-sm border border-gray-200">
        <CardHeader>
          <CardTitle className="text-sm text-gray-500">
            Cost Operator (This Month)
          </CardTitle>
          <CardContent className="pt-2">
            <p className="text-3xl font-bold text-blue-600">
              ${costOperator.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </CardHeader>
      </Card>

      {/* Price Commission (This Month) */}
      <Card className="shadow-sm border border-gray-200">
        <CardHeader>
          <CardTitle className="text-sm text-gray-500">
            Price Commission (This Month)
          </CardTitle>
          <CardContent className="pt-2">
            <p className="text-3xl font-bold text-amber-600">
              ${priceCommission.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </CardHeader>
      </Card>
    </div>
  );
}
