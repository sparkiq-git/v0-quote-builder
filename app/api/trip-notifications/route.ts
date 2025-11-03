import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  try {
    console.log("🔔 trip_notifications API route called")
    const body = await req.json()
    console.log("🔔 Request body:", JSON.stringify(body, null, 2))
    const { tenant_id, email, action_type, metadata } = body

    // Validate required fields
    if (!tenant_id || !email || !action_type) {
      console.error("❌ Missing required fields:", { tenant_id: !!tenant_id, email: !!email, action_type: !!action_type })
      return NextResponse.json(
        { error: "Missing required fields: tenant_id, email, action_type" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const payload = {
      tenant_id,
      email,
      action_type,
      metadata: metadata || {},
    }
    console.log("🔔 Calling edge function 'trip_notifications' with payload:", JSON.stringify(payload, null, 2))

    const { data, error } = await supabase.functions.invoke("trip_notifications", {
      body: payload,
    })

    console.log("🔔 Edge function response:", { data, error })

    if (error) {
      console.error("❌ trip_notifications edge function error:", error)
      const errorMessage = error.message || error.toString() || "Edge Function returned an error"
      return NextResponse.json(
        { error: errorMessage, details: error },
        { status: 400 }
      )
    }

    if (data?.error) {
      console.error("❌ trip_notifications edge function returned error:", data.error)
      return NextResponse.json(
        { error: data.error, details: data },
        { status: 400 }
      )
    }

    console.log("✅ trip_notifications edge function called successfully:", data)
    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error("❌ Failed to call trip_notifications edge function:", error)
    console.error("❌ Error stack:", error?.stack)
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    )
  }
}
