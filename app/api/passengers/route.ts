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
    const contactId = searchParams.get("contact_id") || ""

    let query = supabase
      .from("contact_passenger")
      .select(`
        *,
        contact:contact_id (
          id,
          full_name,
          email,
          company
        )
      `)

    if (contactId) {
      query = query.eq("contact_id", contactId)
    }

    if (status && status !== "all") {
      query = query.eq("status", status)
    }

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`)
    }

    const { data, error } = await query.order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching passengers:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error("Passengers API error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { contact_id, full_name, email, phone, company, notes, status = "active" } = body

    if (!contact_id || !full_name || !email) {
      return NextResponse.json(
        { error: "Contact ID, full name, and email are required" },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from("contact_passenger")
      .insert({
        contact_id,
        full_name,
        email,
        phone: phone || null,
        company: company || null,
        notes: notes || null,
        status,
        created_by: user.id,
      })
      .select(`
        *,
        contact:contact_id (
          id,
          full_name,
          email,
          company
        )
      `)
      .single()

    if (error) {
      console.error("Error creating passenger:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error: any) {
    console.error("Create passenger error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
