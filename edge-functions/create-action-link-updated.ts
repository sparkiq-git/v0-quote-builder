import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ========== ENV ==========

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");

const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const DEFAULT_FROM = Deno.env.get("FROM_EMAIL") || "AeroIQ <no-reply@aeroiq.io>";

const PUBLIC_APP_URL = Deno.env.get("NEXT_PUBLIC_APP_URL") || "https://aeroiq.io";

// Optional Upstash rate-limit (recommended)

const KV_URL = Deno.env.get("KV_REST_API_URL");

const KV_TOKEN = Deno.env.get("KV_REST_API_TOKEN");

// ========== CLIENTS ==========

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: {
    persistSession: false
  }
});

// Lightweight Redis client (works if KV_URL/KV_TOKEN defined)

async function redisFetch(path, init) {
  if (!KV_URL || !KV_TOKEN) return null;

  const res = await fetch(`${KV_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      "Content-Type": "application/json"
    }
  });

  if (!res.ok) return null;

  return res.json();
}

async function redisSetEX(key, value, ttlSec) {
  return redisFetch(`/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}?EX=${ttlSec}`, {
    method: "POST"
  });
}

async function redisIncr(key) {
  return redisFetch(`/incr/${encodeURIComponent(key)}`, {
    method: "POST"
  });
}

async function redisExpire(key, ttlSec) {
  return redisFetch(`/expire/${encodeURIComponent(key)}/${ttlSec}`, {
    method: "POST"
  });
}

async function redisGet(key) {
  return redisFetch(`/get/${encodeURIComponent(key)}`);
}

// ========== HELPERS ==========

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

function randomToken(len = 32) {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b)=>b.toString(16).padStart(2, "0")).join("");
}

async function sha256b64url(input) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function esc(s = "") {
  return s.replace(/[&<>"']/g, (c)=>({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[c]);
}

function brandHtml({ 
  linkUrl, 
  logoUrl, 
  colorPrimary = "#111827", 
  colorAccent = "#2563EB", 
  expiresText = "This link will expire in 24 hours.",
  bodyText = "Please click the button below to securely view and confirm your quote.",
  buttonText = "View Quote"
}) {
  const border = "#E5E7EB";
  const subtle = "#6B7280";

  return `<!doctype html>
<html>
  <body style="background:#F9FAFB; margin:0; padding:30px 0;">
    <div style="max-width:720px; margin:auto; background:#fff; border-radius:20px; border:1px solid ${border}; overflow:hidden;">
      <div style="text-align:center; padding:20px;">
        ${logoUrl ? `<img src="${esc(logoUrl)}" alt="Logo" style="max-width:200px;" />` : `<h2 style="color:${colorPrimary}; margin:0;">AeroIQ</h2>`}
      </div>
      <div style="padding:22px;">
        <p style="font-size:15px; color:${colorPrimary}; margin:0 0 10px;">Hi there,</p>
        <p style="font-size:14px; color:${colorPrimary}; margin:0 0 14px;">
          ${esc(bodyText)}
        </p>
        <div style="text-align:center; margin:22px 0;">
          <a href="${esc(linkUrl)}" style="display:inline-block; background:${colorAccent}; color:#fff; text-decoration:none; padding:12px 18px; border-radius:10px; font-weight:600;">
            ${esc(buttonText)}
          </a>
        </div>
        <p style="font-size:13px; color:${subtle}; margin:0 0 8px;">or use this link:</p>
        <p style="font-size:12px; word-break:break-all; color:${colorPrimary}; margin:0 0 20px;">
          <a href="${esc(linkUrl)}" style="color:${colorAccent}; text-decoration:none;">${esc(linkUrl)}</a>
        </p>
        <p style="font-size:12px; color:${subtle}; margin:0;">${esc(expiresText)}</p>
      </div>
      <div style="text-align:center; padding:15px; font-size:12px; color:${subtle};">Powered by <strong>AeroIQ</strong></div>
    </div>
  </body>
</html>`;
}

// Rate-limit helpers (no-op if Upstash vars not set)

async function rateLimit({ tenantId, email, ip }) {
  if (!KV_URL || !KV_TOKEN) return; // disabled

  // per-tenant+ip: 5/min
  const k1 = `rate:create-link:tenant:${tenantId}:ip:${ip}`;
  const r1 = await redisIncr(k1);
  if (r1?.result === 1) await redisExpire(k1, 60);
  if (r1?.result > 5) throw new Error("Rate limit exceeded (per tenant/ip)");

  // per-email: 2/10s
  const k2 = `rate:create-link:email:${email}`;
  const r2 = await redisIncr(k2);
  if (r2?.result === 1) await redisExpire(k2, 10);
  if (r2?.result > 2) throw new Error("Rate limit exceeded (per email)");
}

// Deduplicate "replay" via short TTL (prevent rapid duplicate sends)

async function dedupeGuard(key, ttlSec = 60) {
  if (!KV_URL || !KV_TOKEN) return; // disabled

  const existing = await redisGet(key);
  if (existing?.result) throw new Error("Similar link was just created. Please wait a moment.");

  await redisSetEX(key, "1", ttlSec);
}

// ========== HANDLER ==========

Deno.serve(async (req)=>{
  if (req.method === "OPTIONS") return new Response("ok", {
    headers: corsHeaders
  });

  if (req.method !== "POST") return new Response("Method Not Allowed", {
    status: 405,
    headers: corsHeaders
  });

  const ip = req.headers.get("x-forwarded-for") ?? "unknown";

  try {
    const payload = await req.json();
    const { tenant_id, email, action_type, metadata, created_by } = payload || {};

    if (!tenant_id || !email || !action_type) {
      return new Response(JSON.stringify({
        ok: false,
        error: "Missing required fields"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    await rateLimit({
      tenantId: tenant_id,
      email,
      ip
    });

    await dedupeGuard(`dedupe:create-link:${tenant_id}:${email}:${action_type}`, 60);

    // Token + hash
    const token = randomToken(32);
    const tokenHashB64 = await sha256b64url(token);

    // Expiration (default 24h unless metadata.expiration_date is provided)
    const expiresAt = metadata?.expiration_date 
      ? new Date(metadata.expiration_date).toISOString() 
      : new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();

    // ***** UPDATED: Fetch trip_summary from quote OR itinerary *****
    let tripSummary = null;
    let itemTitle = null;

    // Check for quote first
    if (metadata?.quote_id) {
      const { data: quote, error: qErr } = await supabase
        .from("quote")
        .select("trip_summary, title")
        .eq("id", metadata.quote_id)
        .maybeSingle();

      if (!qErr && quote) {
        tripSummary = quote.trip_summary;
        itemTitle = quote.title;
      }
    }

    // Check for itinerary if no quote found
    if (!tripSummary && metadata?.itinerary_id) {
      const { data: itinerary, error: iErr } = await supabase
        .from("itinerary")
        .select("trip_summary, title")
        .eq("id", metadata.itinerary_id)
        .maybeSingle();

      if (!iErr && itinerary) {
        tripSummary = itinerary.trip_summary;
        itemTitle = itinerary.title;
      }
    }

    // Insert into DB
    const { data: insertRes, error: insertErr } = await supabase
      .from("action_link")
      .insert({
        tenant_id,
        email,
        action_type,
        token_hash: tokenHashB64,
        metadata,
        expires_at: expiresAt,
        status: "active",
        max_uses: 1,
        use_count: 0,
        created_by: created_by || "00000000-0000-0000-0000-000000000000"
      })
      .select("id")
      .single();

    if (insertErr) throw insertErr;

    const linkId = insertRes?.id;

    // Audit
    await supabase.from("action_link_audit_log").insert({
      tenant_id,
      actor_user_id: created_by || null,
      action: "action_link.create",
      target_id: linkId,
      details: {
        email,
        action_type,
        metadata
      },
      ip,
      user_agent: req.headers.get("user-agent") ?? "unknown"
    });

    // Tenant branding
    const { data: brand } = await supabase
      .from("tenant_notifications")
      .select("from_email, logo_path, color_primary, color_accent, is_active")
      .eq("tenant_id", tenant_id)
      .eq("is_active", true)
      .maybeSingle();

    const fromEmail = brand?.from_email || DEFAULT_FROM;
    const logoUrl = brand?.logo_path 
      ? `${SUPABASE_URL}/storage/v1/object/public/branding/${brand.logo_path}` 
      : null;

    // ***** UPDATED: Determine link URL based on action_type *****
    const linkUrl = `${PUBLIC_APP_URL}/action/${token}`;

    const expirationDate = new Date(expiresAt);
    const expirationText = `This link will expire on ${expirationDate.toLocaleDateString()} at ${expirationDate.toLocaleTimeString()}.`;

    // ***** UPDATED: Determine email content based on action_type *****
    let bodyText, buttonText, subject;

    if (action_type === "view_itinerary") {
      bodyText = "Please click the button below to securely view your itinerary.";
      buttonText = "View Itinerary";
      subject = tripSummary 
        ? `Your Itinerary for ${tripSummary} is Ready!` 
        : itemTitle
          ? `Your Itinerary: ${itemTitle}`
          : "Your Itinerary is Ready!";
    } else {
      // Default to quote behavior
      bodyText = "Please click the button below to securely view and confirm your quote.";
      buttonText = "View Quote";
      subject = tripSummary 
        ? `Your Quote for ${tripSummary} is Ready!` 
        : itemTitle
          ? `Your Quote: ${itemTitle}`
          : "Your Quote is Ready";
    }

    const html = brandHtml({
      linkUrl,
      logoUrl,
      colorPrimary: brand?.color_primary || "#111827",
      colorAccent: brand?.color_accent || "#2563EB",
      expiresText: expirationText,
      bodyText,
      buttonText
    });

    // Send email
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [email],
        subject,
        html
      })
    });

    const emailText = await emailRes.text();
    if (!emailRes.ok) throw new Error(`Resend ${emailRes.status}: ${emailText}`);

    // Audit: email sent
    await supabase.from("action_link_audit_log").insert({
      tenant_id,
      actor_user_id: created_by || null,
      action: "email.send",
      target_id: linkId,
      details: {
        to: email,
        provider: "resend",
        status: "ok",
        action_type,
        subject
      },
      ip,
      user_agent: req.headers.get("user-agent") ?? "unknown"
    });

    // Response
    return new Response(JSON.stringify({
      ok: true,
      id: linkId,
      expires_at: expiresAt,
      link_url: linkUrl
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });

  } catch (err) {
    // Best-effort audit on error
    try {
      const body = await req.clone().text();
      await supabase.from("action_link_audit_log").insert({
        tenant_id: null,
        actor_user_id: null,
        action: "action_link.create.error",
        target_id: null,
        details: {
          message: err?.message || String(err),
          body
        },
        ip,
        user_agent: req.headers.get("user-agent") ?? "unknown"
      });
    } catch {}

    return new Response(JSON.stringify({
      ok: false,
      error: err?.message || String(err)
    }), {
      status: /rate limit|duplicate/i.test(err?.message) ? 429 : 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
