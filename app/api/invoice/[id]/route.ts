// app/api/invoice/[id]/route.ts
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Force dynamic rendering for this route since it requires authentication
export const dynamic = 'force-dynamic'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  try {
    const { id } = params
    const { data, error } = await supabase
      .from("invoice")
      .select("*, quote:quote_id(title, contact_name, contact_email)")
      .eq("id", id)
      .single()

    if (error) throw error
    return NextResponse.json({ invoice: data })
  } catch (err: any) {
    console.error("❌ Invoice fetch error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  
  try {
    const { id } = params
    const updates = await req.json()
    const { error } = await supabase
      .from("invoice")
      .update(updates)
      .eq("id", id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  
  try {
    const { id } = params
    const { error } = await supabase.from("invoice").delete().eq("id", id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
