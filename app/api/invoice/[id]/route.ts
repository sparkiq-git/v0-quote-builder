// app/api/invoice/[id]/route.ts
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Force dynamic rendering for this route since it requires authentication
export const dynamic = 'force-dynamic'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  try {
    const { id } = params

    // Get user for authentication (RLS will handle tenant filtering)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log(`🔍 Fetching invoice ${id} (RLS will handle tenant filtering)`)

    // Fetch the invoice - RLS policies will automatically filter by tenant_id
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
      .single()

    if (invoiceError) {
      // PGRST116 = no rows found (could be RLS blocking access or invoice doesn't exist)
      // PGRST200 = multiple rows found (shouldn't happen with single() on UUID)
      if (invoiceError.code === 'PGRST116' || invoiceError.code === 'PGRST200') {
        console.log(`❌ Invoice ${id} not found (likely blocked by RLS or doesn't exist)`)
        return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
      }
      console.error("❌ Invoice fetch error:", invoiceError)
      return NextResponse.json({ error: invoiceError.message || "Failed to fetch invoice" }, { status: 500 })
    }

    if (!invoiceData) {
      console.log(`❌ Invoice ${id} data is null`)
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    console.log(`✅ Invoice ${id} found (tenant: ${invoiceData.tenant_id}), fetching related data...`)

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

    // Debug logging: Verify invoice data structure
    console.log("📊 Invoice Data Audit:", {
      invoiceId: invoiceData.id,
      invoiceAmount: invoiceData.amount,
      invoiceSubtotal: invoiceData.subtotal,
      invoiceTaxTotal: invoiceData.tax_total,
      detailItemsCount: detailItems?.length || 0,
      detailItems: detailItems?.map(item => ({
        seq: item.seq,
        label: item.label,
        type: item.type,
        amount: item.amount,
        taxable: item.taxable,
        tax_amount: item.tax_amount,
      })),
      calculatedSubtotal: detailItems?.filter(item => 
        item.type !== "tax" && 
        item.type !== "fee" && 
        !item.label?.toLowerCase().includes("tax") && 
        !item.label?.toLowerCase().includes("fee")
      ).reduce((sum, item) => sum + (Number(item.amount) || 0), 0) || 0,
      calculatedTaxTotal: detailItems?.filter(item => 
        item.type === "tax" || 
        item.type === "fee" || 
        item.label?.toLowerCase().includes("tax") || 
        item.label?.toLowerCase().includes("fee")
      ).reduce((sum, item) => sum + (Number(item.amount) || 0), 0) || 0,
    })

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

    const updates = await req.json()
    
    // Fetch invoice to get quote_id before updating
    const { data: invoice, error: fetchError } = await supabase
      .from("invoice")
      .select("quote_id")
      .eq("id", id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
      }
      throw fetchError
    }

    // RLS will handle tenant filtering automatically
    const { error: updateError } = await supabase
      .from("invoice")
      .update(updates)
      .eq("id", id)

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
      }
      throw updateError
    }

    // If status is being set to "paid", also update quote status to "paid"
    if (updates.status === "paid" && invoice?.quote_id) {
      const { error: quoteUpdateError } = await supabase
        .from("quote")
        .update({ status: "paid" })
        .eq("id", invoice.quote_id)

      if (quoteUpdateError) {
        console.warn("⚠️ Failed to update quote status to paid:", quoteUpdateError)
        // Don't fail the request if quote update fails, but log it
      } else {
        console.log(`✅ Updated quote ${invoice.quote_id} status to paid`)
      }
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

    // Fetch invoice to get quote_id before deleting
    const { data: invoice, error: fetchError } = await supabase
      .from("invoice")
      .select("quote_id")
      .eq("id", id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
      }
      throw fetchError
    }

    // Step 1: Delete invoice_detail records first (due to foreign key constraint)
    const { error: detailDeleteError } = await supabase
      .from("invoice_detail")
      .delete()
      .eq("invoice_id", id)

    if (detailDeleteError) {
      console.warn("⚠️ Error deleting invoice_detail:", detailDeleteError)
      // Continue anyway - might already be deleted
    } else {
      console.log(`✅ Deleted invoice_detail records for invoice ${id}`)
    }

    // Step 2: Delete the invoice
    const { error: invoiceDeleteError } = await supabase
      .from("invoice")
      .delete()
      .eq("id", id)

    if (invoiceDeleteError) {
      if (invoiceDeleteError.code === 'PGRST116') {
        return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
      }
      throw invoiceDeleteError
    }

    // Step 3: Update quote status to "accepted" if quote exists
    if (invoice?.quote_id) {
      const { error: quoteUpdateError } = await supabase
        .from("quote")
        .update({ status: "accepted" })
        .eq("id", invoice.quote_id)

      if (quoteUpdateError) {
        console.warn("⚠️ Failed to update quote status to accepted:", quoteUpdateError)
        // Don't fail the request if quote update fails, but log it
      } else {
        console.log(`✅ Updated quote ${invoice.quote_id} status to accepted`)
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("❌ Invoice delete error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
