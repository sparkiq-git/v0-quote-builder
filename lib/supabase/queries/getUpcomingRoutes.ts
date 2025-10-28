import { createClient } from "@/lib/supabase/client";

export async function getUpcomingRoutes(limit = 10) {
  const supabase = createClient();
  const now = new Date().toISOString();

  // Step 1: Get lead details for upcoming departures
  const { data: legs, error: legsError } = await supabase
    .from("lead_detail")
    .select("lead_id, origin, origin_code, destination, destination_code, depart_dt")
    .gt("depart_dt", now)
    .order("depart_dt", { ascending: true })
    .limit(limit);

  if (legsError) throw legsError;
  if (!legs?.length) return [];

  // Step 2: Get related leads
  const leadIds = [...new Set(legs.map((l) => l.lead_id))];
  const { data: leads, error: leadsError } = await supabase
    .from("lead")
    .select("id, customer_name, trip_summary, status")
    .in("id", leadIds);

  if (leadsError) throw leadsError;

  // Step 3: Merge data
  return legs.map((leg) => {
    const lead = leads.find((l) => l.id === leg.lead_id);
    return {
      ...leg,
      customer_name: lead?.customer_name ?? "",
      trip_summary: lead?.trip_summary ?? "",
      status: lead?.status ?? "",
    };
  });
}
