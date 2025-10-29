"use client";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function DashboardMetrics() {
  const [upcoming, setUpcoming] = useState(0);
  const [commission, setCommission] = useState(0);
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

      // --- Count upcoming trips (within 7 days)
      const { count: upcomingDepartures } = await supabase
        .from("quote_detail")
        .select("*", { count: "exact", head: true })
        .gte("depart_dt", now.toISOString())
        .lte("depart_dt", new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString());

      setUpcoming(upcomingDepartures ?? 0);

      // --- Sum commissions (paid invoices this month)
      const { data: invoices, error: invoiceError } = await supabase
        .from("invoice")
        .select("amount, status, issued_at")
        .eq("status", "paid")
        .gte("issued_at", firstDay.toISOString())
        .lte("issued_at", lastDay.toISOString());

      if (!invoiceError && invoices?.length) {
        const total = invoices.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
        setCommission(total);
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
      }
    };

    loadMetrics();
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <Card className="shadow-sm border border-gray-200">
        <CardHeader>
          <CardTitle className="text-sm text-gray-500">Upcoming Trips</CardTitle>
          <CardContent className="pt-2">
            <p className="text-3xl font-bold text-slate-800">{upcoming}</p>
          </CardContent>
        </CardHeader>
      </Card>

      <Card className="shadow-sm border border-gray-200">
        <CardHeader>
          <CardTitle className="text-sm text-gray-500">Commission (This Month)</CardTitle>
          <CardContent className="pt-2">
            <p className="text-3xl font-bold text-green-600">
              ${commission.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </CardHeader>
      </Card>

      <Card className="shadow-sm border border-gray-200">
        <CardHeader>
          <CardTitle className="text-sm text-gray-500">Cost Operator (This Month)</CardTitle>
          <CardContent className="pt-2">
            <p className="text-3xl font-bold text-blue-600">
              ${costOperator.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </CardHeader>
      </Card>

      <Card className="shadow-sm border border-gray-200">
        <CardHeader>
          <CardTitle className="text-sm text-gray-500">Price Commission (This Month)</CardTitle>
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
