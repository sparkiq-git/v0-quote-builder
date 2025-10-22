"use client"

import { supabase } from "@/lib/supabase/client"

/* =========================================================
   QUOTE ITEMS (services)
========================================================= */
export async function upsertQuoteItems(quoteId: string, services: any[]) {
  if (!quoteId) throw new Error("Missing quoteId")

  // 🔁 Normalize & prepare data (accept either "amount" or "unit_price")
  const validItems = (services || [])
    .filter((s) => s.name || s.description)
    .map((s) => ({
      id: s.id || crypto.randomUUID(),
      quote_id: quoteId,
      item_id: s.item_id ?? null,
      name: s.name ?? "",
      description: s.description ?? "",
      qty: s.qty ?? 1,
      // ✅ Allow both amount and unit_price
      unit_price: Number(s.amount ?? s.unit_price ?? 0),
      unit_cost: s.unit_cost ?? null,
      taxable: s.taxable ?? true,
      notes: s.notes ?? null,
      updated_at: new Date().toISOString(),
    }))

  // ✅ Step 1: Upsert by id
  const { error: upsertError } = await supabase
    .from("quote_item")
    .upsert(validItems, { onConflict: "id" })
    .select()

  if (upsertError) {
    console.error("❌ Error upserting quote items:", upsertError)
    throw upsertError
  }

  // ✅ Step 2: Clean up deleted items safely
  const idsToKeep = validItems.map((i) => i.id).filter(Boolean)

  if (Array.isArray(idsToKeep) && idsToKeep.length > 0) {
    const { error: deleteError } = await supabase
      .from("quote_item")
      .delete()
      .eq("quote_id", quoteId)
      .not("id", "in", `(${idsToKeep.map((id) => `'${id}'`).join(",")})`)

    if (deleteError) {
      console.warn("⚠️ Error cleaning up old quote items:", deleteError)
    }
  } else {
    const { error: deleteAllError } = await supabase
      .from("quote_item")
      .delete()
      .eq("quote_id", quoteId)

    if (deleteAllError) {
      console.warn("⚠️ Error deleting all items:", deleteAllError)
    }
  }

  return validItems
}
