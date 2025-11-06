import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = params

    // Fetch itinerary passengers with passenger details
    const { data, error } = await supabase
      .from("itinerary_passenger")
      .select(`
        *,
        passenger:passenger_id (
          id,
          contact_id,
          full_name,
          email,
          phone,
          company,
          avatar_path,
          contact:contact_id (
            id,
            full_name,
            email
          )
        )
      `)
      .eq("itinerary_id", id)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching itinerary passengers:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      data: {
        passengers: data || [],
      },
    })
  } catch (error: any) {
    console.error("Get itinerary passengers error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const tenantId = user.app_metadata?.tenant_id
    if (!tenantId) {
      return NextResponse.json({ error: "Missing tenant_id" }, { status: 400 })
    }

    const { id } = params
    const body = await request.json()
    const { passengers } = body

    if (!Array.isArray(passengers)) {
      return NextResponse.json({ error: "Passengers must be an array" }, { status: 400 })
    }

    // Get itinerary to check total_pax
    const { data: itinerary, error: itineraryError } = await supabase
      .from("itinerary")
      .select("total_pax, tenant_id")
      .eq("id", id)
      .single()

    if (itineraryError || !itinerary) {
      return NextResponse.json({ error: "Itinerary not found" }, { status: 404 })
    }

    if (passengers.length > itinerary.total_pax) {
      return NextResponse.json(
        { error: `Cannot exceed ${itinerary.total_pax} passengers` },
        { status: 400 }
      )
    }

    // Delete existing passengers for this itinerary
    const { error: deleteError } = await supabase
      .from("itinerary_passenger")
      .delete()
      .eq("itinerary_id", id)

    if (deleteError) {
      console.error("Error deleting existing passengers:", deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    // Insert new passengers
    if (passengers.length > 0) {
      const passengerInserts = passengers.map((p: { passenger_id: string }) => ({
        itinerary_id: id,
        passenger_id: p.passenger_id,
        tenant_id: tenantId,
      }))

      const { error: insertError } = await supabase
        .from("itinerary_passenger")
        .insert(passengerInserts)

      if (insertError) {
        console.error("Error inserting passengers:", insertError)
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Update itinerary passengers error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

