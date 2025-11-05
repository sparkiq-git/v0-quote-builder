import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Force dynamic rendering for this route since it requires authentication
export const dynamic = 'force-dynamic'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  
  try {
    const { id } = params

    // Get user and tenant for security
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { send_to_customer = true, send_to_tenant = true, include_pdf = true } = await req.json()

    // Fetch invoice to get tenant_id
    const { data: invoice, error: fetchError } = await supabase
      .from("invoice")
      .select("tenant_id")
      .eq("id", id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
      }
      throw fetchError
    }

    if (!invoice?.tenant_id) {
      return NextResponse.json({ error: "Invoice tenant not found" }, { status: 400 })
    }

    // Call the edge function to send email with PDF attachment
    const { data: emailResult, error: emailError } = await supabase.functions.invoke("send-invoice-email", {
      body: {
        invoice_id: id,
        tenant_id: invoice.tenant_id,
        send_to_customer,
        send_to_tenant,
        include_pdf,
      },
    })

    if (emailError) {
      console.error("❌ Failed to send invoice email:", emailError)
      return NextResponse.json({ 
        error: "Failed to send invoice email",
        details: emailError.message 
      }, { status: 500 })
    }

    console.log("✅ Invoice email resent successfully", {
      invoice_id: id,
      send_to_customer,
      send_to_tenant,
      include_pdf,
    })

    return NextResponse.json({ 
      success: true,
      data: emailResult 
    })
  } catch (err: any) {
    console.error("❌ Invoice resend error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
