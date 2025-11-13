import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------- ENV VARIABLES (Set in Supabase Dashboard) ----------

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const DEFAULT_FROM = Deno.env.get("FROM_EMAIL") ?? "AeroIQ <no-reply@aeroiq.io>";
const PUBLIC_APP_URL = Deno.env.get("NEXT_PUBLIC_APP_URL") ?? "https://aeroiq.io";

// ---------- SUPABASE CLIENT ----------

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: {
    persistSession: false
  }
});

// ---------- CORS HEADERS ----------

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

// ---------- UTILITIES ----------

function esc(s = "") {
  return s.replace(/[&<>"']/g, (c)=>({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[c] || c);
}

// ---------- EMAIL TEMPLATE ----------

function buildInviteEmailHtml({ 
  userName, 
  linkUrl, 
  logoUrl, 
  colorPrimary = "#111827", 
  colorAccent = "#2563EB" 
}) {
  const border = "#E5E7EB";
  const subtle = "#6B7280";

  return `<!doctype html>
<html>
<body style="background:#F9FAFB; margin:0; padding:30px 0;">
<div style="max-width:720px; margin:auto; background:#fff; border-radius:20px; border:1px solid ${border}; overflow:hidden;">
<div style="text-align:center; padding:20px;">
${logoUrl ? `<img src="${esc(logoUrl)}" alt="AeroIQ Logo" style="max-width:200px; height:auto; display:block; margin:0 auto;" />` : `<h2 style="color:${colorPrimary}; margin:0;">AeroIQ</h2>`}
</div>
<div style="padding:22px;">
<p style="font-size:15px; color:${colorPrimary}; margin:0 0 10px;">Hi ${userName ? esc(userName) : "there"},</p>
<p style="font-size:14px; color:${colorPrimary}; margin:0 0 14px; line-height:1.6;">You've been invited to join <strong>AeroIQ</strong>. Click the button below to set your password and activate your account.</p>
<div style="text-align:center; margin:22px 0;">
<a href="${esc(linkUrl)}" style="display:inline-block; background:${colorAccent}; color:#fff; text-decoration:none; padding:12px 18px; border-radius:10px; font-weight:600;">
Set Password
</a>
</div>
<p style="font-size:12px; color:${subtle}; margin:20px 0 0;">This invitation link will expire in 7 days.</p>
<p style="font-size:11px; color:${subtle}; margin:16px 0 0; padding-top:16px; border-top:1px solid ${border};">If the button doesn't work, copy and paste this link into your browser:</p>
<p style="font-size:11px; word-break:break-all; color:${subtle}; margin:8px 0 0;">
<a href="${esc(linkUrl)}" style="color:${colorAccent}; text-decoration:none;">${esc(linkUrl)}</a>
</p>
</div>
<div style="text-align:center; padding:15px; font-size:12px; color:${subtle};">Powered by <strong>AeroIQ</strong></div>
</div>
</body>
</html>`;
}

// ---------- MAIN HANDLER ----------

Deno.serve(async (req)=>{
  console.log("=== SEND_USER_INVITE START ===");

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders
    });
  }

  try {
    const payload = await req.json();
    console.log("Payload:", JSON.stringify(payload, null, 2));

    const { tenant_id, email, user_id, created_by, user_name } = payload || {};

    // Validate required fields
    if (!tenant_id || !email || !user_id) {
      throw new Error("Missing required fields: tenant_id, email, and user_id are required");
    }

    // Simple deduplication: check if invite was sent in last 30 seconds
    const { data: recentInvite } = await supabase
      .from("action_link_audit_log")
      .select("id, created_at")
      .eq("action", "user.invite")
      .eq("target_id", user_id)
      .gte("created_at", new Date(Date.now() - 30000).toISOString())
      .limit(1)
      .maybeSingle();

    if (recentInvite) {
      console.warn("⚠️ Duplicate invite detected (sent within last 30s)");
      return new Response(JSON.stringify({
        ok: false,
        error: "Duplicate invite – please wait."
      }), {
        status: 429,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    // --- FETCH TENANT ---
    const { data: tenant } = await supabase
      .from("tenant")
      .select("name")
      .eq("id", tenant_id)
      .single();

    // --- FETCH BRANDING ---
    const { data: brand } = await supabase
      .from("tenant_notifications")
      .select("from_email, logo_path, color_primary, color_accent, is_active")
      .eq("tenant_id", tenant_id)
      .eq("is_active", true)
      .maybeSingle();

    const fromEmail = brand?.from_email ?? DEFAULT_FROM;
    const logoUrl = brand?.logo_path 
      ? `${SUPABASE_URL}/storage/v1/object/public/branding/${brand.logo_path.replace(/^\/*/, "")}` 
      : null;

    // Generate password setup link using Supabase Auth Admin API
    // Use "invite" type for new user invitations
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "invite",
      email: email,
      options: {
        redirectTo: `${PUBLIC_APP_URL}/auth/set-password`
      }
    });

    if (linkError || !linkData) {
      console.error("Error generating invite link:", linkError);
      throw new Error(linkError?.message || "Failed to generate invite link");
    }

    // generateLink returns properties with action_link (full URL to Supabase auth endpoint)
    // Format: https://{project}.supabase.co/auth/v1/verify?token=...&type=invite&redirect_to=...
    let linkUrl = linkData.properties?.action_link;

    if (!linkUrl) {
      console.error("Failed to extract link URL from generateLink response:", linkData);
      throw new Error("Failed to generate invite link URL");
    }

    console.log("✅ Invite link generated:", linkUrl);

    // Build email HTML
    const html = buildInviteEmailHtml({
      userName: user_name || email.split("@")[0],
      linkUrl,
      logoUrl,
      colorPrimary: brand?.color_primary ?? "#111827",
      colorAccent: brand?.color_accent ?? "#2563EB"
    });

    // --- SEND EMAIL VIA RESEND ---
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [email],
        subject: "Welcome to AeroIQ - Set Your Password",
        html
      })
    });

    if (!emailRes.ok) {
      const text = await emailRes.text();
      console.error("RESEND ERROR:", emailRes.status, text);
      throw new Error(`Resend failed: ${text}`);
    }

    // --- AUDIT LOG ---
    const { error: auditErr } = await supabase
      .from("action_link_audit_log")
      .insert({
        tenant_id,
        actor_user_id: created_by ?? null,
        action: "user.invite",
        target_id: user_id,
        details: {
          email,
          user_name: user_name || null,
          provider: "resend",
          status: "ok"
        },
        ip: req.headers.get("x-forwarded-for") ?? "unknown",
        user_agent: req.headers.get("user-agent") ?? "unknown"
      });

    if (auditErr) {
      console.error("AUDIT ERROR:", auditErr);
    }

    console.log("✅ Invite email sent successfully");

    return new Response(JSON.stringify({
      ok: true,
      email_sent: true,
      link_url: linkUrl
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });

  } catch (err) {
    console.error("CRASH:", err.message);
    return new Response(JSON.stringify({
      ok: false,
      error: err.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});

