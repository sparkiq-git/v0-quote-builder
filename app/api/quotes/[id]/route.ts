import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

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
  const supabase = await createClient()
  const { id } = params

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

    // Transform the data to match the expected format
    const transformedQuote = {
      ...quote,
      legs: legs || [],
      options: options || [],
      services: services || [],
    }

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
