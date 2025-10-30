import { NextResponse } from "next/server"
import { getAvailableItems } from "@/lib/supabase/queries/items"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const tenantId = searchParams.get("tenantId")

  try {
    const items = await getAvailableItems(tenantId)
    return NextResponse.json(items)
  } catch (err: any) {
    console.error("❌ /api/items error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
