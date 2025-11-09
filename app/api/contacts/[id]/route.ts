import { type NextRequest, NextResponse } from "next/server"
import { getServerUser } from "@/lib/supabase/server"
import { createClient } from "@/lib/supabase/server"

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const tenantId = user.app_metadata?.tenant_id
    if (!tenantId) {
      return NextResponse.json({ error: "Missing tenant ID" }, { status: 400 })
    }

    const { id } = await params
    const body = await request.json()
    const { full_name, email, phone, company, notes, status } = body

    if (!full_name || !email) {
      return NextResponse.json({ error: "Full name and email are required" }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from("contact")
      .update({
        full_name,
        email,
        phone: phone || null,
        company: company || null,
        notes: notes || null,
        status: status || "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .select()
      .single()

    if (error) {
      console.error("Error updating contact:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error("Error in PUT /api/contacts/:id:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const tenantId = user.app_metadata?.tenant_id
    if (!tenantId) {
      return NextResponse.json({ error: "Missing tenant ID" }, { status: 400 })
    }

    const { id } = await params
    const supabase = await createClient()
    const { error } = await supabase.from("contact").delete().eq("id", id).eq("tenant_id", tenantId)

    if (error) {
      console.error("Error deleting contact:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error in DELETE /api/contacts/:id:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
