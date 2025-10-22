import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = params
  const body = await req.json()
  const { quote, options } = body

// 🧱 Update main quote
if (quote) {
  const { error: quoteError } = await supabase
    .from("quote")
    .update({
      contact_id: quote.contact_id,
      quote_id: quote.quote_id,
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


  // Upsert quote options
const { error: optionError } = await supabase
  .from("quote_option")
  .upsert(
    options.map((o: any, index: number) => ({
      id: o.id,
      label: o.label || `Option ${index + 1}`,
      quote_id: o.quote_id, // ✅ this will now always be correct
      aircraft_id: o.aircraft_id,
      flight_hours: o.flight_hours ?? 0,
      cost_operator: o.cost_operator ?? 0,
      price_commission: o.price_commission ?? 0,
      price_base: o.price_base ?? 0,
      price_total: o.price_total ?? 0,
      notes: o.notes ?? null,
      updated_at: new Date().toISOString(),
    }))
  );

  if (optionError)
    return NextResponse.json({ error: optionError.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
