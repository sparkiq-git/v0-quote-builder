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

    const tenantId = user.app_metadata?.tenant_id
    if (!tenantId) {
      return NextResponse.json({ error: "Missing tenant_id" }, { status: 400 })
    }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") || ""

    let query = supabase
      .from("itinerary")
      .select(`
        *,
        contact:contact_id (
          id,
          full_name,
          email,
          company
        ),
        quote:quote_id (
          id,
          title,
          contact_name,
          contact_email
        )
      `)
      .eq("tenant_id", tenantId)

    if (status && status !== "all") {
      query = query.eq("status", status)
    }

    if (search) {
      // Search in itinerary fields and contact name via join
      query = query.or(`title.ilike.%${search}%,trip_summary.ilike.%${search}%`)
    }

    const { data: rawData, error } = await query.order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching itineraries:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Filter by search in contact name if search query provided
    let data = rawData || []
    if (search && data.length > 0) {
      const searchLower = search.toLowerCase()
      data = data.filter((item: any) => {
        const contactName = item.contact?.full_name?.toLowerCase() || ""
        const title = item.title?.toLowerCase() || ""
        const tripSummary = item.trip_summary?.toLowerCase() || ""
        return (
          title.includes(searchLower) ||
          tripSummary.includes(searchLower) ||
          contactName.includes(searchLower)
        )
      })
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error("Itineraries API error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

