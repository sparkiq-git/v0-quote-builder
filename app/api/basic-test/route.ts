import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({ 
    success: true, 
    message: "Basic API route is working",
    timestamp: new Date().toISOString()
  })
}
