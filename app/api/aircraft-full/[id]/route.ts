// app/api/aircraft-full/[id]/route.ts
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const tenantId = user.app_metadata?.tenant_id
  const { data, error } = await supabase
    .from("aircraft_full_view")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("aircraft_id", params.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
