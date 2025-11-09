import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { id } = params

    const tenantId = process.env.NEXT_PUBLIC_TENANT_ID

    // Fetch trips for this passenger through itinerary_passenger junction table
    const { data, error } = await supabase
      .from("itinerary_passenger")
      .select(
        `
        itinerary_trip!inner (
          id,
          itinerary_id,
          trip_date,
          departure_airport,
          arrival_airport,
          aircraft:tail_id (
            tail_number,
            model:model_id (
              name
            )
          )
        )
      `,
      )
      .eq("passenger_id", id)
      .order("itinerary_trip(trip_date)", { ascending: false })

    if (error) {
      console.error("Error fetching passenger history:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Extract the trip data
    const trips = data?.map((item: any) => item.itinerary_trip) || []

    return NextResponse.json(trips)
  } catch (error: any) {
    console.error("Error in GET /api/passengers/[id]/history:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
