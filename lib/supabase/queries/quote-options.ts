"use client"

import { supabase } from "@/lib/supabase/client"

/* =========================================================
   Utilities
========================================================= */
function isUUID(v?: string | null) {
  return (
    typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
  )
}

/* =========================================================
   QUOTE OPTIONS (aircraft options)
========================================================= */
export async function upsertQuoteOptions(quoteId: string, options: any[]) {
  if (!quoteId) throw new Error("Missing quoteId")

  // ✅ Normalize + sequentially label options
  const validOptions = (options || [])
    .filter((o) => {
      const aircraftId = o.aircraftModelId || o.aircraft_id
      // Filter out empty strings and falsy values, only keep valid UUIDs
      return aircraftId && typeof aircraftId === 'string' && aircraftId.trim() !== '' && isUUID(aircraftId)
    })
    .map((o, idx) => ({
      id: isUUID(o.id) ? o.id : crypto.randomUUID(),
      quote_id: quoteId,
      aircraft_id: o.aircraftModelId || o.aircraft_id,
      label: `Option ${idx + 1}`,
      cost_operator: o.operatorCost ?? null,
      price_base: o.operatorCost ?? 0,
      price_extras_total: o.feesEnabled
        ? (o.fees || []).reduce((sum: number, f: any) => sum + (f.amount || 0), 0)
        : 0,
      price_discounts_total: 0,
      price_fet: 0,
      price_taxes: 0,
      price_total:
        (o.operatorCost ?? 0) +
        (o.commission ?? 0) +
        (o.feesEnabled
          ? (o.fees || []).reduce((sum: number, f: any) => sum + (f.amount || 0), 0)
          : 0),
      notes: o.notes || null,
      updated_at: new Date().toISOString(),
    }))

  // ✅ Step 1: Upsert or insert all current options
  if (validOptions.length > 0) {
    const { error: upsertError } = await supabase
      .from("quote_option")
      .upsert(validOptions, { onConflict: "id" })

    if (upsertError) {
      console.error("❌ Error upserting quote options:", upsertError)
      throw upsertError
    }
  }

  // ✅ Step 2: Clean up deleted options
  const { data: existing, error: existingError } = await supabase
    .from("quote_option")
    .select("id")
    .eq("quote_id", quoteId)

  if (existingError) throw existingError

  const keepIds = new Set(validOptions.map((o) => o.id))
  const idsToDelete = (existing || [])
    .map((r) => r.id as string)
    .filter((id) => !keepIds.has(id))

  if (idsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from("quote_option")
      .delete()
      .in("id", idsToDelete)

    if (deleteError) {
      console.warn("⚠️ Error deleting old quote options:", deleteError)
    }
  }

  // ✅ Step 3: Ensure sequential labels
  const renumbered = validOptions.map((o, i) => ({
    id: o.id,
    label: `Option ${i + 1}`,
  }))

  const { error: relabelError } = await supabase
    .from("quote_option")
    .upsert(renumbered, { onConflict: "id" })

  if (relabelError) {
    console.warn("⚠️ Error renumbering quote option labels:", relabelError)
  }

  return validOptions
}

/* =========================================================
   DELETE SINGLE OPTION
========================================================= */
export async function deleteQuoteOption(optionId: string) {
  if (!isUUID(optionId)) return
  const { error } = await supabase.from("quote_option").delete().eq("id", optionId)
  if (error) throw error
}
