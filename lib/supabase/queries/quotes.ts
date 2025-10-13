import { createClient } from "@supabase/supabase-js"

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/* =========================================================
   CREATE
========================================================= */
export async function createQuote(tenantId: string) {
  const validUntil = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from("quote")
    .insert([
      {
        tenant_id: tenantId,
        contact_name: "Pending Contact",
        contact_email: "pending@example.com",
        contact_company: null,
        contact_phone: null,
        valid_until: validUntil,
        title: "New Quote",
        status: "draft",
        magic_link_slug: crypto.randomUUID(),
        currency: "USD",
      },
    ])
    .select()
    .single()

  if (error) throw error
  return data
}

/* =========================================================
   UPDATE
========================================================= */
export async function updateQuote(id: string, updates: any) {
  const { error } = await supabase.from("quote").update(updates).eq("id", id)
  if (error) throw error
}

/* =========================================================
   DELETE
========================================================= */
export async function deleteQuote(id: string) {
  const { error } = await supabase.from("quote").delete().eq("id", id)
  if (error) throw error
}

/* =========================================================
   QUOTE DETAILS (legs)
========================================================= */
export async function upsertQuoteDetails(quoteId: string, legs: any[]) {
  if (!quoteId) throw new Error("Missing quoteId")

  const normalize = (v: any) => {
    if (v === undefined || v === null) return null
    if (typeof v === "string" && v.trim() === "") return null
    return v
  }

  const validLegs = legs
    .map((l, i) => ({
      quote_id: quoteId,
      seq: i + 1,
      origin: normalize(l.origin),
      origin_code: normalize(l.origin_code),
      destination: normalize(l.destination),
      destination_code: normalize(l.destination_code),
      depart_dt: normalize(l.departureDate),
      arrive_dt: normalize(l.arrivalDate),
      pax_count: l.passengers ?? null,
      notes: normalize(l.notes),
    }))
    .filter(
      (l) =>
        (l.origin || l.origin_code) &&
        (l.destination || l.destination_code)
    )

  if (validLegs.length === 0) {
    console.warn("⚠️ No valid legs found — clearing quote_detail for quote:", quoteId)
    await supabase.from("quote_detail").delete().eq("quote_id", quoteId)
    await supabase.from("quote").update({ trip_summary: null }).eq("id", quoteId)
    return
  }

  const { error: upsertError } = await supabase
    .from("quote_detail")
    .upsert(validLegs, { onConflict: "quote_id,seq" })

  if (upsertError) {
    console.error("❌ Error upserting quote details:", upsertError)
    console.table(validLegs)
    throw upsertError
  }

  // Compute trip summary (e.g. MIA → OPF → TEB)
  const chain: string[] = []
  for (const leg of validLegs) {
    const origin = leg.origin_code || leg.origin
    const destination = leg.destination_code || leg.destination
    if (chain.length === 0) {
      if (origin) chain.push(origin)
      if (destination) chain.push(destination)
    } else {
      const last = chain[chain.length - 1]
      if (last === origin) {
        if (destination) chain.push(destination)
      } else {
        if (origin) chain.push(origin)
        if (destination) chain.push(destination)
      }
    }
  }

  const tripSummary = chain.join(" → ")

  const { error: updateError } = await supabase
    .from("quote")
    .update({ trip_summary: tripSummary })
    .eq("id", quoteId)

  if (updateError) throw updateError

  console.log(`✅ Quote ${quoteId} trip summary: ${tripSummary}`)
}
