// ========== trip_notifications Edge Function (DROP-IN READY) ==========
// Copy this entire file to your Supabase Edge Function
// File: supabase/functions/trip_notifications/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// ---------- ENV VARIABLES (Set in Supabase Dashboard) ----------
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")
const DEFAULT_FROM = Deno.env.get("FROM_EMAIL") ?? "AeroIQ <no-reply@aeroiq.io>"
const PUBLIC_APP_URL = Deno.env.get("NEXT_PUBLIC_APP_URL") ?? "https://aeroiq.io"

// ---------- SUPABASE CLIENT ----------
const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE!, {
  auth: { persistSession: false },
})

// ---------- CORS HEADERS ----------
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// ---------- UTILITIES ----------
function esc(s = "") {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] || c
  )
}

// ---------- EMAIL TEMPLATE ----------
function buildEmailHtml({
  tenantName,
  title,
  body,
  detailsTable,
  ctaText,
  ctaUrl,
  logoUrl,
  colorPrimary = "#111827",
  colorAccent = "#2563EB",
}: {
  tenantName: string
  title: string
  body: string
  detailsTable: string
  ctaText: string
  ctaUrl: string
  logoUrl: string | null
  colorPrimary?: string
  colorAccent?: string
}) {
  const border = "#E5E7EB"
  const subtle = "#6B7280"
  return `<!doctype html>
<html>
<body style="background:#F9FAFB; margin:0; padding:30px 0;">
<div style="max-width:720px; margin:auto; background:#fff; border-radius:20px; border:1px solid ${border}; overflow:hidden;">
<div style="text-align:center; padding:20px;">
${logoUrl ? `<img src="${esc(logoUrl)}" alt="Logo" style="max-width:200px;" />` : `<h2 style="color:${colorPrimary}; margin:0;">AeroIQ</h2>`}
</div>
<div style="padding:22px;">
<p style="font-size:15px; color:${colorPrimary}; margin:0 0 10px;">Hi ${esc(tenantName)},</p>
<p style="font-size:14px; color:${colorPrimary}; margin:0 0 14px;">${title}</p>
${detailsTable}
<div style="text-align:center; margin:22px 0;">
<a href="${esc(ctaUrl)}" style="display:inline-block; background:${colorAccent}; color:#fff; text-decoration:none; padding:12px 18px; border-radius:10px; font-weight:600;">
${esc(ctaText)}
</a>
</div>
<p style="font-size:13px; color:${subtle}; margin:20px 0 0;">${body}</p>
</div>
<div style="text-align:center; padding:15px; font-size:12px; color:${subtle};">Powered by <strong>AeroIQ</strong></div>
</div>
</body>
</html>`
}

