import { type NextRequest, NextResponse } from "next/server"
import { getContactAvatarUrl } from "@/lib/actions/contact-avatar"

export async function GET(request: NextRequest, { params }: { params: { contactId: string } }) {
  try {
    const { contactId } = params

    if (!contactId) {
      return NextResponse.json({ error: "Contact ID is required" }, { status: 400 })
    }

    const result = await getContactAvatarUrl(contactId)

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
    console.error("Contact avatar API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
