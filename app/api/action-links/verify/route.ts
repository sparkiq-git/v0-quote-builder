import { NextResponse } from "next/server"
import { z } from "zod"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { sha256Base64url } from "@/lib/security/token"
import { rlPerIp, rlPerToken } from "@/lib/redis"
import { verifyTurnstile } from "@/lib/turnstile"

const VerifySchema = z.object({
  token: z.string().min(20),
  email: z.string().email(),
  captchaToken: z.string().min(10),
})

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "unknown"
    const ua = req.headers.get("user-agent") ?? "unknown"

    // Parse & validate body
    let body: any
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 })
    }

    const parsed = VerifySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 })
    }

    const { token, email, captchaToken } = parsed.data

    // --- Rate limit by IP ---
    const ipRes = await rlPerIp.limit(`verify:ip:${ip}`)
    if (!ipRes.success) {
      return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 })
    }

    // --- Verify CAPTCHA ---
    try {
      await verifyTurnstile(captchaToken)
    } catch (err: any) {
      return NextResponse.json(
        { ok: false, error: `Turnstile verification failed: ${err.message}` },
        { status: 400 }
      )
    }

    const tokenHash = sha256Base64url(token)
    const supabase = createSupabaseServerClient(true)

    // --- Fetch link record ---
    const { data: link, error: linkError } = await supabase
      .from("action_link")
      .select("*")
      .eq("token_hash", tokenHash)
      .single()

    if (linkError || !link) {
      console.error("Link fetch error:", linkError)
      return NextResponse.json({ ok: false, error: "Invalid or missing link" }, { status: 400 })
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
        supabase.from("audit_log").insert({
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
