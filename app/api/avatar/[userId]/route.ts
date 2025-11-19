import { type NextRequest, NextResponse } from "next/server"
import { getAvatarUrl } from "@/lib/actions/avatar-upload"

export async function GET(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const { userId } = params

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const result = await getAvatarUrl(userId)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 })
    }

    if (!result.url) {
      return NextResponse.json({ error: "No avatar found" }, { status: 404 })
    }

    // Safely check for format parameter
    let format: string | null = null
    try {
      if (request.nextUrl) {
        format = request.nextUrl.searchParams.get("format")
      } else if (request.url) {
        // Fallback: parse URL manually if nextUrl is not available
        const url = new URL(request.url)
        format = url.searchParams.get("format")
      }
    } catch (err) {
      // If URL parsing fails, just continue without format check
      console.warn("Could not parse request URL for format parameter:", err)
    }

    if (format === "json") {
      return NextResponse.json({ url: result.url })
    }

    return NextResponse.redirect(result.url)
  } catch (error) {
    console.error("Avatar API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
