// app/api/action-links/consume/route.ts
import { NextResponse } from "next/server"
import { z } from "zod"
import { createActionLinkClient } from "@/lib/supabase/action-links"
import { sha256Base64url } from "@/lib/security/token"
import { ensureIdempotency } from "@/lib/idempotency"
import { rlPerIp } from "@/lib/redis"

// Helper function to normalize phone numbers for comparison
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "") // Remove all non-digits
}

const ConsumeSchema = z.object({
  token: z.string().min(20),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  // optional payload specific to action
  payload: z.record(z.any()).optional(),
}).refine((data) => data.email || data.phone, {
  message: "Either email or phone must be provided",
})

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown"
  const ua = req.headers.get("user-agent") ?? "unknown"

  const idemKey = req.headers.get("idempotency-key") || ""
  if (!idemKey) return NextResponse.json({ error: "Missing Idempotency-Key" }, { status: 400 })

  const body = await req.json()
  const parsed = ConsumeSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 })

  // rate limit
  const ipRes = await rlPerIp.limit(`consume:ip:${ip}`)
  if (!ipRes.success) return NextResponse.json({ error: "Too many requests" }, { status: 429 })

  // idempotency
  const firstTime = await ensureIdempotency(`consume:${idemKey}`, 60)
  if (!firstTime) return NextResponse.json({ ok: true, idempotent: true })

  const { token, email, phone, payload } = parsed.data
  const tokenHash = sha256Base64url(token)

  const supabase = await createActionLinkClient(true)

  const { data: link, error } = await supabase
    .from("action_link")
    .select("*")
    .eq("token_hash", tokenHash)
    .single()

  if (error) return NextResponse.json({ error: "Invalid link" }, { status: 400 })

  const now = new Date()
  if (link.status !== "active") return NextResponse.json({ error: "Link not active" }, { status: 400 })
  if (new Date(link.expires_at) < now) return NextResponse.json({ error: "Link expired" }, { status: 400 })
  if (link.use_count >= link.max_uses) return NextResponse.json({ error: "Max uses exceeded" }, { status: 400 })
  
  // Verify email or phone matches
  let verificationMatch = false
  if (email && link.email) {
    verificationMatch = link.email.toLowerCase() === email.toLowerCase()
  } else if (phone && link.phone) {
    verificationMatch = normalizePhone(link.phone) === normalizePhone(phone)
  } else if (phone && link.email) {
    // Fallback: check if phone matches email (for backward compatibility)
    verificationMatch = false
  } else if (email && link.phone) {
    // Fallback: check if email matches phone (for backward compatibility)
    verificationMatch = false
  }
  
  if (!verificationMatch) {
    const errorType = email ? "Email" : "Phone"
    return NextResponse.json({ error: `${errorType} mismatch` }, { status: 400 })
  }

  // 🔧 Perform the action for link.action_type
  // Example: if quote => mark quote as accepted; if invoice => record intent, etc.
  // For prototype, we’ll just mark consumed.

  const updates = {
    use_count: link.use_count + 1,
    status: link.use_count + 1 >= link.max_uses ? "consumed" : "active",
    consumed_at: link.use_count + 1 >= link.max_uses ? now.toISOString() : link.consumed_at,
  }

  const { error: upErr } = await supabase.from("action_link").update(updates).eq("id", link.id)
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  // audit
  await supabase.from("action_link_audit_log").insert({
    tenant_id: link.tenant_id,
    actor_user_id: null,
    action: "action_link.consume",
    target_id: link.id,
    details: { action_type: link.action_type, payload: payload ?? {} },
    ip,
    user_agent: ua,
  })

  return NextResponse.json({ ok: true, consumed: updates.status === "consumed" })
}
