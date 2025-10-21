// app/api/aircraft-full/route.ts
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const tenantId = user.app_metadata?.tenant_id
  if (!tenantId) return NextResponse.json({ error: "Missing tenant_id" }, { status: 400 })

  // Pull the enriched view so we can show images, amenities, etc.
  const { data, error } = await supabase
    .from("aircraft_full_view")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("model_name", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
