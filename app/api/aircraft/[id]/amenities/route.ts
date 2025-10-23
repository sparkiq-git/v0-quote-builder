import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { z } from "zod"

const AmenitySelectionSchema = z.object({
  amenityIds: z.array(z.string().uuid())
})

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const aircraftId = params.id
    if (!aircraftId) {
      return NextResponse.json({ success: false, error: "Aircraft ID is required" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("aircraft_amenity")
      .select(`
        id,
        tenant_id,
        aircraft_id,
        amenity_id,
        created_at,
        amenity (
          id,
          code,
          name,
          description,
          category,
          meta,
          created_at,
          icon_type,
          icon_ref
        )
      `)
      .eq("aircraft_id", aircraftId)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching aircraft amenities:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("[API] GET /aircraft/[id]/amenities error:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const aircraftId = params.id
    if (!aircraftId) {
      return NextResponse.json({ success: false, error: "Aircraft ID is required" }, { status: 400 })
    }

    const body = await req.json()
    const { amenityIds } = AmenitySelectionSchema.parse(body)

    // Get tenant ID from user metadata
    const tenantId = user.app_metadata?.tenant_id
    if (!tenantId) {
      return NextResponse.json({ success: false, error: "Tenant ID not found" }, { status: 400 })
    }

    // First, remove all existing amenities for this aircraft
    const { error: deleteError } = await supabase
      .from("aircraft_amenity")
      .delete()
      .eq("aircraft_id", aircraftId)
      .eq("tenant_id", tenantId)

    if (deleteError) {
      console.error("Error deleting existing amenities:", deleteError)
      return NextResponse.json({ success: false, error: deleteError.message }, { status: 500 })
    }

    // Then, insert new amenities
    if (amenityIds.length > 0) {
      const amenitiesToInsert = amenityIds.map(amenityId => ({
        aircraft_id: aircraftId,
        amenity_id: amenityId,
        tenant_id: tenantId
      }))

      const { error: insertError } = await supabase
        .from("aircraft_amenity")
        .insert(amenitiesToInsert)

      if (insertError) {
        console.error("Error inserting amenities:", insertError)
        return NextResponse.json({ success: false, error: insertError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, message: "Amenities updated successfully" })
  } catch (err: any) {
    console.error("[API] POST /aircraft/[id]/amenities error:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
