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

    // Redirect to the signed URL
    return NextResponse.redirect(result.url)
  } catch (error) {
    console.error("Avatar API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