// ---------- MAIN HANDLER ----------
Deno.serve(async (req) => {
  console.log("=== TRIP_NOTIFICATION START ===")

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    console.log("Payload:", JSON.stringify(payload, null, 2))

    const { tenant_id, email, action_type, metadata = {} } = payload

    // Validate required fields
    if (!tenant_id || !email || !action_type || !metadata.quote_id) {
      throw new Error("Missing required fields: tenant_id, email, action_type, metadata.quote_id")
    }

    const quote_id = metadata.quote_id

    // Simple deduplication: check if notification was sent in last 30 seconds
    const dedupeKey = `trip_notif:${tenant_id}:${email}:${action_type}:${quote_id}`
    const { data: recentNotification } = await supabase
      .from("action_link_audit_log")
      .select("id, created_at")
      .eq("action", "trip_notification.sent")
      .eq("target_id", quote_id)
      .gte("created_at", new Date(Date.now() - 30000).toISOString())
      .limit(1)
      .single()

    if (recentNotification) {
      console.warn("⚠️ Duplicate notification detected (sent within last 30s)")
      return new Response(
        JSON.stringify({ ok: false, error: "Duplicate notification – please wait." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // --- FETCH TENANT ---
    const { data: tenant } = await supabase
      .from("tenant")
      .select("name")
      .eq("id", tenant_id)
      .single()

    const tenantName = tenant?.name ?? "Valued Customer"

    // --- FETCH BRANDING ---
    const { data: brand } = await supabase
      .from("tenant_notifications")
      .select("from_email, logo_path, color_primary, color_accent, is_active")
      .eq("tenant_id", tenant_id)
      .eq("is_active", true)
      .maybeSingle()

    const fromEmail = brand?.from_email ?? DEFAULT_FROM
    const logoUrl = brand?.logo_path
      ? `${SUPABASE_URL}/storage/v1/object/public/branding/${brand.logo_path.replace(/^\/*/, "")}`
      : null

    // --- FETCH QUOTE (FIXED: Separate query) ---
    const { data: quote, error: qErr } = await supabase
      .from("quote")
      .select("id, currency, trip_summary, selected_option_id")
      .eq("id", quote_id)
      .eq("tenant_id", tenant_id)
      .single()

    if (qErr || !quote) {
      console.error("Quote query error:", qErr)
      throw new Error("Quote not found")
    }

    // --- GET SELECTED OPTION ID (FIXED: Use metadata first) ---
    const selectedOptionId = metadata.selected_option_id || quote.selected_option_id

    if (!selectedOptionId) {
      throw new Error("No selected option ID found in quote or metadata")
    }

    // --- FETCH SELECTED OPTION (FIXED: Query specific option) ---
    const { data: option, error: optErr } = await supabase
      .from("quote_option")
      .select(`
        id,
        label,
        accepted_at,
        price_total,
        aircraft_id,
        aircraft!inner (
          id,
          tail_number,
          model,
          operator_id,
          operator!inner (
            id,
            name
          )
        )
      `)
      .eq("id", selectedOptionId)
      .eq("quote_id", quote_id)
      .single()

    if (optErr || !option) {
      console.error("Option query error:", optErr)
      console.error("Query details:", {
        selectedOptionId,
        quote_id,
        quoteSelectedOptionId: quote.selected_option_id,
        metadataSelectedOptionId: metadata.selected_option_id,
      })
      throw new Error(`Selected option ${selectedOptionId} not found`)
    }

    const aircraft = option.aircraft
    const operator = aircraft?.operator

    const aircraftName = aircraft?.tail_number
      ? `${aircraft.tail_number} (${aircraft.model})`
      : aircraft?.model ?? `Aircraft ${aircraft?.id}`

    const operatorName = operator?.name ?? "Unknown Operator"

    const formattedPrice = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: quote.currency ?? "USD",
    }).format(Number(option.price_total ?? 0))

    // --- BUILD TRIP SUMMARY ---
    let tripSummary = quote.trip_summary?.trim()
    if (!tripSummary) {
      const { data: legs } = await supabase
        .from("quote_detail")
        .select("origin_code, destination_code, depart_dt")
        .eq("quote_id", quote_id)
        .order("seq", { ascending: true })

      tripSummary = legs?.length
        ? legs
            .map(
              (l) =>
                `${l.origin_code ?? "?"} to ${l.destination_code ?? "?"} ${
                  l.depart_dt ? new Date(l.depart_dt).toLocaleDateString() : ""
                }`
            )
            .join(" to ")
        : "Trip details unavailable"
    }

    // --- BUILD EMAIL ---
    let subject = ""
    let html = ""

    switch (action_type) {
      case "quote_accepted": {
        subject = `Quote Accepted – ${tripSummary} – ${formattedPrice}`
        const detailsTable = `
<table style="width:100%; border-collapse:collapse; font-size:14px; color:${brand?.color_primary ?? "#111827"}; margin:16px 0;">
<tr><td style="padding:6px 0; font-weight:600;">Accepted on:</td><td>${option.accepted_at ? new Date(option.accepted_at).toLocaleDateString() : "Recently"}</td></tr>
<tr><td style="padding:6px 0; font-weight:600;">Option:</td><td>${esc(option.label ?? "Selected")}</td></tr>
<tr><td style="padding:6px 0; font-weight:600;">Aircraft:</td><td>${esc(aircraftName)}</td></tr>
<tr><td style="padding:6px 0; font-weight:600;">Operator:</td><td>${esc(operatorName)}</td></tr>
<tr><td style="padding:6px 0; font-weight:600; vertical-align:top;">Trip:</td><td>${esc(tripSummary)}</td></tr>
<tr><td style="padding:6px 0; font-weight:600; color:${brand?.color_accent ?? "#2563EB"};">Total Price:</td><td style="font-weight:700; color:${brand?.color_accent ?? "#2563EB"};">${formattedPrice}</td></tr>
</table>`
        html = buildEmailHtml({
          tenantName,
          title: "Great news — your quote has been <strong>accepted</strong>!",
          body: "You can now view your trip details and proceed with booking.",
          detailsTable,
          ctaText: "View Trip Dashboard",
          ctaUrl: `${PUBLIC_APP_URL}/trips`,
          logoUrl,
          colorPrimary: brand?.color_primary ?? "#111827",
          colorAccent: brand?.color_accent ?? "#2563EB",
        })
        break
      }

      case "quote_declined": {
        const reason = metadata.reason ? `Reason: ${esc(metadata.reason)}` : "No reason provided."
        subject = `Quote Declined – ${tripSummary}`
        const detailsTable = `
<table style="width:100%; border-collapse:collapse; font-size:14px; color:${brand?.color_primary ?? "#111827"}; margin:16px 0;">
<tr><td style="padding:6px 0; font-weight:600;">Option:</td><td>${esc(option.label ?? "Selected")}</td></tr>
<tr><td style="padding:6px 0; font-weight:600;">Aircraft:</td><td>${esc(aircraftName)}</td></tr>
<tr><td style="padding:6px 0; font-weight:600;">Operator:</td><td>${esc(operatorName)}</td></tr>
<tr><td style="padding:6px 0; font-weight:600; vertical-align:top;">Trip:</td><td>${esc(tripSummary)}</td></tr>
<tr><td style="padding:6px 0; font-weight:600; color:#DC2626;">Price:</td><td style="font-weight:700; color:#DC2626;">${formattedPrice}</td></tr>
<tr><td style="padding:6px 0; font-weight:600; color:#DC2626;">Decline Reason:</td><td style="color:#DC2626;">${reason}</td></tr>
</table>`
        html = buildEmailHtml({
          tenantName,
          title: "We're sorry — your quote has been <strong>declined</strong>.",
          body: "Feel free to request a new quote or contact us for alternatives.",
          detailsTable,
          ctaText: "Request New Quote",
          ctaUrl: `${PUBLIC_APP_URL}/quotes/new`,
          logoUrl,
          colorPrimary: brand?.color_primary ?? "#111827",
          colorAccent: brand?.color_accent ?? "#2563EB",
        })
        break
      }

      default:
        throw new Error(`Unsupported action_type: ${action_type}`)
    }

    // --- SEND EMAIL ---
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [email],
        subject,
        html,
      }),
    })

    if (!emailRes.ok) {
      const text = await emailRes.text()
      console.error("RESEND ERROR:", emailRes.status, text)
      throw new Error(`Resend failed: ${text}`)
    }

    // --- AUDIT LOG ---
    const { error: auditErr } = await supabase.from("action_link_audit_log").insert({
      tenant_id,
      actor_user_id: metadata.created_by ?? null,
      action: "trip_notification.sent",
      action_type,
      target_id: quote_id,
      details: {
        email,
        action_type,
        quote_id,
        selected_option_id: option.id,
        provider: "resend",
        status: "ok",
      },
      ip: req.headers.get("x-forwarded-for") ?? "unknown",
      user_agent: req.headers.get("user-agent") ?? "unknown",
    })

    if (auditErr) {
      console.error("AUDIT ERROR:", auditErr)
    }

    console.log("✅ Notification sent successfully")
    return new Response(
      JSON.stringify({ ok: true, sent: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err: any) {
    console.error("CRASH:", err.message)
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})

