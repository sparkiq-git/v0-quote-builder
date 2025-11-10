import { NextResponse } from "next/server"

export async function GET() {
  const siteKey = process.env.NEXT_PUBLIC_CF_TURNSTILE_SITE

  if (!siteKey) {
    return NextResponse.json({ error: "Turnstile site key not configured" }, { status: 500 })
  }

  return NextResponse.json({ siteKey })
}
