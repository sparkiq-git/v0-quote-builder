import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { id } = params

    const tenantId = process.env.NEXT_PUBLIC_TENANT_ID

    const { data: passenger, error: fetchError } = await supabase
      .from("contact_passenger")
      .select(`
        *,
        contact:contact_id (tenant_id)
      `)
      .eq("id", id)
      .single()

    if (fetchError || !passenger) {
      return NextResponse.json({ error: "Passenger not found" }, { status: 404 })
    }

    if (passenger.contact?.tenant_id !== tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { data, error } = await supabase.from("contact_passenger").update(body).eq("id", id).select().single()

    if (error) {
      console.error("Error updating passenger:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Error in PUT /api/passengers/[id]:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { id } = params

    const tenantId = process.env.NEXT_PUBLIC_TENANT_ID

    const { data: passenger, error: fetchError } = await supabase
      .from("contact_passenger")
      .select(`
        *,
        contact:contact_id (tenant_id)
      `)
      .eq("id", id)
      .single()

    if (fetchError || !passenger) {
      return NextResponse.json({ error: "Passenger not found" }, { status: 404 })
    }

    if (passenger.contact?.tenant_id !== tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { error } = await supabase.from("contact_passenger").delete().eq("id", id)

    if (error) {
      console.error("Error deleting passenger:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error in DELETE /api/passengers/[id]:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
