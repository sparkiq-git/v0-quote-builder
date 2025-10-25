"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import MetricCard from "@/components/MetricCard";

export default function LeadsMetricCardClient() {
  const [count, setCount] = useState<number>(0);

  const refresh = async () => {
    const { count, error } = await supabase
      .from("lead")
      .select("*", { count: "exact", head: true })
      .in("status", ["opened", "new"]);

    if (!error) setCount(count ?? 0);
  };

  useEffect(() => {
    refresh();

    const channel = supabase
      .channel("realtime-leads")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lead" },
        () => refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <MetricCard
      title="Leads activos"
      icon={Users}
      currentValue={count}
      description="Status: opened o new"
    />
  );
}
