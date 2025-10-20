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
        error: `Failed to list buckets: ${bucketError.message}`,
        details: bucketError
      }, { status: 500 })
    }
    
    // Try to get bucket policies
    const bucketInfo = buckets?.map(bucket => ({
      name: bucket.name,
      id: bucket.id,
      public: bucket.public,
      created_at: bucket.created_at,
      updated_at: bucket.updated_at
    })) || []
    
    return NextResponse.json({ 
      success: true, 
      buckets: bucketInfo,
      message: "Storage buckets retrieved successfully"
    })
  } catch (err: any) {
    console.error("Storage test error:", err)
    return NextResponse.json({ 
      success: false, 
      error: err.message,
      details: err
    }, { status: 500 })
  }
}
