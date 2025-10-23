import { NextResponse } from "next/server"
import { z } from "zod"
import { createActionLinkClient } from "@/lib/supabase/action-links"
import { sha256Base64url } from "@/lib/security/token"
import { rlPerIp, rlPerToken } from "@/lib/redis"
import { verifyTurnstile } from "@/lib/supabase/turnstile"

const VerifySchema = z.object({
  token: z.string().min(20),
  email: z.string().email(),
  captchaToken: z.string().min(10),
})

export async function POST(req: Request) {
  try {
    console.log("🔍 Action link verify route started")
    const ip = req.headers.get("x-forwarded-for") ?? "unknown"
    const ua = req.headers.get("user-agent") ?? "unknown"
    console.log("📊 Request details:", { ip, ua })

    // Parse & validate body
    let body: any
    try {
      body = await req.json()
      console.log("📦 Request body parsed successfully")
    } catch (err) {
      console.error("❌ JSON parse error:", err)
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 })
    }

    const parsed = VerifySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 })
    }

    const { token, email, captchaToken } = parsed.data
    console.log("✅ Request validation passed")

    // --- Rate limit by IP ---
    try {
      const ipRes = await rlPerIp.limit(`verify:ip:${ip}`)
      console.log("📊 IP rate limit result:", ipRes)
      if (!ipRes.success) {
        return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 })
      }
    } catch (err) {
      console.error("❌ IP rate limit error:", err)
      return NextResponse.json({ ok: false, error: "Rate limiting failed" }, { status: 500 })
    }

    // --- Verify CAPTCHA ---
    try {
      console.log("🔐 Verifying CAPTCHA...")
      await verifyTurnstile(captchaToken)
      console.log("✅ CAPTCHA verification passed")
    } catch (err: any) {
      console.error("❌ CAPTCHA verification failed:", err)
      return NextResponse.json(
        { ok: false, error: `Turnstile verification failed: ${err.message}` },
        { status: 400 }
      )
    }

    const tokenHash = sha256Base64url(token)
    console.log("🔑 Token hash created:", tokenHash.substring(0, 10) + "...")
    
    let supabase
    try {
      supabase = await createActionLinkClient(true)
      console.log("✅ Supabase client created")
    } catch (err) {
      console.error("❌ Supabase client creation failed:", err)
      return NextResponse.json({ ok: false, error: "Database connection failed" }, { status: 500 })
    }

    // --- Fetch link record ---
    let link
    try {
      const { data: linkData, error: linkError } = await supabase
        .from("action_link")
        .select("*")
        .eq("token_hash", tokenHash)
        .single()

      if (linkError || !linkData) {
        console.error("❌ Link fetch error:", linkError)
        return NextResponse.json({ ok: false, error: "Invalid or missing link" }, { status: 400 })
      }
      link = linkData
      console.log("✅ Link found:", link.id)
    } catch (err) {
      console.error("❌ Database query error:", err)
      return NextResponse.json({ ok: false, error: "Database query failed" }, { status: 500 })
    }

    // --- Rate limit per token ---
    const tokenRes = await rlPerToken.limit(`verify:token:${tokenHash}`)
    if (!tokenRes.success) {
      return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 })
    }

    // --- Validate link ---
    const now = new Date()
    if (link.status !== "active")
      return NextResponse.json({ ok: false, error: "Link not active" }, { status: 400 })
    if (new Date(link.expires_at) < now)
      return NextResponse.json({ ok: false, error: "Link expired" }, { status: 400 })
    if (link.use_count >= link.max_uses)
      return NextResponse.json({ ok: false, error: "Max uses exceeded" }, { status: 400 })
    if (link.email.toLowerCase() !== email.toLowerCase())
      return NextResponse.json({ ok: false, error: "Email mismatch" }, { status: 400 })

    // --- Update + audit ---
    try {
      await Promise.all([
        supabase
          .from("action_link")
          .update({ last_verified_at: now.toISOString() })
          .eq("id", link.id),
        supabase.from("action_link_audit_log").insert({
          tenant_id: link.tenant_id,
          actor_user_id: null,
          action: "action_link.verify",
          target_id: link.id,
          details: { email },
          ip,
          user_agent: ua,
        }),
      ])
    } catch (auditErr: any) {
      console.error("Audit insert failed:", auditErr)
      return NextResponse.json({ ok: false, error: "Failed to log verification" }, { status: 500 })
    }

    // --- Success ---
    return NextResponse.json({
      ok: true,
      data: {
        id: link.id,
        action_type: link.action_type,
        tenant_id: link.tenant_id,
        expires_at: link.expires_at,
        metadata: link.metadata ?? {},
      },
    })
  } catch (err: any) {
    console.error("Verify route crash:", err)
    return NextResponse.json(
      { ok: false, error: `Internal failure: ${err.message || String(err)}` },
      { status: 500 }
    )
  }
}
