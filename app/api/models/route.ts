import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { z } from "zod"

/** 🔹 Define minimal schema validation (keeps API safe) */
const ModelSchema = z.object({
  manufacturer_id: z.string().nullable().optional(),
  name: z.string().min(2, "Name is required"),
  icao_type_designator: z.string().nullable().optional(),
  size_code: z.string().nullable().optional(),
})

/** 🔹 GET: List public aircraft models with tenant-specific images */
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const tenantId = user.app_metadata?.tenant_id
    if (!tenantId)
      return NextResponse.json({ success: false, error: "Missing tenant ID" }, { status: 400 })

    // First get all public aircraft models
    const { data: models, error: modelsError } = await supabase
      .from("aircraft_model")
      .select(`
        id, manufacturer_id, name, icao_type_designator, size_code, created_at,
        range_nm, mtow_kg, cruising_speed, capacity_pax, notes, created_by,
        aircraft_manufacturer!manufacturer_id (
          id,
          name
        )
      `)
      .order("name")

    if (modelsError) throw modelsError

    // Then get tenant-specific images for these models
    const { data: images, error: imagesError } = await supabase
      .from("aircraft_model_image")
      .select("id, aircraft_model_id, public_url, is_primary, display_order")
      .eq("tenant_id", tenantId)

    if (imagesError) throw imagesError

    // Combine the data
    const data = models?.map(model => ({
      ...model,
      aircraft_model_image: images?.filter(img => img.aircraft_model_id === model.id) || []
    })) || []

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("[API] GET /models error:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

/** 🔹 POST: Create a new public model */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = ModelSchema.parse(body)

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const { data, error } = await supabase
      .from("aircraft_model")
      .insert({
        manufacturer_id: parsed.manufacturer_id,
        name: parsed.name,
        icao_type_designator: parsed.icao_type_designator,
        size_code: parsed.size_code,
        created_by: user.id,
      })
      .select("*")
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("[API] POST /models error:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

/** 🔹 PATCH: Update a public model by ID (only by creator) */
export async function PATCH(req: Request) {
  try {
    const { id, ...updates } = await req.json()
    if (!id) return NextResponse.json({ success: false, error: "Missing model ID" }, { status: 400 })

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const { data, error } = await supabase
      .from("aircraft_model")
      .update(updates)
      .eq("id", id)
      .eq("created_by", user.id)
      .select("*")
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("[API] PATCH /models error:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

/** 🔹 DELETE: Delete a public model by ID (only by creator) */
export async function DELETE(req: Request) {
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ success: false, error: "Missing model ID" }, { status: 400 })

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const { error } = await supabase
      .from("aircraft_model")
      .delete()
      .eq("id", id)
      .eq("created_by", user.id)

    if (error) throw error
    return NextResponse.json({ success: true, message: "Model deleted" })
  } catch (err: any) {
    console.error("[API] DELETE /models error:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
