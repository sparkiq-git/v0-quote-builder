import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get("tenantId")

    if (!tenantId) {
      return NextResponse.json({ error: "Missing tenantId" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("tenant_notifications")
      .select("logo_path")
      .eq("tenant_id", tenantId)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const path = data?.logo_path || null
    if (!path) {
      return NextResponse.json({ logoUrl: null })
    }

    // If already a full URL, return as-is
    if (path.startsWith("http://") || path.startsWith("https://")) {
      return NextResponse.json({ logoUrl: path })
    }

    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!baseUrl) {
      return NextResponse.json({ logoUrl: null })
    }

    // Assume path is in form: "<bucket>/<inner/path/to/file.ext>"
    const publicUrl = `${baseUrl}/storage/v1/object/public/branding/${path.replace(/^\/*/, "")}`
    return NextResponse.json({ logoUrl: publicUrl })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 })
  }
}
