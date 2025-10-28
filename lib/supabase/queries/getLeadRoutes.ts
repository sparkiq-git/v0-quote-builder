import { createClient } from "@/lib/supabase/client"

export async function getLeadRoutes() {
  const supabase = createClient()

  // ✅ 1. Get all leads with status new or opened (no date filter)
  const { data, error } = await supabase
    .from("lead_detail")
    .select(`
      id,
      lead_id,
      origin,
      origin_code,
      destination,
      destination_code,
      depart_dt,
      origin_lat,
      origin_long,
      destination_lat,
      destination_long,
      lead:lead_id (
        id,
        customer_name,
        status,
        created_at
      )
    `)
    .in("lead.status", ["new", "opened"]) // only new/opened leads
    .order("depart_dt", { ascending: true }) // optional sort by date

  if (error) throw error

  // ✅ 2. Transform the data into route objects expected by RouteMap
  return (
    data?.map((r) => ({
      id: r.lead_id,
      type: "leads",
      customerName: r.lead?.customer_name ?? "Unknown",
      status: r.lead?.status ?? "unknown",
      createdAt: r.lead?.created_at ?? "",
      legs: [
        {
          origin: r.origin,
          destination: r.destination,
          originCoords: {
            lat: r.origin_lat,
            lng: r.origin_long,
            name: r.origin_code,
          },
          destCoords: {
            lat: r.destination_lat,
            lng: r.destination_long,
            name: r.destination_code,
          },
          departDt: r.depart_dt,
        },
      ],
    })) ?? []
  )
}
