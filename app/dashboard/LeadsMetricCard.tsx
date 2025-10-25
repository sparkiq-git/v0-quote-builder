// app/dashboard/LeadsMetricCard.tsx
export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // ensure Node runtime, not Edge

import { getLeadCount } from "@/lib/data/getLeadCount";
import { Users } from "lucide-react";
import MetricCard from "@/components/MetricCard";

export default async function LeadsMetricCard() {
  const count = await getLeadCount();
  return (
    <MetricCard
      title="Leads activos"
      icon={Users}
      currentValue={count}
      description="Status: opened o new"
    />
  );
}
