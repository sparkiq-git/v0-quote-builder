import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const active = searchParams.get("active") === "true"

    // RLS will handle tenant filtering at the database level
    let query = supabase
      .from("crew")
      .select(`
        id,
        user_id,
        display_name,
        first_name,
        last_name,
        phone_number,
        active
      `)

    if (active) {
      query = query.eq("active", true)
    }

    const { data, error } = await query.order("display_name", { ascending: true })

    if (error) {
      console.error("Error fetching crew:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (error: any) {
    console.error("Crew API error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
