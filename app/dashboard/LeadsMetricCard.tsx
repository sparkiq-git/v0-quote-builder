export const dynamic = "force-dynamic"; // ensure it isn't statically baked

import { Users } from "lucide-react";
import MetricCard from "@/components/MetricCard";
import { getLeadCount } from "@/lib/data/getLeadCount";

export default async function LeadsMetricCard() {
  const count = await getLeadCount(); // always returns a number (0 on error)
  return (
    <MetricCard
      title="Leads activos"
      icon={Users}
      currentValue={count}
      description="Status: opened o new"
    />
  );
}
