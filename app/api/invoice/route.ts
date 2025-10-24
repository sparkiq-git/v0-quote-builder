// app/api/invoice/route.ts
import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"

export async function GET() {
  try {
    // Retrieve all invoices (you can later add filters, pagination, tenant auth, etc.)
    const { data, error } = await supabase
      .from("invoice")
      .select(`
        id,
        number,
        issued_at,
        due_at,
        amount,
        currency,
        status,
        contact_name:quote(contact_name),
        aircraft_label
      `)
      .order("issued_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ invoices: data })
  } catch (err: any) {
    console.error("❌ Failed to fetch invoices:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { quote_id } = await req.json()
    if (!quote_id) return NextResponse.json({ error: "Missing quote_id" }, { status: 400 })

    // 🔁 Call your Supabase Edge Function
const { data, error } = await supabase.functions.invoke("quote-to-invoice", {
  body: { quote_id },
})

console.log("🧾 quote-to-invoice response:", { data, error })

if (error) {
  console.error("❌ Edge Function error:", error)
  throw error
}

if (data?.error) {
  console.error("❌ Edge Function internal error:", data.error)
  throw new Error(data.error)
}

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("❌ Invoice creation error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
