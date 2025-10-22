// app/api/action-links/verify/route.ts
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
  const ip = req.headers.get("x-forwarded-for") ?? "unknown"
  const ua = req.headers.get("user-agent") ?? "unknown"
  const body = await req.json()
  const parsed = VerifySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 })

  const { token, email, captchaToken } = parsed.data

  // rate limit
  const ipRes = await rlPerIp.limit(`verify:ip:${ip}`)
  if (!ipRes.success) return NextResponse.json({ error: "Too many requests" }, { status: 429 })

  await verifyTurnstile(captchaToken)

  const tokenHash = sha256Base64url(token)

  const supabase = createSupabaseServerClient(true)
  const { data: link, error } = await supabase
    .from("action_link")
    .select("*")
    .eq("token_hash", tokenHash)
    .single()

  if (error) return NextResponse.json({ ok: false, error: "Invalid link" }, { status: 400 })

  const tokenRes = await rlPerToken.limit(`verify:token:${tokenHash}`)
  if (!tokenRes.success) return NextResponse.json({ error: "Too many requests" }, { status: 429 })

  const now = new Date()
  if (link.status !== "active") return NextResponse.json({ error: "Link not active" }, { status: 400 })
  if (new Date(link.expires_at) < now) return NextResponse.json({ error: "Link expired" }, { status: 400 })
  if (link.use_count >= link.max_uses) return NextResponse.json({ error: "Max uses exceeded" }, { status: 400 })
  if (link.email.toLowerCase() !== email.toLowerCase())
    return NextResponse.json({ error: "Email mismatch" }, { status: 400 })

  // update last verified + audit
  await Promise.all([
    supabase.from("action_link").update({ last_verified_at: now.toISOString() }).eq("id", link.id),
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

  // return redacted data to render the page
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
}
