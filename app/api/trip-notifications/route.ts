import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { tenant_id, email, action_type, metadata } = body

    // Validate required fields
    if (!tenant_id || !email || !action_type) {
      return NextResponse.json(
        { error: "Missing required fields: tenant_id, email, action_type" },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Missing Supabase environment variables")
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      )
    }

    const fnUrl = `${supabaseUrl}/functions/v1/trip_notifications`

    const response = await fetch(fnUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        tenant_id,
        email,
        action_type,
        metadata: metadata || {},
      }),
    })

    const json = await response.json().catch(() => ({}))

    if (!response.ok) {
      console.error("trip_notifications edge function error:", {
        status: response.status,
        statusText: response.statusText,
        body: json,
      })
      return NextResponse.json(
        { error: json.error || "Failed to trigger notifications", details: json },
        { status: response.status || 500 }
      )
    }

    return NextResponse.json({ success: true, data: json })
  } catch (error: any) {
    console.error("Failed to call trip_notifications edge function:", error)
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    )
  }
}
