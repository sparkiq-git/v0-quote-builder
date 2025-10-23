import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createActionLinkClient } from "@/lib/supabase/action-links"

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

    // Fetch aircraft models and tails for the options
    const aircraftModelIds = (options || []).map(opt => opt.aircraft_id).filter(Boolean)
    const aircraftTailIds = (options || []).map(opt => opt.aircraft_tail_id).filter(Boolean)
    
    let aircraftModels = []
    let aircraftTails = []
    
    if (aircraftModelIds.length > 0) {
      const { data: models, error: modelsError } = await supabase
        .from("aircraft_model")
        .select("*")
        .in("id", aircraftModelIds)
      
      if (modelsError) {
        console.error("Aircraft models fetch error:", modelsError)
      } else {
        aircraftModels = models || []
      }
    }
    
    if (aircraftTailIds.length > 0) {
      const { data: tails, error: tailsError } = await supabase
        .from("aircraft")
        .select("*")
        .in("id", aircraftTailIds)
      
      if (tailsError) {
        console.error("Aircraft tails fetch error:", tailsError)
      } else {
        aircraftTails = tails || []
      }
    }

    // Debug logging
    console.log("Raw quote data:", JSON.stringify(quote, null, 2))
    console.log("Raw legs data:", JSON.stringify(legs, null, 2))
    console.log("Raw options data:", JSON.stringify(options, null, 2))
    console.log("Raw services data:", JSON.stringify(services, null, 2))
    console.log("Aircraft models data:", JSON.stringify(aircraftModels, null, 2))
    console.log("Aircraft tails data:", JSON.stringify(aircraftTails, null, 2))

    // Transform the data to match the expected format
    const transformedQuote = {
      ...quote,
      // Transform legs from quote_detail to expected format
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
      // Transform options from quote_option to expected format
      options: (options || []).map((option: any) => {
        const aircraftModel = aircraftModels.find(m => m.id === option.aircraft_id)
        const aircraftTail = aircraftTails.find(t => t.id === option.aircraft_tail_id)
        
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
          selectedAmenities: [], // TODO: Add amenities support if needed
          notes: option.notes,
          conditions: option.conditions,
          additionalNotes: option.additional_notes,
          // Include aircraft model data for the component
          aircraftModel: aircraftModel ? {
            id: aircraftModel.id,
            name: aircraftModel.name,
            manufacturer: aircraftModel.manufacturer_id,
            defaultCapacity: aircraftModel.size_code ? parseInt(aircraftModel.size_code) : 8,
            defaultRangeNm: 2000, // Default range
            defaultSpeedKnots: 400, // Default speed
            images: aircraftModel.images || [],
          } : null,
          // Include aircraft tail data for the component
          aircraftTail: aircraftTail ? {
            id: aircraftTail.id,
            tailNumber: aircraftTail.tail_number,
            operator: aircraftTail.operator_id,
            year: aircraftTail.year_of_manufacture,
            amenities: aircraftTail.notes || '',
            images: [], // TODO: Add tail images support
            capacityOverride: aircraftTail.capacity_pax,
            rangeNmOverride: aircraftTail.range_nm,
            speedKnotsOverride: null,
          } : null,
        }
      }),
      // Transform services from quote_item to expected format
      services: (services || []).map((service: any) => ({
        id: service.id,
        name: service.name,
        description: service.description,
        amount: service.unit_price || 0,
        qty: service.qty || 1,
        taxable: service.taxable,
        notes: service.notes,
      })),
      // Ensure customer object exists
      customer: quote.customer || {
        id: quote.contact_id || 'unknown',
        name: quote.contact_name || 'Unknown Customer',
        email: quote.contact_email || '',
        phone: quote.contact_phone || '',
        company: quote.contact_company || '',
      },
      // Ensure branding exists
      branding: quote.branding || {
        primaryColor: '#2563eb',
      },
    }

    console.log("Transformed quote data:", JSON.stringify(transformedQuote, null, 2))
    return NextResponse.json(transformedQuote)
  } catch (error) {
    console.error("Unexpected error fetching quote:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/* ---------------- PATCH handler ---------------- */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
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
