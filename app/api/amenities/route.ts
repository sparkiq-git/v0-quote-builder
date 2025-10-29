import { NextResponse } from "next/server"
import { createStaticClient } from "@/lib/supabase/static"

export async function GET() {
  try {
    // Use static client for public data that doesn't require authentication
    const supabase = createStaticClient()
    
    const { data, error } = await supabase
      .from("amenity")
      .select("*")
      .order("category", { ascending: true })
      .order("name", { ascending: true })

    if (error) {
      console.error("Error fetching amenities:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("[API] GET /amenities error:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
