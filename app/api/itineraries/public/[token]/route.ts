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
        tenant_id,
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
          company,
          avatar_path
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

    let aircraft: any = null
    if (itinerary.aircraft_tail_no) {
      const { data: aircraftRow, error: aircraftError } = await supabase
        .from("aircraft")
        .select(
          `
          id,
          tail_number,
          aircraft_model:aircraft_model!model_id (
            id,
            name,
            aircraft_manufacturer:aircraft_manufacturer!manufacturer_id (
              id,
              name
            )
          ),
          operator:operator!operator_id (
            id,
            name
          )
        `
        )
        .eq("tenant_id", itinerary.tenant_id)
        .eq("tail_number", itinerary.aircraft_tail_no)
        .maybeSingle()

      if (aircraftError) {
        console.error("Error fetching aircraft:", aircraftError)
      }

      if (aircraftRow) {
        aircraft = {
          id: aircraftRow.id,
          tail_number: aircraftRow.tail_number,
          manufacturer: aircraftRow.aircraft_model?.aircraft_manufacturer?.name ?? null,
          model: aircraftRow.aircraft_model?.name ?? null,
          operator: aircraftRow.operator?.name ?? null,
          images: [] as any[],
        }

        // Fetch aircraft images filtered by tenant_id
        const { data: images, error: imagesError } = await supabase
          .from("aircraft_image")
          .select("id, public_url, storage_path, caption, is_primary, display_order, created_at")
          .eq("tenant_id", itinerary.tenant_id)
          .eq("aircraft_id", aircraftRow.id)
          .order("is_primary", { ascending: false })
          .order("display_order", { ascending: true })
          .order("created_at", { ascending: false })

        // Also fetch model images if model exists, filtered by tenant_id
        let modelImages: any[] = []
        if (aircraftRow.aircraft_model?.id) {
          const { data: modelImgs, error: modelImagesError } = await supabase
            .from("aircraft_model_image")
            .select("id, public_url, storage_path, caption, is_primary, display_order, created_at")
            .eq("tenant_id", itinerary.tenant_id)
            .eq("aircraft_model_id", aircraftRow.aircraft_model.id)
            .order("is_primary", { ascending: false })
            .order("display_order", { ascending: true })
            .order("created_at", { ascending: false })
          
          if (!modelImagesError && modelImgs) {
            modelImages = modelImgs
          }
        }

        if (imagesError) {
          console.error("Error fetching aircraft images:", imagesError)
        } else if (images) {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
          
          // Combine aircraft images and model images, prioritizing aircraft images
          const allImages = [
            ...images.map((img) => {
              const url =
                img.public_url ||
                (supabaseUrl
                  ? `${supabaseUrl}/storage/v1/object/public/aircraft-media/${img.storage_path}`
                  : null)
              return url
                ? {
                    id: img.id,
                    url,
                    caption: img.caption,
                    is_primary: !!img.is_primary,
                    display_order: img.display_order ?? 0,
                  }
                : null
            }),
            ...modelImages.map((img) => {
              const url =
                img.public_url ||
                (supabaseUrl
                  ? `${supabaseUrl}/storage/v1/object/public/aircraft-media/${img.storage_path}`
                  : null)
              return url
                ? {
                    id: img.id,
                    url,
                    caption: img.caption,
                    is_primary: !!img.is_primary,
                    display_order: img.display_order ?? 0,
                  }
                : null
            }),
          ].filter(Boolean)
          
          // Sort by is_primary and display_order
          aircraft.images = allImages.sort((a: any, b: any) => {
            if (a.is_primary && !b.is_primary) return -1
            if (!a.is_primary && b.is_primary) return 1
            return a.display_order - b.display_order
          })
        }
      }
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
        aircraft,
      },
    })
  } catch (error: any) {
    console.error("Public itinerary error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
