"use client"

import { supabase } from "@/lib/supabase/client"

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
   UPDATE (PATCH)
========================================================= */
export async function saveQuoteAll(quote: any) {
  if (!quote?.id) throw new Error("Missing quote id in saveQuoteAll()")

  // 🛰️ Log for debug
  console.log("💾 saveQuoteAll → PATCH route", {
    quoteId: quote.id,
    legs: quote.legs?.length || 0,
    options: quote.options?.length || 0,
  })

  const payload = {
    quote: {
      contact_id: quote.contact_id,
      contact_name: quote.contact_name,
      contact_email: quote.contact_email,
      contact_phone: quote.contact_phone,
      contact_company: quote.contact_company,
      valid_until: quote.valid_until,
      notes: quote.notes,
      title: quote.title,
      status: quote.status,
      trip_type: quote.trip_type,
      trip_summary: quote.trip_summary,
      total_pax: quote.total_pax,
      special_notes: quote.special_notes,
    },
    legs: quote.legs || [],
    options: quote.options || [],
  }

  const res = await fetch(`/api/quotes/${quote.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  const json = await res.json()
  if (!res.ok) throw new Error(json.error || "Failed to save quote")

  // Refresh from DB
  return await getQuoteById(quote.id)
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
