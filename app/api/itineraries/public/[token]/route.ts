import { NextRequest, NextResponse } from "next/server"
import { createActionLinkClient } from "@/lib/supabase/action-links"
import { sha256Base64url } from "@/lib/security/token"
import { rlPerIp } from "@/lib/redis"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest, { params }: { params: { token: string } }) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "unknown"

    // Rate limit by IP
    try {
      const ipRes = await rlPerIp.limit(`public-itinerary:ip:${ip}`)
      if (!ipRes.success) {
        return NextResponse.json({ error: "Too many requests" }, { status: 429 })
      }
    } catch (err) {
      console.error("IP rate limit error:", err)
      // Non-critical, continue
    }

    const { token } = params
    const tokenHash = await sha256Base64url(token)

    const supabase = await createActionLinkClient(true)

    // Fetch action link
    const { data: link, error: linkError } = await supabase
      .from("action_link")
      .select("*")
      .eq("token_hash", tokenHash)
      .single()

    if (linkError || !link) {
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 })
    }

    // Validate link
    const now = new Date()
    if (link.status !== "active") {
      return NextResponse.json({ error: "Link not active" }, { status: 400 })
    }
    if (new Date(link.expires_at) < now) {
      return NextResponse.json({ error: "Link expired" }, { status: 400 })
    }
    if (link.action_type !== "view_itinerary") {
      return NextResponse.json({ error: "Invalid link type" }, { status: 400 })
    }

    const itineraryId = link.metadata?.itinerary_id
    if (!itineraryId) {
      return NextResponse.json({ error: "Itinerary ID not found in link" }, { status: 400 })
    }

    // Fetch itinerary with all details
    const { data: itinerary, error: itineraryError } = await supabase
      .from("itinerary")
      .select(
        `
        id,
        title,
        trip_summary,
        trip_type,
        leg_count,
        total_pax,
        domestic_trip,
        asap,
        aircraft_tail_no,
        earliest_departure,
        latest_return,
        notes,
        special_requirements,
        currency,
        created_at,
        contact:contact_id (
          id,
          full_name,
          email,
          company
        )
      `
      )
      .eq("id", itineraryId)
      .single()

    if (itineraryError || !itinerary) {
      return NextResponse.json({ error: "Itinerary not found" }, { status: 404 })
    }

    // Fetch itinerary details (flight legs)
    const { data: details, error: detailsError } = await supabase
      .from("itinerary_detail")
      .select("*")
      .eq("itinerary_id", itineraryId)
      .order("seq", { ascending: true })

    if (detailsError) {
      console.error("Error fetching itinerary details:", detailsError)
    }

    // Fetch passengers
    const { data: passengerAssignments, error: passengersError } = await supabase
      .from("itinerary_passenger")
      .select(
        `
        id,
        passenger_id,
        passenger:passenger_id (
          id,
          full_name,
          email,
          phone,
          company
        )
      `
      )
      .eq("itinerary_id", itineraryId)

    if (passengersError) {
      console.error("Error fetching passengers:", passengersError)
    }

    // Fetch crew
    const { data: crew, error: crewError } = await supabase
      .from("itinerary_crew")
      .select("*")
      .eq("itinerary_id", itineraryId)
      .order("role", { ascending: true })

    if (crewError) {
      console.error("Error fetching crew:", crewError)
    }

    // Update link use count (track views)
    try {
      await supabase
        .from("action_link")
        .update({
          use_count: link.use_count + 1,
          last_verified_at: now.toISOString(),
        })
        .eq("id", link.id)
    } catch (updateErr) {
      console.error("Error updating link use count:", updateErr)
      // Non-critical, continue
    }

    return NextResponse.json({
      data: {
        itinerary: {
          ...itinerary,
          details: details || [],
        },
        passengers: passengerAssignments || [],
        crew:
          crew?.map((member) => ({
            id: member.id,
            role: member.role,
            full_name: member.full_name,
            notes: member.notes,
            confirmed: member.confirmed,
          })) || [],
      },
    })
  } catch (error: any) {
    console.error("Public itinerary error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
