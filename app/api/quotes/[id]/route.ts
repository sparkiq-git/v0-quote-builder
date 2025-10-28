import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createActionLinkClient } from "@/lib/supabase/action-links"
import { QuoteTypeMapper } from "@/lib/utils/quote-mapper"

/* ---------------- Utility helpers ---------------- */
function toDateTime(date?: string | null, time?: string | null): string | null {
  if (!date) return null
  try {
    const iso = `${date}${time ? `T${time}` : "T00:00"}:00`
    const dt = new Date(iso)
    return isNaN(dt.getTime()) ? null : dt.toISOString()
  } catch {
    return null
  }
}

function haversineDistanceNM(lat1: number, lon1: number, lat2: number, lon2: number): number | null {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  if ([lat1, lon1, lat2, lon2].some((v) => v == null || isNaN(Number(v)))) return null
  const R = 3440.065 // Earth radius in nautical miles
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c)
}

/* ---------------- GET handler ---------------- */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  // Use service role client to bypass RLS for public quote access
  const supabase = await createActionLinkClient(true)
  const { id } = params

  // Check if this is a public quote access (from action link)
  const referer = req.headers.get("referer")
  const isPublicAccess = referer?.includes("/action/") || req.headers.get("x-public-quote") === "true"

  try {
    // Fetch the main quote
    const { data: quote, error: quoteError } = await supabase
      .from("quote")
      .select("*")
      .eq("id", id)
      .single()

    if (quoteError) {
      console.error("Quote fetch error:", quoteError)
      return NextResponse.json({ error: "Quote not found" }, { status: 404 })
    }

    // Fetch quote legs
    const { data: legs, error: legsError } = await supabase
      .from("quote_detail")
      .select("*")
      .eq("quote_id", id)
      .order("seq")

    if (legsError) {
      console.error("Legs fetch error:", legsError)
    }

    // Fetch quote options
    const { data: options, error: optionsError } = await supabase
      .from("quote_option")
      .select("*")
      .eq("quote_id", id)

    if (optionsError) {
      console.error("Options fetch error:", optionsError)
    }

    // Fetch quote services
    const { data: services, error: servicesError } = await supabase
      .from("quote_item")
      .select("*")
      .eq("quote_id", id)

    if (servicesError) {
      console.error("Services fetch error:", servicesError)
    }

    // Fetch aircraft data for the options
    const aircraftIds = (options || []).map(opt => opt.aircraft_id).filter(Boolean)
    
    let aircraftData = []
    
    if (aircraftIds.length > 0) {
      const { data: aircraft, error: aircraftError } = await supabase
        .from("aircraft")
        .select(`
          *,
          aircraft_model!model_id (
            id,
            name,
            manufacturer_id,
            size_code,
            aircraft_manufacturer!manufacturer_id (
              id,
              name
            ),
            aircraft_model_image (
              id,
              public_url,
              is_primary,
              display_order
            )
          ),
          aircraft_image (
            id,
            public_url,
            is_primary,
            display_order
          ),
          aircraft_amenity (
            id,
            amenity_id,
            amenity (
              id,
              code,
              name,
              description,
              category,
              icon_type,
              icon_ref
            )
          )
        `)
        .in("id", aircraftIds)
      
      if (aircraftError) {
        console.error("Aircraft fetch error:", aircraftError)
      } else {
        aircraftData = aircraft || []
      }
    }

    // Debug logging
    console.log("Raw quote data:", JSON.stringify(quote, null, 2))
    console.log("Raw legs data:", JSON.stringify(legs, null, 2))
    console.log("Raw options data:", JSON.stringify(options, null, 2))
    console.log("Aircraft data with amenities:", JSON.stringify(aircraftData.map(a => ({
      id: a.id,
      tail_number: a.tail_number,
      amenities: a.aircraft_amenity?.map((amenity: any) => amenity.amenity?.name)
    })), null, 2))
    console.log("Raw services data:", JSON.stringify(services, null, 2))
    console.log("Aircraft data:", JSON.stringify(aircraftData, null, 2))

    // Use type mapper to transform data consistently
    const transformedQuote = QuoteTypeMapper.normalizeQuote({
      ...quote,
      legs: (legs || []).map((leg: any) => ({
        id: leg.id,
        origin: leg.origin_code,
        destination: leg.destination_code,
        departureDate: leg.depart_dt,
        departureTime: leg.depart_time,
        passengers: leg.pax_count,
        notes: leg.notes,
        fboOriginId: leg.fbo_origin_id,
        fboDestinationId: leg.fbo_destination_id,
        origin_lat: leg.origin_lat,
        origin_long: leg.origin_long,
        destination_lat: leg.destination_lat,
        destination_long: leg.destination_long,
        distance_nm: leg.distance_nm,
      })),
      options: (options || []).map((option: any) => {
        const aircraft = aircraftData.find(a => a.id === option.aircraft_id)
        const aircraftModel = aircraft?.aircraft_model
        
        return {
          id: option.id,
          aircraftModelId: option.aircraft_id,
          aircraftTailId: option.aircraft_tail_id,
          totalHours: option.flight_hours || 0,
          operatorCost: option.cost_operator || 0,
          commission: option.price_commission || 0,
          tax: option.price_base || 0,
          fees: [], // TODO: Add fees support if needed
          feesEnabled: false,
          selectedAmenities: aircraft?.aircraft_amenity?.map((amenity: any) => amenity.amenity?.name).filter(Boolean) || [],
          notes: option.notes,
          conditions: option.conditions,
          additionalNotes: option.additional_notes,
          // Include aircraft model data for the component
          aircraftModel: aircraftModel ? {
            id: aircraftModel.id,
            name: aircraftModel.name,
            manufacturer: aircraftModel.aircraft_manufacturer?.name || 'Unknown',
            defaultCapacity: aircraftModel.size_code ? parseInt(aircraftModel.size_code) : 8,
            defaultRangeNm: 2000, // Default range
            defaultSpeedKnots: 400, // Default speed
            images: aircraftModel.aircraft_model_image
              ?.sort((a: any, b: any) => {
                if (a.is_primary && !b.is_primary) return -1
                if (!a.is_primary && b.is_primary) return 1
                return a.display_order - b.display_order
              })
              .map((img: any) => {
                // If the URL is malformed, try to regenerate it
                if (img.public_url && !img.public_url.includes('/models/')) {
                  // Try to reconstruct the correct path
                  const fileName = img.public_url.split('/').pop()
                  const reconstructedUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/aircraft-media/tenant/${aircraftModel.created_by}/models/${aircraftModel.id}/${fileName}`
                  return reconstructedUrl
                }
                return img.public_url
              })
              .filter(Boolean) || [],
          } : null,
          // Include aircraft tail data for the component
          aircraftTail: aircraft ? {
            id: aircraft.id,
            tailNumber: aircraft.tail_number,
            operator: aircraft.operator_id,
            year: aircraft.year_of_manufacture,
            yearOfRefurbish: aircraft.year_of_refurbish,
            cruisingSpeed: aircraft.cruising_speed,
            rangeNm: aircraft.range_nm,
            amenities: aircraft.aircraft_amenity?.map((amenity: any) => amenity.amenity?.name).filter(Boolean) || [],
            images: aircraft.aircraft_image
              ?.sort((a: any, b: any) => {
                if (a.is_primary && !b.is_primary) return -1
                if (!a.is_primary && b.is_primary) return 1
                return a.display_order - b.display_order
              })
              .map((img: any) => {
                // If the URL is malformed, try to regenerate it
                if (img.public_url && !img.public_url.includes('/aircraft/')) {
                  // Try to reconstruct the correct path
                  const fileName = img.public_url.split('/').pop()
                  const reconstructedUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/aircraft-media/tenant/${aircraft.tenant_id}/aircraft/${aircraft.id}/${fileName}`
                  return reconstructedUrl
                }
                return img.public_url
              })
              .filter(Boolean) || [],
            capacityOverride: aircraft.capacity_pax,
            rangeNmOverride: aircraft.range_nm,
            speedKnotsOverride: aircraft.cruising_speed,
            status: aircraft.status,
            homeBase: aircraft.home_base,
            serialNumber: aircraft.serial_number,
            mtowKg: aircraft.mtow_kg,
          } : null,
        }
      }),
      services: (services || []).map((service: any) => ({
        id: service.id,
        name: service.name,
        description: service.description,
        amount: service.unit_price || 0,
        qty: service.qty || 1,
        taxable: service.taxable,
        notes: service.notes,
      })),
    })

    return NextResponse.json(transformedQuote)
  } catch (error) {
    console.error("Unexpected error fetching quote:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/* ---------------- PATCH handler ---------------- */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = await createActionLinkClient(true)
  const { id } = params

  try {
    // Parse request body
    let body: any = {}
    try {
      body = await req.json()
    } catch (parseError: any) {
      console.error("Failed to parse request body:", parseError)
      return NextResponse.json({ 
        error: "Invalid request body",
        details: parseError?.message 
      }, { status: 400 })
    }

    const { selectedOptionId, status, declineReason, declineNotes } = body

    // Check if this is a public quote access (from action link)
    const referer = req.headers.get("referer")
    const isPublicAccess = referer?.includes("/action/") || req.headers.get("x-public-quote") === "true"

    if (!isPublicAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Update quote with new selection or status
    const updates: any = {}
    if (selectedOptionId !== undefined) {
      updates.selected_option_id = selectedOptionId
    }
    if (status) {
      updates.status = status
    }

    const { data: updatedQuote, error: updateError } = await supabase
      .from("quote")
      .update(updates)
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      console.error("Quote update error:", updateError)
      return NextResponse.json({ error: "Failed to update quote" }, { status: 500 })
    }

    // NOTE: Token revocation disabled for now - handle later
    // If quote was accepted, revoke the action link token
    // if (status === "accepted") {
    //   try {
    //     // Find the action link associated with this quote
    //     const { data: actionLinks } = await supabase
    //       .from("action_link")
    //       .select("id, status")
    //       .eq("metadata->>quote_id", id)
    //       .eq("status", "active")

    //     // Revoke all active action links for this quote
    //     if (actionLinks && actionLinks.length > 0) {
    //       await supabase
    //         .from("action_link")
    //         .update({ 
    //           status: "consumed",
    //           consumed_at: new Date().toISOString()
    //         })
    //         .in("id", actionLinks.map(link => link.id))
    //     }
    //   } catch (revokeError) {
    //     console.error("Failed to revoke action link:", revokeError)
    //     // Non-critical, continue even if revocation fails
    //   }
    // }

    // Log the action in audit log (if from action link)
    // Note: This is intentionally outside the main try-catch to prevent audit failures from breaking the response
    if (true) {
      try {
        const referer = req.headers.get("referer") || ""
        const isPublicAccess = referer?.includes("/action/") || referer?.includes("/q/")
        
        if (isPublicAccess) {
          // Get action link info for audit - look for any status (active or consumed)
          const { data: actionLink, error: actionLinkError } = await supabase
            .from("action_link")
            .select("id, tenant_id, action_type, status")
            .eq("metadata->>quote_id", id)
            .order("created_at", { ascending: false })
            .maybeSingle()
          
          if (actionLinkError) {
            console.error("Failed to fetch action link for audit:", actionLinkError)
          } else if (actionLink) {
            const auditPayload = {
              tenant_id: actionLink.tenant_id,
              actor_user_id: null,
              action: `quote.${status || 'updated'}`,
              target_id: actionLink.id,
              action_type: actionLink.action_type,
              details: {
                quote_id: id,
                selectedOptionId,
                status,
                declineReason,
                declineNotes,
                link_status: actionLink.status, // track if link was active/consumed
              },
              ip: req.headers.get("x-forwarded-for") || "unknown",
              user_agent: req.headers.get("user-agent") || "unknown",
            }
            
            console.log("Inserting audit log:", JSON.stringify(auditPayload, null, 2))
            
            const { error: auditError } = await supabase.from("action_link_audit_log").insert(auditPayload)
            
            if (auditError) {
              console.error("Failed to insert audit log:", JSON.stringify(auditError, null, 2))
            } else {
              console.log("Audit log inserted successfully")
            }
          }
        }
      } catch (auditErr: any) {
        console.error("Audit log failed (non-critical):", auditErr)
        console.error("Audit error details:", {
          message: auditErr?.message,
          stack: auditErr?.stack,
          name: auditErr?.name,
        })
        // Don't throw - this is non-critical
      }
    }

    return NextResponse.json({ success: true, quote: updatedQuote })
  } catch (error: any) {
    console.error("Unexpected error updating quote:", error)
    console.error("Error details:", {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    })
    
    // Always return JSON, even on errors
    try {
      return NextResponse.json({ 
        error: error?.message || "Internal server error",
        details: error?.message || "An unexpected error occurred",
      }, { status: 500 })
    } catch (responseError) {
      // Fallback if even JSON response creation fails
      console.error("Failed to create error response:", responseError)
      return new Response(
        JSON.stringify({ 
          error: error?.message || "Internal server error",
          details: "Failed to create proper error response"
        }), 
        { 
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      )
    }
  }
}

/* ---------------- PUT handler (existing) ---------------- */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = params
  const body = await req.json()
  const { quote, options, legs, services } = body

  console.log("🛰️ Incoming save payload:", JSON.stringify({ quote, options, legs }, null, 2))

  /* ---------------- 🧱 Update main quote ---------------- */
  if (quote) {
    const { error: quoteError } = await supabase
      .from("quote")
      .update({
        contact_id: quote.contact_id,
        contact_name: quote.contact_name,
        contact_email: quote.contact_email,
        contact_phone: quote.contact_phone,
        contact_company: quote.contact_company,
        valid_until: quote.valid_until,
        notes: quote.notes,
        title: quote.title,
        status: quote.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (quoteError)
      return NextResponse.json({ error: quoteError.message }, { status: 500 })
  }

  /* ---------------- ✈️ Upsert legs ---------------- */
  if (legs && Array.isArray(legs)) {
    const validLegs = legs
      .filter((l) => l.origin_code && l.destination_code)
      .map((l, i) => {
        const distance_nm =
          l.origin_lat != null &&
          l.origin_long != null &&
          l.destination_lat != null &&
          l.destination_long != null
            ? haversineDistanceNM(
                Number(l.origin_lat),
                Number(l.origin_long),
                Number(l.destination_lat),
                Number(l.destination_long)
              )
            : null

        return {
          id: l.id || crypto.randomUUID(),
          quote_id: id,
          seq: i + 1,
          origin: l.origin,
          origin_code: l.origin_code,
          destination: l.destination,
          destination_code: l.destination_code,
          depart_dt: l.departureDate,
          depart_time: l.departureTime,
          pax_count: l.passengers ?? l.pax_count ?? 1,
          origin_lat: l.origin_lat ?? null,
          origin_long: l.origin_long ?? null,
          destination_lat: l.destination_lat ?? null,
          destination_long: l.destination_long ?? null,
          distance_nm,
          updated_at: new Date().toISOString(),
          created_at: l.created_at || new Date().toISOString(),
        }
      })

    console.log("🛫 Prepared legs to insert:", JSON.stringify(validLegs, null, 2))

const { error: upsertError } = await supabase
  .from("quote_detail")
  .upsert(validLegs, { onConflict: "quote_id,seq" })

    if (upsertError)
      return NextResponse.json({ error: upsertError.message }, { status: 500 })

// 🧹 Step 2: Delete legs no longer present
const existingIds = validLegs.map((l) => l.id)
if (existingIds.length > 0) {
  const { error: deleteError } = await supabase
    .from("quote_detail")
    .delete()
    .eq("quote_id", id)
    .not("id", "in", `(${existingIds.join(",")})`)
  if (deleteError)
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
}


    const leg_count = validLegs.length
    const total_pax = Math.max(...validLegs.map((l) => Number(l.pax_count || 0))) || 1
    const chain = validLegs.flatMap((l) => [l.origin_code, l.destination_code]).filter(Boolean)
    const trip_summary = chain.join(" → ")

    const depTimes = validLegs
      .map((l) => toDateTime(l.depart_dt, l.depart_time))
      .filter(Boolean)
      .map((s) => new Date(s as string).getTime())

    const earliest_departure =
      depTimes.length > 0 ? new Date(Math.min(...depTimes)).toISOString() : null
    const latest_return =
      depTimes.length > 0 ? new Date(Math.max(...depTimes)).toISOString() : null

    const trip_type =
      leg_count === 1
        ? "one-way"
        : leg_count === 2 &&
          validLegs[0].origin_code === validLegs[1].destination_code &&
          validLegs[0].destination_code === validLegs[1].origin_code
        ? "round-trip"
        : "multi-city"

    const { error: metaError } = await supabase
      .from("quote")
      .update({
        trip_summary,
        trip_type,
        leg_count,
        total_pax,
        earliest_departure,
        latest_return,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (metaError)
      return NextResponse.json({ error: metaError.message }, { status: 500 })
  }

  /* ---------------- 🛩️ Upsert quote options ---------------- */
  if (options && Array.isArray(options)) {
    const { error: optionError } = await supabase
      .from("quote_option")
      .upsert(
        options.map((o: any, index: number) => ({
          id: o.id,
          label: o.label || `Option ${index + 1}`,
          quote_id: o.quote_id || id,
          aircraft_id: o.aircraft_id,
          flight_hours: o.flight_hours ?? 0,
          cost_operator: o.cost_operator ?? 0,
          price_commission: o.price_commission ?? 0,
          price_base: o.price_base ?? 0,
          price_total: o.price_total ?? 0,
          notes: o.notes ?? null,
          updated_at: new Date().toISOString(),
        }))
      )

    if (optionError)
      return NextResponse.json({ error: optionError.message }, { status: 500 })
  }


/* ---------------- 💼 Upsert quote services (quote_item) ---------------- */
if (services && Array.isArray(services)) {
  const itemIds = services.map((s) => s.item_id).filter(Boolean)

  let itemMap: Record<string, string> = {}
  if (itemIds.length > 0) {
    const { data: itemData, error: itemError } = await supabase
      .from("item")
      .select("id, name")
      .in("id", itemIds)

    if (itemError)
      return NextResponse.json({ error: itemError.message }, { status: 500 })

    itemMap = Object.fromEntries(itemData.map((i) => [i.id, i.name]))
  }

  const validServices = services.map((s) => ({
    id: s.id || crypto.randomUUID(),
    quote_id: id, // ✅ always the URL id
    item_id: s.item_id || null,
    name: s.item_id ? itemMap[s.item_id] || "Unnamed item" : s.description || "Custom item",
    description: s.description || itemMap[s.item_id] || "Service item",
    qty: s.qty ?? 1,
    unit_price: Number(s.amount) || 0,
    unit_cost: s.unit_cost ?? null,
    taxable: s.taxable ?? true,
    notes: s.notes ?? null,
    updated_at: new Date().toISOString(),
    created_at: s.created_at || new Date().toISOString(),
  }))

  /* 🧩 Step 1: Upsert if there are any services */
  if (validServices.length > 0) {
    const { error: upsertError } = await supabase
      .from("quote_item")
      .upsert(validServices, { onConflict: "id" })

    if (upsertError)
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
  }

  /* 🧹 Step 2: Delete cleanup — including full wipe when no services left */
  if (validServices.length > 0) {
    const existingIds = validServices.map((s) => s.id).filter(Boolean)
    const idList = `(${existingIds.join(",")})`
    const { error: deleteError } = await supabase
      .from("quote_item")
      .delete()
      .eq("quote_id", id)
      .not("id", "in", idList)

    if (deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
  } else {
    // 🧽 Delete all if none remain in UI
    const { error: deleteAllError } = await supabase
      .from("quote_item")
      .delete()
      .eq("quote_id", id)

    if (deleteAllError)
      return NextResponse.json({ error: deleteAllError.message }, { status: 500 })
  }

  console.log("💾 Saved services:", JSON.stringify(validServices, null, 2))
}



  return NextResponse.json({ success: true })
}
