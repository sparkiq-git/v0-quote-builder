import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()
    
    // List all available buckets
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
    
    if (bucketError) {
      return NextResponse.json({ 
        success: false, 
        error: `Failed to list buckets: ${bucketError.message}` 
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      buckets: buckets?.map(b => ({
        name: b.name,
        id: b.id,
        public: b.public,
        created_at: b.created_at
      }))
    })
  } catch (err: any) {
    return NextResponse.json({ 
      success: false, 
      error: err.message 
    }, { status: 500 })
  }
}
