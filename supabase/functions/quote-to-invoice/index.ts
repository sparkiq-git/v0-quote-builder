import { serve } from "https://deno.land/std@0.214.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/* =========================================================
   Helper: Generate next AIQ-XXXXX invoice number
========================================================= */
async function getNextInvoiceNumber(tenant_id: string): Promise<string> {
  const { data: last } = await supabase
    .from("invoice")
    .select("number")
    .eq("tenant_id", tenant_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let nextNum = 1;
  if (last?.number) {
    const match = last.number.match(/\d+$/);
    if (match) nextNum = parseInt(match[0]) + 1;
  }
  return `AIQ-${nextNum.toString().padStart(5, "0")}`;
}

/* =========================================================
   Function: Convert Quote → Invoice
   
   ENHANCEMENTS:
   - Accepts 'taxes' parameter: Array<{ id: string; name: string; amount: number }>
   - Uses taxes from parameter instead of calculating
   - Creates invoice_detail records for taxes with type="tax"
   - Calculates subtotal without taxes, tax_total from passed taxes
========================================================= */
serve(async (req) => {
  try {
    const { quote_id, payment_url, taxes } = await req.json();

    if (!quote_id) throw new Error("Missing quote_id");

    // 1️⃣ Fetch quote + related data
    const [
      { data: quote },
      { data: legs },
      { data: options },
      { data: items },
    ] = await Promise.all([
      supabase.from("quote").select("*").eq("id", quote_id).single(),
      supabase
        .from("quote_detail")
        .select("*")
        .eq("quote_id", quote_id)
        .order("seq"),
      supabase
        .from("quote_option")
        .select("*")
        .eq("quote_id", quote_id),
      supabase
        .from("quote_item")
        .select("*")
        .eq("quote_id", quote_id),
    ]);

    if (!quote) throw new Error("Quote not found");

    // Find the selected option using quote.selected_option_id (not is_selected flag)
    // According to schema: quote.selected_option_id references quote_option.id
    console.log(`🔍 Finding selected option: quote.selected_option_id=${quote.selected_option_id}`);
    console.log(`📋 Available options: ${options?.length || 0} options`, options?.map(o => ({ id: o.id, label: o.label })));
    
    const selectedOption = quote.selected_option_id
      ? options?.find((o) => o.id === quote.selected_option_id)
      : null;
    
    if (!selectedOption) {
      const availableIds = options?.map(o => o.id).join(", ") || "none";
      throw new Error(
        `No selected aircraft option found. Quote has selected_option_id=${quote.selected_option_id}, but matching option not found in ${options?.length || 0} available options (IDs: ${availableIds}).`
      );
    }
    
    console.log(`✅ Selected option found: id=${selectedOption.id}, label=${selectedOption.label}, aircraft_id=${selectedOption.aircraft_id}`);

    // 🔎 Fetch tail_number if available
    let tailNumber = null;
    if (selectedOption.aircraft_id) {
      const { data: aircraft } = await supabase
        .from("aircraft")
        .select("tail_number")
        .eq("id", selectedOption.aircraft_id)
        .maybeSingle();
      tailNumber = aircraft?.tail_number ?? null;
    }

    // 2️⃣ Regeneration logic — reuse invoice number if exists
    let invoiceNumber: string;
    const { data: existingInvoice } = await supabase
      .from("invoice")
      .select("id, number")
      .eq("quote_id", quote_id)
      .maybeSingle();

    if (existingInvoice?.id) {
      if (existingInvoice.number.startsWith("AIQ-")) {
        invoiceNumber = existingInvoice.number;
      } else {
        invoiceNumber = `AIQ-${existingInvoice.number.replace(/\D/g, "").padStart(5, "0")}`;
      }
      await supabase
        .from("invoice_detail")
        .delete()
        .eq("invoice_id", existingInvoice.id);
      await supabase.from("invoice").delete().eq("id", existingInvoice.id);
      console.log(
        `🧹 Deleted old invoice ${existingInvoice.id}, reusing number ${invoiceNumber}`,
      );
    } else {
      invoiceNumber = await getNextInvoiceNumber(quote.tenant_id);
    }

    // 3️⃣ Compute subtotal (without taxes)
    // quote_option has: cost_operator, price_commission
    const aircraftSubtotal =
      Number(selectedOption.cost_operator ?? 0) +
      Number(selectedOption.price_commission ?? 0);
    // quote_item has: unit_price, qty, line_total (generated as qty * unit_price)
    // Note: quote_item doesn't have an 'amount' field, only unit_price
    const servicesSubtotal = (items || []).reduce(
      (sum, i) => sum + Number(i.unit_price ?? 0) * Number(i.qty ?? 1),
      0,
    );
    const subtotal = aircraftSubtotal + servicesSubtotal;

    // 4️⃣ Process taxes from parameter (or use empty array if not provided)
    const taxesArray = Array.isArray(taxes) ? taxes : [];
    const taxTotal = taxesArray.reduce(
      (sum, tax) => sum + Number(tax.amount || 0),
      0,
    );

    // 5️⃣ Calculate grand total
    const total = +(subtotal + taxTotal).toFixed(2);

    const summary = (legs || [])
      .map((l) => `${l.origin_code} → ${l.destination_code}`)
      .join(" | ");

    // 🛩 Aircraft label fallback
    // quote_option has: label, aircraft_id (and other price fields)
    // Use label from quote_option as primary fallback, then tail_number from aircraft table
    const aircraftLabel =
      selectedOption.label?.trim() ||
      tailNumber ||
      `Aircraft ${selectedOption.aircraft_id || "Option"}`;

    // 6️⃣ Insert invoice
    const { data: invoice, error: invErr } = await supabase
      .from("invoice")
      .insert([
        {
          tenant_id: quote.tenant_id,
          quote_id: quote.id,
          selected_option_id: selectedOption.id,
          number: invoiceNumber,
          issued_at: new Date().toISOString(),
          currency: quote.currency || "USD",
          subtotal: +subtotal.toFixed(2),
          tax_total: +taxTotal.toFixed(2),
          amount: total,
          status: "issued",
          summary_itinerary: summary,
          aircraft_label: aircraftLabel,
          external_payment_url: payment_url || null,
          breakdown_json: {
            aircraft: {
              label: aircraftLabel,
              amount: aircraftSubtotal,
            },
            services: (items || []).map((i) => ({
              label: i.name || i.description?.substring(0, 30) || "Service",
              amount: Number(i.unit_price ?? 0) * Number(i.qty ?? 1),
            })),
            taxes: taxesArray.map((t) => ({
              id: t.id,
              name: t.name,
              amount: t.amount,
            })),
            total,
          },
        },
      ])
      .select()
      .single();

    if (invErr) throw invErr;

    // 7️⃣ Insert invoice_detail lines
    const invoiceId = invoice.id;
    const details: any[] = [];
    let seq = 1;

    // Aircraft line (NO tax calculation - taxes are separate line items)
    details.push({
      invoice_id: invoiceId,
      seq: seq++,
      label: aircraftLabel || "Aircraft Option",
      description: summary || null,
      qty: 1,
      unit_price: aircraftSubtotal,
      // amount is a generated column (qty * unit_price) - don't include it
      type: "aircraft",
      taxable: false, // Taxes are separate line items, not calculated here
      tax_rate: 0,
      tax_amount: 0,
    });

    // Service lines (preserve taxable flag from quote_item)
    // Taxes are calculated in the wizard and passed as separate line items
    // quote_item has: name, description, unit_price, qty, taxable (no 'amount' or 'label' field)
    for (const s of items || []) {
      const unitPrice = Number(s.unit_price ?? 0);
      const qty = Number(s.qty ?? 1);
      const label =
        s.name?.trim() ||
        s.description?.substring(0, 30) ||
        "Service";
      // Preserve taxable flag from quote_item (default to true if not specified)
      const isTaxable = s.taxable !== false;

      details.push({
        invoice_id: invoiceId,
        seq: seq++,
        label,
        description: s.description || null,
        qty: qty,
        unit_price: unitPrice,
        // amount is a generated column (qty * unit_price) - don't include it
        type: "service",
        taxable: isTaxable, // Preserve taxable flag from quote_item
        tax_rate: isTaxable ? 7.5 : 0, // 7.5% tax rate if taxable (matches Federal Excise Tax rate)
        tax_amount: 0, // Tax is calculated separately and added as a tax line item
      });
    }

    // Tax lines (from taxes parameter)
    for (const tax of taxesArray) {
      if (tax.amount && tax.amount > 0) {
        details.push({
          invoice_id: invoiceId,
          seq: seq++,
          label: tax.name || "Tax",
          description: null,
          qty: 1,
          unit_price: Number(tax.amount),
          // amount is a generated column (qty * unit_price) - don't include it
          type: "tax",
          taxable: false,
          tax_rate: 0,
          tax_amount: 0,
        });
      }
    }

    const { error: detErr } = await supabase
      .from("invoice_detail")
      .insert(details);

    if (detErr) throw detErr;

    console.log(`✅ Invoice ${invoiceNumber} generated successfully`);
    console.log(`📊 Totals: subtotal=${subtotal}, tax_total=${taxTotal}, total=${total}`);
    console.log(`📋 Tax line items: ${taxesArray.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        invoice,
        details,
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  } catch (err: any) {
    console.error("❌ quote-to-invoice error:", err);
    return new Response(
      JSON.stringify({
        error: err.message,
      }),
      {
        status: 400,
      },
    );
  }
});
