import { type NextRequest, NextResponse } from "next/server"
import { getServerUser } from "@/lib/supabase/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const { user } = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const tenantId = user.app_metadata?.tenant_id
    if (!tenantId) {
      return NextResponse.json({ error: "Missing tenant ID" }, { status: 400 })
    }

    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search")
    const status = searchParams.get("status")

    let query = supabase
      .from("contact") // Changed table name from "contacts" to "contact" (singular)
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`)
    }

    if (status && status !== "all") {
      query = query.eq("status", status)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching contacts:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error("Error in GET /api/contacts:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const tenantId = user.app_metadata?.tenant_id
    if (!tenantId) {
      return NextResponse.json({ error: "Missing tenant ID" }, { status: 400 })
    }

    const body = await request.json()
    const { full_name, email, phone, company, notes, status } = body

    if (!full_name || !email) {
      return NextResponse.json({ error: "Full name and email are required" }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from("contact") // Changed table name from "contacts" to "contact" (singular)
      .insert({
        tenant_id: tenantId,
        full_name,
        email,
        phone: phone || null,
        company: company || null,
        notes: notes || null,
        status: status || "active",
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating contact:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error("Error in POST /api/contacts:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
