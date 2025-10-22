// app/api/action-links/route.ts
import { NextResponse } from "next/server"
import { z } from "zod"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { generateOpaqueToken, sha256Base64url } from "@/lib/security/token"

const CreateSchema = z.object({
  tenant_id: z.string().uuid(),
  action_type: z.enum(["quote", "invoice", "other"]),
  email: z.string().email(),
  metadata: z.record(z.any()).optional(),
  expires_in_minutes: z.number().int().min(5).max(60 * 24 * 30).default(60), // 1h default
  max_uses: z.number().int().min(1).max(100).default(1),
})

export async function POST(req: Request) {
  const body = await req.json()
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 })

  const supabase = createSupabaseServerClient(true) // service role to insert
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { tenant_id, action_type, email, metadata, expires_in_minutes, max_uses } = parsed.data

  const rawToken = generateOpaqueToken()
  const tokenHash = sha256Base64url(rawToken)
  const expires_at = new Date(Date.now() + expires_in_minutes * 60_000).toISOString()

  const { data, error } = await supabase
    .from("action_link")
    .insert({
      tenant_id,
      created_by: user.id,
      email,
      action_type,
      token_hash: tokenHash,
      metadata: metadata ?? {},
      expires_at,
      max_uses,
    })
    .select("id")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // audit
  await supabase.from("audit_log").insert({
    tenant_id,
    actor_user_id: user.id,
    action: "action_link.create",
    target_id: data.id,
    details: { action_type, email, max_uses, expires_at },
  })

  // return the link (you can email it instead)
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin
  const link = `${origin}/action/${rawToken}`

  return NextResponse.json({ id: data.id, link })
}
