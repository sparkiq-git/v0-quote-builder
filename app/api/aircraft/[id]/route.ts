// app/api/aircraft/[id]/route.ts
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getCurrentTenantId } from "@/lib/supabase/member-helpers"

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const tenantId = await getCurrentTenantId()
  if (!tenantId) return NextResponse.json({ error: "Missing tenant_id" }, { status: 400 })

  const { id } = params
  
  // Fetch aircraft and verify tenant_id matches
  const { data, error } = await supabase
    .from("aircraft")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single()
    
  if (error) {
    // If no rows found, could be wrong tenant or doesn't exist
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: "Aircraft not found" }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  if (!data) {
    return NextResponse.json({ error: "Aircraft not found" }, { status: 404 })
  }
  
  return NextResponse.json({ data })
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const tenantId = await getCurrentTenantId()
  if (!tenantId) return NextResponse.json({ error: "Missing tenant_id" }, { status: 400 })

  const { id } = params
  
  // Verify aircraft belongs to user's tenant before updating
  const { data: existing, error: checkError } = await supabase
    .from("aircraft")
    .select("tenant_id")
    .eq("id", id)
    .single()
    
  if (checkError || !existing) {
    return NextResponse.json({ error: "Aircraft not found" }, { status: 404 })
  }
  
  if (existing.tenant_id !== tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }
  
  // Prevent tenant_id from being changed via update
  const { tenant_id, ...updateData } = body
  
  const { data, error } = await supabase
    .from("aircraft")
    .update(updateData)
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .select("*")
    .single()
    
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const tenantId = await getCurrentTenantId()
  if (!tenantId) return NextResponse.json({ error: "Missing tenant_id" }, { status: 400 })

  const { id } = params
  
  // Verify aircraft belongs to user's tenant before deleting
  const { data: existing, error: checkError } = await supabase
    .from("aircraft")
    .select("tenant_id")
    .eq("id", id)
    .single()
    
  if (checkError || !existing) {
    return NextResponse.json({ error: "Aircraft not found" }, { status: 404 })
  }
  
  if (existing.tenant_id !== tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }
  
  const { error } = await supabase
    .from("aircraft")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId)
    
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
