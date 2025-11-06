import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = params

    // Fetch itinerary crew with crew member details
    const { data, error } = await supabase
      .from("itinerary_crew")
      .select(`
        *,
        crew:crew_id (
          id,
          user_id,
          display_name,
          first_name,
          last_name,
          phone_number,
          active
        )
      `)
      .eq("itinerary_id", id)
      .order("role", { ascending: true })
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching itinerary crew:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      data: {
        crew: data || [],
      },
    })
  } catch (error: any) {
    console.error("Get itinerary crew error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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

    const { id } = params
    const body = await request.json()
    const { crew } = body

    if (!Array.isArray(crew)) {
      return NextResponse.json({ error: "Crew must be an array" }, { status: 400 })
    }

    // Validate roles
    const validRoles = ["PIC", "SIC", "Cabin Attendance"]
    const invalidRoles = crew.filter((c: { role: string }) => !validRoles.includes(c.role))
    if (invalidRoles.length > 0) {
      return NextResponse.json(
        { error: `Invalid roles: ${invalidRoles.map((c: { role: string }) => c.role).join(", ")}` },
        { status: 400 }
      )
    }

    // Delete existing crew for this itinerary
    const { error: deleteError } = await supabase
      .from("itinerary_crew")
      .delete()
      .eq("itinerary_id", id)

    if (deleteError) {
      console.error("Error deleting existing crew:", deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    // Insert new crew
    if (crew.length > 0) {
      const crewInserts = crew.map((c: { crew_id: string; role: string }) => ({
        itinerary_id: id,
        crew_id: c.crew_id,
        role: c.role,
        tenant_id: tenantId,
      }))

      const { error: insertError } = await supabase
        .from("itinerary_crew")
        .insert(crewInserts)

      if (insertError) {
        console.error("Error inserting crew:", insertError)
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Update itinerary crew error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

