// app/api/invoice/route.ts
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Force dynamic rendering for this route since it requires authentication
export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
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
  const supabase = await createClient()
  
  try {
    const { quote_id, external_payment_url } = await req.json()
    if (!quote_id) return NextResponse.json({ error: "Missing quote_id" }, { status: 400 })

    // 🔁 Call your Supabase Edge Function
    // external_payment_url is optional
    const body: { quote_id: string; external_payment_url?: string | null } = { quote_id }
    if (external_payment_url) {
      body.external_payment_url = external_payment_url
    }

    const { data, error } = await supabase.functions.invoke("quote-to-invoice", {
      body,
    })

    console.log("🧾 quote-to-invoice response:", { data, error })

    if (error) {
      console.error("❌ Edge Function error:", error)
      
      // Try to extract the error message from the error object
      const errorMessage = error.message || error.toString() || "Edge Function returned an error"
      
      // Check if the error contains database constraint information
      if (errorMessage.includes("null value in column") || errorMessage.includes("violates not-null constraint")) {
        return NextResponse.json({ 
          error: "Failed to create invoice: Missing required fields. Please ensure the quote has all necessary data.",
          details: errorMessage
        }, { status: 400 })
      }
      
      return NextResponse.json({ 
        error: errorMessage,
        details: error
      }, { status: 400 })
    }

    if (data?.error) {
      console.error("❌ Edge Function internal error:", data.error)
      
      // Check if the error contains database constraint information
      const errorMsg = typeof data.error === 'string' ? data.error : data.error?.message || JSON.stringify(data.error)
      if (errorMsg.includes("null value in column") || errorMsg.includes("violates not-null constraint")) {
        return NextResponse.json({ 
          error: "Failed to create invoice: Missing required fields. The quote-to-invoice function requires all invoice detail records to have a 'label' field.",
          details: errorMsg
        }, { status: 400 })
      }
      
      return NextResponse.json({ 
        error: errorMsg,
        details: data.error
      }, { status: 400 })
    }

    if (!data?.invoice) {
      return NextResponse.json({ 
        error: "Invoice creation failed: No invoice data returned from Edge Function" 
      }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("❌ Invoice creation error:", err)
    
    // Extract more detailed error information
    const errorMessage = err.message || err.toString() || "Failed to create invoice"
    
    return NextResponse.json({ 
      error: errorMessage,
      details: err
    }, { status: 500 })
  }
}
