import { NextResponse } from "next/server"
import { z } from "zod"
import { createActionLinkClient } from "@/lib/supabase/action-links"
import { sha256Base64url } from "@/lib/security/token"
import { rlPerIp, rlPerToken } from "@/lib/redis"
import { verifyTurnstile } from "@/lib/supabase/turnstile"
import { getQuoteData, invalidateQuoteCache } from "@/lib/cache/quote-cache"

// Helper function to normalize phone numbers for comparison
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "") // Remove all non-digits
}

const VerifySchema = z.object({
  token: z.string().min(20),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  captchaToken: z.string().min(10),
}).refine((data) => data.email || data.phone, {
  message: "Either email or phone must be provided",
})

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "unknown"
    const ua = req.headers.get("user-agent") ?? "unknown"

    // Parse & validate body
    let body: any
    try {
      body = await req.json()
    } catch (err) {
      console.error("❌ JSON parse error:", err)
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 })
    }

    const parsed = VerifySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 })
    }

    const { token, email, phone, captchaToken } = parsed.data

    // --- Rate limit by IP ---
    try {
      const ipRes = await rlPerIp.limit(`verify:ip:${ip}`)
      if (!ipRes.success) {
        return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 })
      }
    } catch (err) {
      console.error("❌ IP rate limit error:", err)
      return NextResponse.json({ ok: false, error: "Rate limiting failed" }, { status: 500 })
    }

    // --- Verify CAPTCHA ---
    try {
      await verifyTurnstile(captchaToken)
    } catch (err: any) {
      console.error("❌ CAPTCHA verification failed:", err)
      return NextResponse.json(
        { ok: false, error: `Turnstile verification failed: ${err.message}` },
        { status: 400 }
      )
    }

    const tokenHash = await sha256Base64url(token)
    
    // --- Create Supabase client ---
    let supabase
    try {
      supabase = await createActionLinkClient(true)
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
      return NextResponse.json({ ok: false, error: `${errorType} mismatch` }, { status: 400 })
    }

    // --- Update last verified timestamp (no audit log - too noisy) ---
    try {
      await supabase
        .from("action_link")
        .update({ last_verified_at: now.toISOString() })
        .eq("id", link.id)
    } catch (updateErr: any) {
      console.error("Update failed:", updateErr)
      // Non-critical, continue
    }

    // --- Update quote status and open tracking (with caching) ---
    if (link.metadata?.quote_id) {
      try {
        // Get quote data from cache or database
        const quoteData = await getQuoteData(
          link.metadata.quote_id,
          async () => {
            const { data } = await supabase
              .from("quote")
              .select("status, first_opened_at, open_count, last_opened_at")
              .eq("id", link.metadata.quote_id)
              .single()
            return data
          }
        )

        if (quoteData) {
          const isFirstOpen = !quoteData.first_opened_at
          const quoteUpdates: any = {
            status: "opened",
            last_opened_at: now.toISOString(),
            open_count: (quoteData.open_count || 0) + 1,
          }

          // Only set first_opened_at on the very first open
          if (isFirstOpen) {
            quoteUpdates.first_opened_at = now.toISOString()
          }

          // Update database
          await supabase
            .from("quote")
            .update(quoteUpdates)
            .eq("id", link.metadata.quote_id)

          // Invalidate cache so next read is fresh
          await invalidateQuoteCache(link.metadata.quote_id)
        }
      } catch (quoteErr: any) {
        console.error("Quote update failed:", quoteErr)
        // Non-critical, continue even if quote update fails
      }
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
