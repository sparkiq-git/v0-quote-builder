// app/api/aircraft/route.ts
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getCurrentTenantId } from "@/lib/supabase/member-helpers"

// Force dynamic rendering for this route since it requires authentication
export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const tenantId = await getCurrentTenantId()
  if (!tenantId) return NextResponse.json({ error: "Missing tenant_id" }, { status: 400 })

  const { data, error } = await supabase
    .from("aircraft")
    .select(`
      id, tail_number, model_id, manufacturer_id, operator_id,
      type_rating_id, status, home_base, capacity_pax, year_of_manufacture,
      serial_number, range_nm, mtow_kg, notes, year_of_refurbish,
      cruising_speed, created_at, updated_at,
      operator!operator_id (
        id,
        name,
        icao_code,
        iata_code
      ),
      aircraft_model!model_id (
        id,
        name,
        manufacturer_id,
        size_code,
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
      ),
      aircraft_image (
        id,
        public_url,
        is_primary,
        display_order
      )
    `)
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: Request) {
  const body = await req.json()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const tenantId = await getCurrentTenantId()
  if (!tenantId) return NextResponse.json({ error: "Missing tenant_id" }, { status: 400 })

  const { tail_number, type_rating_id, model_id, manufacturer_id, operator_id, home_base, capacity_pax } = body

  const { data, error } = await supabase
    .from("aircraft")
    .insert({
      tenant_id: tenantId,
      tail_number,
      type_rating_id,
      model_id: model_id ?? null,
      manufacturer_id: manufacturer_id ?? null,
      operator_id: operator_id ?? null,
      home_base: home_base ?? null,
      capacity_pax: capacity_pax ?? null,
    })
    .select("*")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
