"use client"

import { supabase } from "@/lib/supabase/client"

// 🌍 distance in nautical miles (1 NM ≈ 1852 m)
function haversineDistanceNM(lat1: number, lon1: number, lat2: number, lon2: number): number | null {
  const anyMissing =
    lat1 == null || lon1 == null || lat2 == null || lon2 == null ||
    [lat1, lon1, lat2, lon2].some((v) => Number.isNaN(Number(v)))
  if (anyMissing) return null

  const toRad = (deg: number) => (deg * Math.PI) / 180
  const R = 3440.065 // Earth radius in nautical miles
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return +(R * c)
}

export async function upsertQuoteDetails(quoteId: string, legs: any[] = [], tripType?: string) {
  if (!quoteId) throw new Error("Missing quoteId")

console.log("🛫 upsertQuoteDetails called", { quoteId, legCount: legs?.length, tripType, legs })


  const normalize = (v: any) => {
    if (v === undefined || v === null) return null
    if (typeof v === "string" && v.trim() === "") return null
    return v
  }

const normalizeAirport = (airport: any) => {
  // Handle missing
  if (!airport) return { name: null, code: null }

  // If user passed a plain string (e.g. "Miami International Airport")
  if (typeof airport === "string") {
    return { name: airport, code: null } // just keep name, no code
  }

  // If user passed an object from AirportCombobox or DB
  return {
    name: airport.airport || airport.name || airport.label || null,
    code: airport.airport_code || airport.iata || airport.code || null,
  }
}


  const toDate = (d?: string | null, t?: string | null) => {
    if (!d) return null
    try {
      const iso = `${d}${t ? `T${t}` : "T00:00"}:00`
      const dt = new Date(iso)
      return isNaN(dt.getTime()) ? null : dt
    } catch {
      return null
    }
  }

  // 🧹 Clear quote_detail if no legs
  if (!legs || legs.length === 0) {
    await supabase.from("quote_detail").delete().eq("quote_id", quoteId)
    await supabase
      .from("quote")
      .update({
        trip_type: "one-way",
        trip_summary: null,
        leg_count: 0,
        total_pax: null,
        earliest_departure: null,
        latest_return: null,
      })
      .eq("id", quoteId)
    return []
  }

// ✈️ Normalize incoming legs
const validLegs = (legs || [])
  .filter((l) => l && l.origin && l.destination) // ignore empty legs
  .map((l, i) => {
    const origin = normalizeAirport(l.origin)
    const destination = normalizeAirport(l.destination)

    // pull coords from UI payload (they’re set in QuoteLegsTab onSelect)
    const origin_lat = l.origin_lat ?? null
    const origin_long = l.origin_long ?? null
    const destination_lat = l.destination_lat ?? null
    const destination_long = l.destination_long ?? null

    // compute distance if all coords present
    const distance_nm =
      origin_lat != null &&
      origin_long != null &&
      destination_lat != null &&
      destination_long != null
        ? haversineDistanceNM(
            Number(origin_lat),
            Number(origin_long),
            Number(destination_lat),
            Number(destination_long),
          )
        : null

    return {
      quote_id: quoteId,
      seq: i + 1,

      origin: origin.name || l.origin,
      origin_code: origin.code || l.origin_code,
      destination: destination.name || l.destination,
      destination_code: destination.code || l.destination_code,

      depart_dt: normalize(l.departureDate || l.depart_dt),
      depart_time: normalize(l.departureTime || l.depart_time),
      pax_count: l.passengers ?? l.pax_count ?? null,

      // NEW: geo + distance
      origin_lat,
      origin_long,
      destination_lat,
      destination_long,
      distance_nm,

      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  })
  .filter((l) => l.origin_code && l.destination_code)




  // (Safety) if old round-trip sent as a single leg
  if (tripType === "round-trip" && validLegs.length === 1) {
    const base = validLegs[0]
    validLegs.push({
      quote_id: quoteId,
      seq: 2,
      origin: base.destination,
      origin_code: base.destination_code,
      destination: base.origin,
      destination_code: base.origin_code,
      depart_dt: null,
      depart_time: null,
      pax_count: base.pax_count ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  }

  if (validLegs.length === 0) return []

  // 🚀 Replace (delete → insert)
  await supabase.from("quote_detail").delete().eq("quote_id", quoteId)
  const { error: insertError } = await supabase.from("quote_detail").insert(validLegs)
  if (insertError) throw insertError

  // 🔗 Compute trip summary chain
  const chain: string[] = []
  for (const leg of validLegs) {
    const origin = leg.origin_code || leg.origin
    const destination = leg.destination_code || leg.destination
    if (chain.length === 0) {
      if (origin) chain.push(origin)
      if (destination) chain.push(destination)
    } else {
      const last = chain.at(-1)
      if (last === origin && destination) chain.push(destination)
      else {
        if (origin) chain.push(origin)
        if (destination) chain.push(destination)
      }
    }
  }

  const tripSummary = chain.join(" → ")
  const legCount = validLegs.length
  const totalPax = Math.max(...validLegs.map((l) => Number(l.pax_count || 0))) || null

  // 🕓 Find earliest_departure & latest_return (consider date+time)
  const depDates = validLegs
    .map((l) => toDate(l.depart_dt as any, l.depart_time as any))
    .filter(Boolean) as Date[]

  const earliestDeparture = depDates.length ? new Date(Math.min(...depDates.map((d) => d.getTime()))).toISOString() : null
  const latestReturn = depDates.length ? new Date(Math.max(...depDates.map((d) => d.getTime()))).toISOString() : null

  // 🧠 Determine trip type
  const inferredTripType =
    tripType ||
    (legCount === 1
      ? "one-way"
      : legCount === 2 &&
        validLegs[0]?.origin_code === validLegs[1]?.destination_code &&
        validLegs[0]?.destination_code === validLegs[1]?.origin_code
      ? "round-trip"
      : "multi-city")

  // 🧾 Update quote summary/meta
  const { error: updateError } = await supabase
    .from("quote")
    .update({
      trip_type: inferredTripType,
      trip_summary: tripSummary,
      leg_count: legCount,
      total_pax: totalPax,
      earliest_departure: earliestDeparture,
      latest_return: latestReturn,
      updated_at: new Date().toISOString(),
    })
    .eq("id", quoteId)
  if (updateError) throw updateError

  // Return shape that editors expect
  return {
    validLegs: validLegs.map((l) => ({
      ...l,
      departureDate: l.depart_dt,
      departureTime: l.depart_time,
    })),
    tripSummary,
    legCount,
    earliestDeparture,
    latestReturn,
  }
}
