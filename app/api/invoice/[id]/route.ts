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

    if (!tenantId) {
      return NextResponse.json({ error: "Missing tenant ID" }, { status: 400 })
    }

    console.log(`🔍 Fetching invoice ${id} for tenant ${tenantId}`)

    // First, try without tenant filter to see if invoice exists at all
    const { data: invoiceCheck, error: checkError } = await supabase
      .from("invoice")
      .select("id, tenant_id")
      .eq("id", id)
      .maybeSingle()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error("❌ Error checking invoice:", checkError)
      return NextResponse.json({ error: checkError.message || "Failed to check invoice" }, { status: 500 })
    }

    // If invoice doesn't exist at all
    if (!invoiceCheck) {
      console.log(`❌ Invoice ${id} does not exist`)
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    // If invoice exists but for different tenant
    if (invoiceCheck.tenant_id !== tenantId) {
      console.log(`❌ Invoice ${id} belongs to tenant ${invoiceCheck.tenant_id}, but requested by ${tenantId}`)
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    // Now fetch the full invoice data
    const { data: invoiceData, error: invoiceError } = await supabase
      .from("invoice")
      .select(`
        id,
        tenant_id,
        quote_id,
        selected_option_id,
        number,
        issued_at,
        due_at,
        amount,
        currency,
        status,
        external_payment_url,
        summary_itinerary,
        aircraft_label,
        breakdown_json,
        notes,
        created_at,
        updated_at,
        subtotal,
        tax_total
      `)
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .single()

    if (invoiceError) {
      if (invoiceError.code === 'PGRST116' || invoiceError.code === 'PGRST200') {
        console.log(`❌ Invoice ${id} not found for tenant ${tenantId} (single() returned no rows)`)
        return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
      }
      console.error("❌ Invoice fetch error:", invoiceError)
      return NextResponse.json({ error: invoiceError.message || "Failed to fetch invoice" }, { status: 500 })
    }

    if (!invoiceData) {
      console.log(`❌ Invoice ${id} data is null`)
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    console.log(`✅ Invoice ${id} found, fetching related data...`)

    // Fetch related quote data separately
    let quoteData = null
    if (invoiceData.quote_id) {
      const { data: quote, error: quoteError } = await supabase
        .from("quote")
        .select("id, title, contact_name, contact_email, contact_company")
        .eq("id", invoiceData.quote_id)
        .single()
      
      if (!quoteError && quote) {
        quoteData = quote
      } else if (quoteError) {
        console.warn("⚠️ Error fetching quote:", quoteError)
      }
    }

    // Fetch related selected_option data separately
    let selectedOptionData = null
    if (invoiceData.selected_option_id) {
      const { data: option, error: optionError } = await supabase
        .from("quote_option")
        .select("id, aircraft_id, cost_operator, price_base, price_total, notes")
        .eq("id", invoiceData.selected_option_id)
        .single()
      
      if (!optionError && option) {
        selectedOptionData = option
      } else if (optionError) {
        console.warn("⚠️ Error fetching selected option:", optionError)
      }
    }

    // Fetch invoice detail line items
    const { data: detailItems, error: detailError } = await supabase
      .from("invoice_detail")
      .select(`
        id,
        invoice_id,
        seq,
        label,
        description,
        qty,
        unit_price,
        amount,
        type,
        taxable,
        tax_rate,
        tax_amount,
        created_at,
        updated_at
      `)
      .eq("invoice_id", id)
      .order("seq", { ascending: true })

    // Log warning if details failed but don't fail the whole request
    if (detailError) {
      console.warn("⚠️ Error fetching invoice details:", detailError)
    }

    // Combine invoice and related data
    const invoice = {
      ...invoiceData,
      quote: quoteData,
      selected_option: selectedOptionData,
      details: detailItems || [],
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
