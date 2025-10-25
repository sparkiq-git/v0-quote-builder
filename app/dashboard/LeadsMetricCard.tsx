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
      description="Pending conversion to quote"
    />
  );
}
