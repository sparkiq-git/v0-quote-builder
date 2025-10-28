import { createClient } from "@/lib/supabase/client"

export async function getLeadRoutes(limit = 10) {
  const supabase = createClient()

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
    .order("depart_dt", { ascending: true })
    .limit(limit)

  if (error) throw error

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
          originCoords: { lat: r.origin_lat, lng: r.origin_long, name: r.origin_code },
          destCoords: { lat: r.destination_lat, lng: r.destination_long, name: r.destination_code },
        },
      ],
    })) ?? []
  )
}

export async function getUpcomingRoutes(limit = 10) {
  const supabase = createClient()
  const now = new Date().toISOString()

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
    .gt("depart_dt", now)
    .order("depart_dt", { ascending: true })
    .limit(limit)

  if (error) throw error

  return (
    data?.map((r) => ({
      id: r.lead_id,
      type: "upcoming",
      customerName: r.lead?.customer_name ?? "Unknown",
      status: r.lead?.status ?? "unknown",
      createdAt: r.lead?.created_at ?? "",
      legs: [
        {
          origin: r.origin,
          destination: r.destination,
          originCoords: { lat: r.origin_lat, lng: r.origin_long, name: r.origin_code },
          destCoords: { lat: r.destination_lat, lng: r.destination_long, name: r.destination_code },
        },
      ],
    })) ?? []
  )
}
