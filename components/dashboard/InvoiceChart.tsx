"use client";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { createClient } from "@/lib/supabase/client";

export default function InvoiceChart() {
  const [data, setData] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const loadChart = async () => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const lastYear = currentYear - 1;

      const { data: invoices, error } = await supabase
        .from("invoice")
        .select("amount, status, issued_at")
        .eq("status", "paid");

      if (error) return console.error(error);

      const monthly = Array.from({ length: 12 }, (_, i) => ({
        month: new Date(0, i).toLocaleString("default", { month: "short" }),
        currentYear: 0,
        lastYear: 0,
      }));

      invoices?.forEach((inv) => {
        const d = new Date(inv.issued_at);
        const year = d.getFullYear();
        const monthIndex = d.getMonth();
        if (year === currentYear)
          monthly[monthIndex].currentYear += parseFloat(inv.amount);
        else if (year === lastYear)
          monthly[monthIndex].lastYear += parseFloat(inv.amount);
      });

      setData(monthly);
    };

    loadChart();
  }, [supabase]);

  return (
    <Card className="shadow-sm border border-gray-200 w-full h-[520px]">
      <CardHeader>
        <CardTitle className="text-sm text-gray-600">
          Paid Invoice Totals by Month 
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={data}>
            <XAxis dataKey="month" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
            <Legend />
            <Line type="monotone" dataKey="lastYear" stroke="#9ca3af" strokeWidth={2} name="Previous Year" />
            <Line type="monotone" dataKey="currentYear" stroke="#16a34a" strokeWidth={3} name="Current Year" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
