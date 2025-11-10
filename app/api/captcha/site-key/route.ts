import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  if (!siteKey) {
    return NextResponse.json({ error: "Turnstile site key not configured" }, { status: 500 })
  }

  return NextResponse.json({ siteKey })
}
