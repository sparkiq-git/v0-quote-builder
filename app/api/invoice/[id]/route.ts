// app/api/invoice/[id]/route.ts
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Force dynamic rendering for this route since it requires authentication
export const dynamic = 'force-dynamic'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  try {
    const { id } = params

    // Get user and tenant for security
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const tenantId = user.app_metadata?.tenant_id || process.env.NEXT_PUBLIC_TENANT_ID

    // Fetch invoice with all related data
    const { data: invoiceData, error: invoiceError } = await supabase
      .from("invoice")
      .select(`
        id,
        number,
        status,
        issued_at,
        due_at,
        amount,
        currency,
        subtotal,
        tax_total,
        aircraft_label,
        summary_itinerary,
        external_payment_url,
        notes,
        breakdown_json,
        created_at,
        updated_at,
        quote:quote_id(
          id,
          title,
          contact_name,
          contact_email,
          contact_company
        ),
        selected_option:selected_option_id(
          id,
          aircraft_id,
          flight_hours,
          cost_operator,
          price_commission,
          price_base,
          price_total,
          notes,
          conditions
        )
      `)
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .single()

    if (invoiceError) {
      if (invoiceError.code === 'PGRST116') {
        return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
      }
      throw invoiceError
    }

    if (!invoiceData) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    // Fetch invoice detail line items
    const { data: detailItems, error: detailError } = await supabase
      .from("invoice_detail")
      .select("*")
      .eq("invoice_id", id)
      .order("seq", { ascending: true })

    // Combine invoice and details
    const invoice = {
      ...invoiceData,
      details: detailItems || [],
    }

    // Log warning if details failed but don't fail the whole request
    if (detailError) {
      console.warn("⚠️ Error fetching invoice details:", detailError)
    }

    return NextResponse.json({ invoice })
  } catch (err: any) {
    console.error("❌ Invoice fetch error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  
  try {
    const { id } = params

    // Get user and tenant for security
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const tenantId = user.app_metadata?.tenant_id || process.env.NEXT_PUBLIC_TENANT_ID

    const updates = await req.json()
    const { error } = await supabase
      .from("invoice")
      .update(updates)
      .eq("id", id)
      .eq("tenant_id", tenantId) // Ensure tenant scoping

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("❌ Invoice update error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  
  try {
    const { id } = params

    // Get user and tenant for security
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const tenantId = user.app_metadata?.tenant_id || process.env.NEXT_PUBLIC_TENANT_ID

    const { error } = await supabase
      .from("invoice")
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenantId) // Ensure tenant scoping

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("❌ Invoice delete error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
