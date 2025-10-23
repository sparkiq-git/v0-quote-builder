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

/** 🔹 GET: List models for the authenticated tenant */
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

    const { data, error } = await supabase
      .from("aircraft_model")
      .select(`
        id, manufacturer_id, name, icao_type_designator, size_code, tenant_id, created_at,
        aircraft_manufacturer!manufacturer_id (
          id,
          name
        ),
        aircraft_model_image (
          id,
          public_url,
          is_primary,
          display_order
        )
      `)
      .eq("tenant_id", tenantId)
      .order("name")

    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("[API] GET /models error:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

/** 🔹 POST: Create a new model */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = ModelSchema.parse(body)

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const tenantId = user.app_metadata?.tenant_id
    if (!tenantId)
      return NextResponse.json({ success: false, error: "Missing tenant ID" }, { status: 400 })

    const { data, error } = await supabase
      .from("aircraft_model")
      .insert({
        tenant_id: tenantId,
        manufacturer_id: parsed.manufacturer_id,
        name: parsed.name,
        icao_type_designator: parsed.icao_type_designator,
        size_code: parsed.size_code,
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

/** 🔹 PATCH: Update a model by ID */
export async function PATCH(req: Request) {
  try {
    const { id, ...updates } = await req.json()
    if (!id) return NextResponse.json({ success: false, error: "Missing model ID" }, { status: 400 })

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const tenantId = user.app_metadata?.tenant_id
    if (!tenantId)
      return NextResponse.json({ success: false, error: "Missing tenant ID" }, { status: 400 })

    const { data, error } = await supabase
      .from("aircraft_model")
      .update(updates)
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .select("*")
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("[API] PATCH /models error:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

/** 🔹 DELETE: Delete a model by ID */
export async function DELETE(req: Request) {
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ success: false, error: "Missing model ID" }, { status: 400 })

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const tenantId = user.app_metadata?.tenant_id
    if (!tenantId)
      return NextResponse.json({ success: false, error: "Missing tenant ID" }, { status: 400 })

    const { error } = await supabase
      .from("aircraft_model")
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenantId)

    if (error) throw error
    return NextResponse.json({ success: true, message: "Model deleted" })
  } catch (err: any) {
    console.error("[API] DELETE /models error:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
