"use client"

import { supabase } from "@/lib/supabase/client"
import { upsertQuoteDetails } from "@/lib/supabase/queries/quote-details"
import { upsertQuoteItems } from "@/lib/supabase/queries/quote-items"
import { upsertQuoteOptions } from "@/lib/supabase/queries/quote-options"

/* =========================================================
   HELPERS
========================================================= */
const isUUID = (v?: string | null) =>
  typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v || "")

function req<T>(v: T | null | undefined, msg: string): T {
  if (v === null || v === undefined || (typeof v === "string" && v.trim() === "")) {
    throw new Error(msg)
  }
  return v as T
}

/* =========================================================
   CREATE
========================================================= */
export async function createQuote(tenantId?: string) {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  const user = userData?.user
  if (!user) throw new Error("User not authenticated")

  const tenant_id = tenantId || process.env.NEXT_PUBLIC_TENANT_ID
  if (!tenant_id) throw new Error("Missing tenant_id (argument or env var)")

  const validUntil = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from("quote")
    .insert([
      {
        tenant_id,
        created_by_user_id: user.id,
        contact_name: "Pending Contact",
        contact_email: "pending@example.com",
        valid_until: validUntil,
        title: "New Quote",
        status: "draft",
        magic_link_slug: crypto.randomUUID(),
        currency: "USD",
        trip_type: "one-way",
      },
    ])
    .select()
    .single()

  if (error) {
    console.error("❌ Error creating new quote:", error)
    throw error
  }

  return { ...data, legs: [] }
}

/* =========================================================
   READ (GET SINGLE)
========================================================= */
export async function getQuoteById(id: string) {
  if (!id) throw new Error("Missing quote id")

  const { data: quote, error: quoteError } = await supabase
    .from("quote")
    .select("*")
    .eq("id", id)
    .single()
  if (quoteError) throw quoteError

  const [{ data: legs }, { data: servicesDb }, { data: options }] = await Promise.all([
    supabase.from("quote_detail").select("*").eq("quote_id", id).order("seq", { ascending: true }),
    supabase.from("quote_item").select("*").eq("quote_id", id).order("created_at", { ascending: true }),
    supabase.from("quote_option").select("*").eq("quote_id", id).order("label", { ascending: true }),
  ])

  // 🔁 Normalize services for UI (amount alias)
  const services = (servicesDb || []).map((s: any) => ({
    ...s,
    amount: s.amount ?? s.unit_price ?? 0,
    qty: s.qty ?? 1,
    taxable: s.taxable ?? true,
  }))

  return {
    ...quote,
    legs: legs || [],
    services,
    options: options || [],
  }
}

/* =========================================================
   UPDATE (BASIC FIELDS)
========================================================= */
export async function updateQuote(id: string, updates: any) {
  if (!id) throw new Error("Missing quote ID")

  const allowedKeys = [
    "tenant_id",
    "contact_id",
    "contact_name",
    "contact_email",
    "contact_company",
    "contact_phone",
    "valid_until",
    "title",
    "status",
    "magic_link_slug",
    "currency",
    "notes",
    "trip_type",
    "trip_summary",
    "total_pax",
    "special_notes",
    "leg_count",
    "earliest_departure",
  ]

  const safeUpdates: Record<string, any> = {}
  for (const key of allowedKeys) if (key in updates) safeUpdates[key] = updates[key]

  const { error } = await supabase.from("quote").update(safeUpdates).eq("id", id)
  if (error) throw error
}

/* =========================================================
   UPSERT RELATED DATA (details, items, options)
   Returns updated quote with nested data
========================================================= */
export async function saveQuoteAll(quote: any) {
console.log("💾 saveQuoteAll triggered", { quoteId: quote?.id, legs: quote?.legs?.length, tripType: quote?.trip_type })

  if (!quote?.id) throw new Error("Missing quote id in saveQuoteAll()")

// 🧹 Normalize legs for Supabase
const legsForSave = (quote.legs || []).map((l: any) => ({
  id: l.id || crypto.randomUUID(),
  origin:
    typeof l.origin === "object"
      ? l.origin.airport || l.origin.name || null
      : l.origin ?? null,
  origin_code:
    typeof l.origin === "object"
      ? l.origin.airport_code || l.origin.code || l.origin.iata || null
      : l.origin_code ?? null,
  destination:
    typeof l.destination === "object"
      ? l.destination.airport || l.destination.name || null
      : l.destination ?? null,
  destination_code:
    typeof l.destination === "object"
      ? l.destination.airport_code || l.destination.code || l.destination.iata || null
      : l.destination_code ?? null,
  departureDate: l.departureDate ?? l.depart_dt ?? null,
  departureTime: l.departureTime ?? l.depart_time ?? null,
  passengers: typeof l.passengers === "number" ? l.passengers : l.pax_count ?? null,
}))


  // 🔁 Normalize services before saving
  const servicesForSave = (quote.services || []).map((s: any) => ({
    ...s,
    amount: Number(s.amount ?? s.unit_price ?? 0),
    qty: s.qty ?? 1,
    taxable: s.taxable ?? true,
  }))

  await Promise.all([
    updateQuote(quote.id, {
      contact_name: quote.contact_name,
      contact_email: quote.contact_email,
      contact_company: quote.contact_company,
      contact_phone: quote.contact_phone,
      title: quote.title,
      notes: quote.notes,
      valid_until: quote.valid_until,
      status: quote.status,
      trip_type: quote.trip_type,
      trip_summary: quote.trip_summary,
      total_pax: quote.total_pax,
      special_notes: quote.special_notes,
    }),
    upsertQuoteDetails(quote.id, legsForSave, quote.trip_type),
    upsertQuoteItems(quote.id, servicesForSave),
    upsertQuoteOptions(quote.id, quote.options || []),
  ])

  // 🧾 Fetch latest state from DB
  const { data: refreshedQuote, error: quoteError } = await supabase
    .from("quote")
    .select("*")
    .eq("id", quote.id)
    .single()
  if (quoteError) throw quoteError

  const [{ data: legs }, { data: servicesDb }, { data: options }] = await Promise.all([
    supabase.from("quote_detail").select("*").eq("quote_id", quote.id).order("seq", { ascending: true }),
    supabase.from("quote_item").select("*").eq("quote_id", quote.id).order("created_at", { ascending: true }),
    supabase.from("quote_option").select("*").eq("quote_id", quote.id).order("label", { ascending: true }),
  ])

  // Normalize again for UI
  const services = (servicesDb || []).map((s: any) => ({
    ...s,
    amount: s.amount ?? s.unit_price ?? 0,
    qty: s.qty ?? 1,
    taxable: s.taxable ?? true,
  }))

  return {
    ...refreshedQuote,
    legs: (legs || []).map((l) => ({
      ...l,
      departureDate: l.depart_dt,
      departureTime: l.depart_time,
      passengers: l.pax_count,
    })),
    services,
    options: options || [],
  }
}


/* =========================================================
   DELETE
========================================================= */
export async function deleteQuote(id: string) {
  if (!id) throw new Error("Missing quote ID")

  await Promise.all([
    supabase.from("quote_detail").delete().eq("quote_id", id),
    supabase.from("quote_item").delete().eq("quote_id", id),
    supabase.from("quote_option").delete().eq("quote_id", id),
  ])

  const { error } = await supabase.from("quote").delete().eq("id", id)
  if (error) throw error
}
