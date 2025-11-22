import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ========== ENV ==========
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const DEFAULT_FROM = Deno.env.get("FROM_EMAIL") || "AeroIQ <no-reply@aeroiq.io>";
const PUBLIC_APP_URL = Deno.env.get("NEXT_PUBLIC_APP_URL") || "https://broker.aeroiq.io";
const BRAND_BUCKET = Deno.env.get("BRAND_BUCKET") || "branding";

// Validate required environment variables
if (!SUPABASE_URL || !SERVICE_ROLE || !RESEND_API_KEY) {
  console.error("Missing required environment variables:", {
    hasSupabaseUrl: !!SUPABASE_URL,
    hasServiceRole: !!SERVICE_ROLE,
    hasResendKey: !!RESEND_API_KEY,
  });
}

// ========== CLIENTS ==========
if (!SUPABASE_URL || !SERVICE_ROLE) {
  throw new Error("Missing required Supabase environment variables");
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: {
    persistSession: false,
  },
});

// ========== HELPERS ==========
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function esc(s = "") {
  return (s ?? "").replace(/[&<>"']/g, (c) =>
    ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[c] || c
  );
}

function logoUrl(path: string | null | undefined) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${SUPABASE_URL?.replace(/\/$/, "")}/storage/v1/object/public/${BRAND_BUCKET}/${path.replace(/^\/+/, "")}`;
}

async function sendResend(to: string | string[], subject: string, html: string, fromEmail?: string, replyTo?: string) {
  const from = fromEmail?.trim() || DEFAULT_FROM;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      reply_to: replyTo?.trim() || undefined,
    }),
  });
  const json = await res.text();
  if (!res.ok) throw new Error(`Resend ${res.status}: ${json}`);
  return json;
}

function formatCurrency(amount: number | null | undefined, currency: string = "USD"): string {
  if (amount === null || amount === undefined || isNaN(amount)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(amount);
}

function formatDate(date: string | null | undefined): string {
  if (!date) return "Recently";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "Recently";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "Recently";
  }
}

function formatDateTime(date: string | null | undefined): string {
  if (!date) return "Recently";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "Recently";
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "Recently";
  }
}

// Format trip summary from legs
function formatTripSummary(legs: any[]): string {
  if (!legs || legs.length === 0) return "N/A";
  return legs
    .map((leg) => {
      const origin = leg.origin_code || leg.origin || "";
      const dest = leg.destination_code || leg.destination || "";
      return `${origin} → ${dest}`;
    })
    .join(" → ");
}

// ========== EMAIL TEMPLATES ==========

function quoteAcceptedEmailHtml({
  logoUrl,
  tenantName,
  acceptedDate,
  contactName,
  contactEmail,
  contactPhone,
  optionLabel,
  aircraftTail,
  aircraftModel,
  operatorName,
  tripSummary,
  specialNotes,
  operatorCost,
  commission,
  totalPrice,
  currency,
  colorPrimary = "#0F1D2B",
  colorAccent = "#0F1D2B",
}: {
  logoUrl: string | null;
  tenantName: string;
  acceptedDate: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  optionLabel: string;
  aircraftTail: string | null;
  aircraftModel: string | null;
  operatorName: string | null;
  tripSummary: string;
  specialNotes: string | null;
  operatorCost: number;
  commission: number;
  totalPrice: number;
  currency: string;
  colorPrimary?: string;
  colorAccent?: string;
}) {
  const border = "#E5E7EB";
  const subtle = "#6B7280";
  const primary = colorPrimary;

  const aircraftDisplay = aircraftTail && aircraftModel 
    ? `${aircraftTail} (${aircraftModel})`
    : aircraftModel || aircraftTail || "N/A";

  const contactDisplay = [
    contactName,
    contactEmail,
    contactPhone ? contactPhone : null,
  ]
    .filter(Boolean)
    .join("<br/>");

  return `<!doctype html>
<html>
  <body style="background:#F9FAFB; margin:0; padding:30px 0;">
    <div style="max-width:720px; margin:auto; background:#fff; border-radius:20px; border:1px solid ${border}; overflow:hidden;">
      <div style="text-align:center; padding:20px;">
        ${logoUrl ? `<img src="${esc(logoUrl)}" alt="Logo" style="max-width:200px;" />` : `<h2 style="color:${primary}; margin:0;">AeroIQ</h2>`}
      </div>
      <div style="padding:22px;">
        <p style="font-size:15px; color:${primary}; margin:0 0 10px;">Hi ${esc(tenantName)},</p>
        <p style="font-size:14px; color:${primary}; margin:0 0 14px;">Great news — your quote has been <strong>accepted</strong>!</p>
        <table style="width:100%; border-collapse:collapse; font-size:14px; color:${primary}; margin:16px 0;">
          <tr><td style="padding:6px 0; font-weight:600;">Accepted on:</td><td>${esc(acceptedDate)}</td></tr>
          <tr><td style="padding:6px 0; font-weight:600; vertical-align:top;">Contact:</td><td>${contactDisplay}</td></tr>
          <tr><td style="padding:6px 0; font-weight:600;">Option:</td><td>${esc(optionLabel)}</td></tr>
          <tr><td style="padding:6px 0; font-weight:600;">Aircraft:</td><td>${esc(aircraftDisplay)}</td></tr>
          <tr><td style="padding:6px 0; font-weight:600;">Operator:</td><td>${esc(operatorName || "N/A")}</td></tr>
          <tr><td style="padding:6px 0; font-weight:600; vertical-align:top;">Trip:</td><td>${esc(tripSummary)}</td></tr>
          ${specialNotes ? `<tr><td style="padding:6px 0; font-weight:600; vertical-align:top;">Special Notes:</td><td>${esc(specialNotes)}</td></tr>` : ""}
          <tr><td style="padding:6px 0; font-weight:600;">Operator Cost:</td><td>${formatCurrency(operatorCost, currency)}</td></tr>
          <tr><td style="padding:6px 0; font-weight:600;">Commission:</td><td>${formatCurrency(commission, currency)}</td></tr>
          <tr><td style="padding:6px 0; font-weight:600; color:${primary};">Total Price:</td><td style="font-weight:700; color:${primary};">${formatCurrency(totalPrice, currency)}</td></tr>
        </table>
        <div style="text-align:center; margin:22px 0;">
          <a href="${esc(PUBLIC_APP_URL)}/quotes" style="display:inline-block; background:${colorAccent}; color:#fff; text-decoration:none; padding:12px 18px; border-radius:10px; font-weight:600;">
            Create Invoice
          </a>
        </div>
        <p style="font-size:13px; color:${subtle}; margin:20px 0 0;">You can now create the invoice and send the contract.</p>
      </div>
      <div style="text-align:center; padding:15px; font-size:12px; color:${subtle};">Powered by <strong>AeroIQ</strong></div>
    </div>
  </body>
</html>`;
}

function quoteDeclinedEmailHtml({
  logoUrl,
  tenantName,
  declinedDate,
  contactName,
  contactEmail,
  contactPhone,
  reason,
  notes,
  tripSummary,
  colorPrimary = "#0F1D2B",
  colorAccent = "#0F1D2B",
}: {
  logoUrl: string | null;
  tenantName: string;
  declinedDate: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  reason: string;
  notes: string | null;
  tripSummary: string;
  colorPrimary?: string;
  colorAccent?: string;
}) {
  const border = "#E5E7EB";
  const subtle = "#6B7280";
  const primary = colorPrimary;

  const contactDisplay = [
    contactName,
    contactEmail,
    contactPhone ? contactPhone : null,
  ]
    .filter(Boolean)
    .join("<br/>");

  const reasonLabels: Record<string, string> = {
    pricing: "Pricing concerns",
    timing: "Timing not right",
    aircraft: "Aircraft preferences",
    found_alternative: "Found alternative option",
    cancelled: "Trip cancelled",
    other: "Other",
  };

  const reasonDisplay = reasonLabels[reason] || reason;

  return `<!doctype html>
<html>
  <body style="background:#F9FAFB; margin:0; padding:30px 0;">
    <div style="max-width:720px; margin:auto; background:#fff; border-radius:20px; border:1px solid ${border}; overflow:hidden;">
      <div style="text-align:center; padding:20px;">
        ${logoUrl ? `<img src="${esc(logoUrl)}" alt="Logo" style="max-width:200px;" />` : `<h2 style="color:${primary}; margin:0;">AeroIQ</h2>`}
      </div>
      <div style="padding:22px;">
        <p style="font-size:15px; color:${primary}; margin:0 0 10px;">Hi ${esc(tenantName)},</p>
        <p style="font-size:14px; color:${primary}; margin:0 0 14px;">A quote has been <strong>declined</strong>.</p>
        <table style="width:100%; border-collapse:collapse; font-size:14px; color:${primary}; margin:16px 0;">
          <tr><td style="padding:6px 0; font-weight:600;">Declined on:</td><td>${esc(declinedDate)}</td></tr>
          <tr><td style="padding:6px 0; font-weight:600; vertical-align:top;">Contact:</td><td>${contactDisplay}</td></tr>
          <tr><td style="padding:6px 0; font-weight:600; vertical-align:top;">Trip:</td><td>${esc(tripSummary)}</td></tr>
          <tr><td style="padding:6px 0; font-weight:600;">Reason:</td><td>${esc(reasonDisplay)}</td></tr>
          ${notes ? `<tr><td style="padding:6px 0; font-weight:600; vertical-align:top;">Notes:</td><td>${esc(notes)}</td></tr>` : ""}
        </table>
        <div style="text-align:center; margin:22px 0;">
          <a href="${esc(PUBLIC_APP_URL)}/quotes" style="display:inline-block; background:${colorAccent}; color:#fff; text-decoration:none; padding:12px 18px; border-radius:10px; font-weight:600;">
            View Quotes
          </a>
        </div>
        <p style="font-size:13px; color:${subtle}; margin:20px 0 0;">You can review other quotes or follow up with the customer.</p>
      </div>
      <div style="text-align:center; padding:15px; font-size:12px; color:${subtle};">Powered by <strong>AeroIQ</strong></div>
    </div>
  </body>
</html>`;
}

// ========== HANDLER ==========
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    // Validate environment variables first
    if (!SUPABASE_URL || !SERVICE_ROLE || !RESEND_API_KEY) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Server configuration error: Missing required environment variables",
          details: {
            hasSupabaseUrl: !!SUPABASE_URL,
            hasServiceRole: !!SERVICE_ROLE,
            hasResendKey: !!RESEND_API_KEY,
          },
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body with error handling
    let payload: any;
    try {
      payload = await req.json();
      console.log("Received payload:", JSON.stringify(payload, null, 2));
    } catch (parseError: any) {
      console.error("Failed to parse request body:", parseError);
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Invalid JSON in request body",
          details: parseError?.message,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { tenant_id, email, action_type, metadata } = payload || {};

    if (!tenant_id || !email || !action_type) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Missing required fields: tenant_id, email, action_type",
          received: { tenant_id: !!tenant_id, email: !!email, action_type: !!action_type },
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate metadata based on action type
    if (action_type === "quote_accepted") {
      if (!metadata?.quote_id || !metadata?.selected_option_id) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "Missing required metadata: quote_id, selected_option_id",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    } else if (action_type === "quote_declined") {
      if (!metadata?.quote_id || !metadata?.reason) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "Missing required metadata: quote_id, reason",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    const quote_id = metadata?.quote_id;
    
    if (!quote_id) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Missing quote_id in metadata",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // --- QUOTE + SELECTED OPTION (FIXED) ---
    console.log("🔍 Fetching quote:", { quote_id, tenant_id });
    const { data: quote, error: qErr } = await supabase
      .from("quote")
      .select("id, currency, trip_summary, selected_option_id, customer_id, updated_at, legs")
      .eq("id", quote_id)
      .eq("tenant_id", tenant_id)
      .single();

    if (qErr) {
      console.error("❌ Quote query error:", {
        error: qErr,
        message: qErr.message,
        code: qErr.code,
        details: qErr.details,
        hint: qErr.hint,
        quote_id,
        tenant_id,
      });
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Quote not found or access denied",
          details: qErr.message,
          code: qErr.code,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!quote) {
      console.error("❌ Quote not found (no data returned):", { quote_id, tenant_id });
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Quote not found",
          quote_id,
          tenant_id,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("✅ Quote found:", { quote_id: quote.id, customer_id: quote.customer_id });

    // Get tenant info
    const { data: tenant, error: tenantErr } = await supabase
      .from("tenant")
      .select("name")
      .eq("id", tenant_id)
      .single();

    if (tenantErr) {
      console.error("Tenant query error:", tenantErr);
    }

    const tenantName = tenant?.name || "Team";

    // Get customer info
    console.log("🔍 Fetching customer:", { customer_id: quote.customer_id });
    const { data: customer, error: customerErr } = await supabase
      .from("contact")
      .select("name, email, phone")
      .eq("id", quote.customer_id)
      .single();

    if (customerErr) {
      console.error("❌ Customer query error:", {
        error: customerErr,
        message: customerErr.message,
        code: customerErr.code,
        customer_id: quote.customer_id,
      });
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Customer not found",
          details: customerErr.message,
          code: customerErr.code,
          customer_id: quote.customer_id,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!customer) {
      console.error("❌ Customer not found (no data returned):", { customer_id: quote.customer_id });
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Customer not found",
          customer_id: quote.customer_id,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("✅ Customer found:", { customer_id: customer.id, email: customer.email });

    // Get tenant branding (following book-trip-email pattern)
    console.log("🔍 Fetching tenant branding:", { tenant_id });
    const { data: brandData, error: brandErr } = await supabase
      .from("tenant_notifications")
      .select("email_1, email_2, email_3, from_email, color_primary, color_accent, logo_path, tenant_id")
      .eq("tenant_id", tenant_id)
      .eq("is_active", true);

    if (brandErr) {
      console.error("❌ Branding query error:", brandErr);
    }

    const brand = brandData?.[0] || {};
    console.log("✅ Branding found:", { 
      hasEmail1: !!brand.email_1, 
      hasEmail2: !!brand.email_2, 
      hasEmail3: !!brand.email_3,
      fromEmail: brand.from_email,
    });
    
    // Get tenant emails (email_1, email_2, email_3)
    const tenantEmails = [brand.email_1, brand.email_2, brand.email_3]
      .filter((x, i, a) => x && a.indexOf(x) === i);
    
    // Combine tenant emails with requester email (if provided)
    const requesterEmail = email?.trim();
    const emails = requesterEmail
      ? [...tenantEmails, requesterEmail].filter((x, i, a) => x && a.indexOf(x) === i)
      : tenantEmails;

    console.log("📧 Email recipients:", { emails, count: emails.length });

    if (emails.length === 0) {
      console.error("❌ No active emails for tenant");
      return new Response(
        JSON.stringify({
          ok: false,
          error: `No active emails for tenant ${tenant_id}`,
          tenant_id,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const fromEmail = brand.from_email || DEFAULT_FROM;
    const logoUrlPath = logoUrl(brand.logo_path);
    const colorPrimary = brand.color_primary || "#0F1D2B";
    const colorAccent = brand.color_accent || "#0F1D2B";

    // Format trip summary
    const tripSummary = formatTripSummary(quote.legs || []);

    if (action_type === "quote_accepted") {
      // Get selected_option_id from metadata first (most reliable), fallback to quote
      const selectedOptionId = metadata.selected_option_id || quote.selected_option_id;

      if (!selectedOptionId) {
        console.error("No selected option ID found:", {
          metadataSelectedOptionId: metadata.selected_option_id,
          quoteSelectedOptionId: quote.selected_option_id,
        });
        return new Response(
          JSON.stringify({
            ok: false,
            error: "No selected option ID found in quote or metadata",
            details: {
              metadataSelectedOptionId: metadata.selected_option_id,
              quoteSelectedOptionId: quote.selected_option_id,
            },
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Fetch the specific selected option
      console.log("🔍 Fetching selected option:", { selectedOptionId, quote_id });
      const { data: option, error: optErr } = await supabase
        .from("quote_option")
        .select(
          `
          id,
          label,
          accepted_at,
          price_total,
          cost_operator,
          price_commission,
          conditions,
          aircraft_id,
          aircraft (
            id,
            tail_number,
            model,
            operator_id,
            operator (
              id,
              name
            )
          )
        `
        )
        .eq("id", selectedOptionId)
        .eq("quote_id", quote_id)
        .single();

      if (optErr) {
        console.error("❌ Option query error:", {
          error: optErr,
          message: optErr.message,
          code: optErr.code,
          selectedOptionId,
          quote_id,
          quoteSelectedOptionId: quote.selected_option_id,
          metadataSelectedOptionId: metadata.selected_option_id,
        });
        return new Response(
          JSON.stringify({
            ok: false,
            error: `Selected option not found`,
            details: optErr.message,
            code: optErr.code,
            selectedOptionId,
            quote_id,
          }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (!option) {
        console.error("❌ Option not found (no data returned):", { selectedOptionId, quote_id });
        return new Response(
          JSON.stringify({
            ok: false,
            error: `Selected option not found`,
            selectedOptionId,
            quote_id,
          }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log("✅ Option found:", { 
        option_id: option.id, 
        label: option.label,
        hasAircraft: !!option.aircraft,
        aircraft_id: option.aircraft_id,
      });

      // Handle aircraft data - can be null if relationship doesn't exist
      const aircraft = Array.isArray(option.aircraft) ? option.aircraft[0] : option.aircraft;
      const operator = aircraft?.operator 
        ? (Array.isArray(aircraft.operator) ? aircraft.operator[0] : aircraft.operator)
        : null;
      
      console.log("✅ Aircraft data:", {
        hasAircraft: !!aircraft,
        tail_number: aircraft?.tail_number,
        model: aircraft?.model,
        hasOperator: !!operator,
        operatorName: operator?.name,
      });

      // Calculate totals
      const operatorCost = Number(option.cost_operator) || 0;
      const commission = Number(option.price_commission) || 0;
      const totalPrice = option.price_total !== undefined && option.price_total !== null
        ? Number(option.price_total)
        : operatorCost + commission;

      const acceptedDate = formatDateTime(option.accepted_at || quote.updated_at || new Date().toISOString());

      const html = quoteAcceptedEmailHtml({
        logoUrl: logoUrlPath,
        tenantName,
        acceptedDate,
        contactName: customer.name || "Customer",
        contactEmail: customer.email || "",
        contactPhone: customer.phone,
        optionLabel: option.label || "Option 1",
        aircraftTail: aircraft?.tail_number || null,
        aircraftModel: aircraft?.model || null,
        operatorName: operator?.name || null,
        tripSummary,
        specialNotes: option.conditions || null,
        operatorCost,
        commission,
        totalPrice,
        currency: quote.currency || "USD",
        colorPrimary,
        colorAccent,
      });

      const subject = `Quote Accepted - ${tripSummary || "New Quote"}`;

      // Send email using sendResend helper (sends to all tenant emails)
      await sendResend(emails, subject, html, fromEmail, customer.email || undefined);

      return new Response(
        JSON.stringify({
          ok: true,
          message: "Quote accepted notification sent",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } else if (action_type === "quote_declined") {
      const declinedDate = formatDateTime(quote.updated_at || new Date().toISOString());

      const html = quoteDeclinedEmailHtml({
        logoUrl: logoUrlPath,
        tenantName,
        declinedDate,
        contactName: customer.name || "Customer",
        contactEmail: customer.email || "",
        contactPhone: customer.phone,
        reason: metadata.reason || "Not specified",
        notes: metadata.notes || null,
        tripSummary,
        colorPrimary,
        colorAccent,
      });

      const subject = `Quote Declined - ${tripSummary || "New Quote"}`;

      // Send email using sendResend helper (sends to all tenant emails)
      await sendResend(emails, subject, html, fromEmail, customer.email || undefined);

      return new Response(
        JSON.stringify({
          ok: true,
          message: "Quote declined notification sent",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } else {
      return new Response(
        JSON.stringify({
          ok: false,
          error: `Unsupported action_type: ${action_type}`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (err: any) {
    console.error("trip_notifications error:", err);
    console.error("Error stack:", err?.stack);
    console.error("Error details:", {
      message: err?.message,
      name: err?.name,
      cause: err?.cause,
    });
    
    // Return detailed error for debugging (in production, you might want to hide details)
    return new Response(
      JSON.stringify({
        ok: false,
        error: err?.message || String(err),
        details: process.env.NODE_ENV === "development" ? {
          stack: err?.stack,
          name: err?.name,
        } : undefined,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

